import { Request, Response } from "express";
import googleSheets from "../services/googleSheets";
import qrGenerator from "../services/qrGenerator";
import emailService from "../services/emailService";
import invoiceGenerator from "../services/invoiceGenerator";
import shippingLabelGenerator from "../services/shippingLabelGenerator";
import payuPayment from "../services/payuPayment";
import { config } from "../config";
import { AuthRequest } from "../middleware/auth";
import {
  buildPricedCart,
  cartItemsToOrderProducts,
  CartValidationError,
} from "../services/cartPricingService";
import {
  OrderStatus,
  PaymentStatus,
  PaymentMode,
  Order,
  OrderType,
} from "../types";

function parseOrderDateValue(value: unknown): number {
  if (value == null) return Number.NaN;

  if (value instanceof Date) {
    const ts = value.getTime();
    return Number.isFinite(ts) ? ts : Number.NaN;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return Number.NaN;
    // Support both seconds and milliseconds timestamps.
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  const raw = String(value).trim();
  if (!raw) return Number.NaN;

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }
  }

  const isoTs = Date.parse(raw);
  if (!Number.isNaN(isoTs)) return isoTs;

  // Fallback parser for values like 16/4/2026 or 16-04-2026 13:45:10
  const match = raw.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!match) return Number.NaN;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  let year = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4] || "0", 10);
  const minute = Number.parseInt(match[5] || "0", 10);
  const second = Number.parseInt(match[6] || "0", 10);

  if (year < 100) year += 2000;
  const parsed = new Date(year, month - 1, day, hour, minute, second).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function getOrderTimestamp(order: Partial<Order> & { updatedAt?: string }) {
  const createdTs = parseOrderDateValue(order.createdAt);
  if (!Number.isNaN(createdTs) && createdTs > 0) return createdTs;

  const updatedTs = parseOrderDateValue(order.updatedAt);
  if (!Number.isNaN(updatedTs) && updatedTs > 0) return updatedTs;

  return 0;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function parseProductsInput(rawProducts: unknown): any[] {
  if (Array.isArray(rawProducts)) return rawProducts;
  if (typeof rawProducts === "string") {
    try {
      const parsed = JSON.parse(rawProducts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new CartValidationError("Invalid products payload");
    }
  }
  return [];
}

function toPricingInputItems(items: any[]): any[] {
  return items.map((item) => ({
    productId: item?.productId || item?.id,
    slug: item?.slug,
    weight: item?.weight || item?.variant || item?.variantWeight,
    quantity: item?.quantity,
  }));
}

function resolvePaymentMode(rawMode: unknown): PaymentMode {
  const mode = String(rawMode || "").trim().toUpperCase();
  if (mode === PaymentMode.PAYU) return PaymentMode.PAYU;
  if (mode === PaymentMode.COD) return PaymentMode.COD;
  if (mode === PaymentMode.PREPAID) return PaymentMode.PREPAID;
  return PaymentMode.UPI_QR;
}

async function buildOrderPaymentPayload(order: Order) {
  let qrCode: string | null = null;
  let payuData: any = null;
  let emailSent: boolean | null = null;
  let emailWarning: string | null = null;

  if (order.paymentMode === PaymentMode.PAYU || order.paymentMode === PaymentMode.PREPAID) {
    payuData = {
      paymentParams: payuPayment.generatePaymentParams({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        productInfo: `Order ${order.orderNumber}`,
      }),
      paymentUrl: payuPayment.getPayUFormUrl(),
    };
  } else if (order.paymentMode === PaymentMode.UPI_QR && order.totalAmount > 0) {
    qrCode = await qrGenerator.generateQRCodeBase64({
      amount: order.totalAmount,
      orderNumber: order.orderNumber,
    });

    try {
      await emailService.sendOrderConfirmation(order, qrCode);
      emailSent = true;
    } catch (mailError) {
      emailSent = false;
      emailWarning =
        "Order placed successfully, but confirmation email could not be sent right now.";
      console.error("Email error:", mailError);
    }
  } else if (order.totalAmount <= 0) {
    await googleSheets.updateOrder(order.id, {
      paymentStatus: PaymentStatus.VERIFIED,
      orderStatus: OrderStatus.PAID,
      paymentReceivedAt: new Date().toISOString(),
    });
  }

  return { qrCode, payuData, emailSent, emailWarning };
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      addressLine1,
      addressLine2,
      address,
      city,
      state,
      pincode,
      country,
      products,
      paymentMode,
      customerNotes,
      couponCode,
    } = req.body;

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !(addressLine1 || address) ||
      !city ||
      !state ||
      !pincode
    ) {
      res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
      return;
    }

    const parsedProducts = parseProductsInput(products);
    const priced = await buildPricedCart(
      toPricingInputItems(parsedProducts),
      normalizeText(couponCode),
    );

    const nowIso = new Date().toISOString();
    const normalizedAddressLine1 = normalizeText(addressLine1 || address);
    const normalizedAddressLine2 = normalizeText(addressLine2);
    const normalizedPaymentMode = resolvePaymentMode(paymentMode);

    const order = await googleSheets.createOrder({
      customerName: normalizeText(customerName),
      customerEmail: normalizeText(customerEmail),
      customerPhone: normalizeText(customerPhone),
      addressLine1: normalizedAddressLine1,
      addressLine2: normalizedAddressLine2,
      city: normalizeText(city),
      state: normalizeText(state),
      pincode: normalizeText(pincode),
      country: normalizeText(country) || "India",
      products: cartItemsToOrderProducts(priced.items),
      subtotal: priced.subtotal,
      shippingAmount: priced.shippingAmount,
      taxAmount: 0,
      couponCode: priced.couponCode,
      couponDiscount: priced.discountAmount,
      discountAmount: priced.discountAmount,
      discountType: priced.discountType,
      totalAmount: priced.totalAmount,
      paymentMode: normalizedPaymentMode,
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      orderType: OrderType.REGULAR,
      customerNotes: normalizeText(customerNotes),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (priced.couponCode && priced.discountAmount > 0) {
      try {
        await googleSheets.applyCoupon(priced.couponCode);
      } catch (e) {
        console.error("Apply coupon error:", e);
      }
    }

    const { qrCode, payuData, emailSent, emailWarning } =
      await buildOrderPaymentPayload(order);

    res.status(201).json({
      success: true,
      message: "Order created",
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          status: order.orderStatus,
          paymentStatus: order.paymentStatus,
        },
        qrCode,
        payuData,
        emailSent,
        emailWarning,
      },
    });
  } catch (error) {
    if (error instanceof CartValidationError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }

    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
}

// Landing page form submission - accepts simpler format, no auth required
export async function createOrderFromLanding(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      name,
      email,
      phone,
      products,
      address,
      addressLine1,
      addressLine2,
      city,
      pincode,
      state,
      country,
      message,
      referredBy,
      couponCode,
      paymentMode: requestedPaymentMode,
      cartId,
    } = req.body;

    const normalizedAddressLine1 = String(addressLine1 || address || "").trim();
    const normalizedAddressLine2 = String(addressLine2 || "").trim();

    if (!name || !email || !phone || !normalizedAddressLine1 || !state || !pincode) {
      res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
      return;
    }

    const normalizedCartId = normalizeText(cartId);
    let pricingItems: any[] = [];
    let effectiveCouponCode = normalizeText(couponCode).toUpperCase();

    if (normalizedCartId) {
      const cart = await googleSheets.getCartById(normalizedCartId);
      if (!cart) {
        res.status(404).json({ success: false, message: "Cart not found" });
        return;
      }

      const cartItems = Array.isArray(cart.items) ? cart.items : [];
      if (cartItems.length === 0) {
        res.status(400).json({ success: false, message: "Cart is empty" });
        return;
      }

      pricingItems = toPricingInputItems(cartItems);
      effectiveCouponCode = effectiveCouponCode || normalizeText(cart.couponCode).toUpperCase();
    } else {
      pricingItems = toPricingInputItems(parseProductsInput(products));
    }

    const priced = await buildPricedCart(pricingItems, effectiveCouponCode);
    const paymentMode = resolvePaymentMode(requestedPaymentMode);

    const nowIso = new Date().toISOString();

    const order = await googleSheets.createOrder({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      addressLine1: normalizedAddressLine1,
      addressLine2: normalizedAddressLine2,
      city: city || "",
      state,
      pincode,
      country: country || "India",
      products: cartItemsToOrderProducts(priced.items),
      subtotal: priced.subtotal,
      shippingAmount: priced.shippingAmount,
      taxAmount: 0,
      couponDiscount: priced.discountAmount,
      couponCode: priced.couponCode,
      discountAmount: priced.discountAmount,
      discountType: priced.discountType,
      totalAmount: priced.totalAmount,
      paymentMode,
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      orderType: OrderType.REGULAR,
      customerNotes: message || "",
      referredBy: referredBy || "",
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Apply coupon usage if coupon was used
    if (priced.couponCode && priced.discountAmount > 0) {
      try {
        await googleSheets.applyCoupon(priced.couponCode);
      } catch (e) {
        console.error("Apply coupon error:", e);
      }
    }

    const { qrCode, payuData, emailSent, emailWarning } =
      await buildOrderPaymentPayload(order);

    // Add to Form_Submissions sheet for tracking
    try {
      await googleSheets.addFormSubmission({
        name,
        email,
        phone,
        products: cartItemsToOrderProducts(priced.items),
        address:
          [normalizedAddressLine1, normalizedAddressLine2]
            .filter(Boolean)
            .join(", "),
        city,
        pincode,
        state,
        country,
        message,
        referredBy,
        orderNumber: order.orderNumber,
      });
    } catch (e) {
      console.error("Form submission entry error:", e);
    }

    if (normalizedCartId) {
      await googleSheets.updateCart(normalizedCartId, {
        items: [],
        itemCount: 0,
        subtotal: 0,
        shippingAmount: 0,
        discountAmount: 0,
        discountType: null,
        couponCode: "",
        totalAmount: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      message: "Order submitted successfully!",
      orderNumber: order.orderNumber,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        qrCode,
        payuData,
        emailSent,
        emailWarning,
      },
    });
  } catch (error) {
    if (error instanceof CartValidationError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }

    console.error("Landing order error:", error);
    res.status(500).json({ success: false, message: "Failed to submit order" });
  }
}

export async function getAllOrders(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const {
      status,
      paymentStatus,
      search,
      referredBy,
      includeBulk,
      page,
      limit,
    } = req.query;
    let orders = await googleSheets.getAllOrders();

    // Filter out bulk orders by default (unless includeBulk=true)
    if (includeBulk !== "true") {
      orders = orders.filter((o) => o.orderType !== "BULK");
    }

    if (status) orders = orders.filter((o) => o.orderStatus === status);
    if (paymentStatus)
      orders = orders.filter((o) => o.paymentStatus === paymentStatus);
    if (referredBy) orders = orders.filter((o) => o.referredBy === referredBy);

    if (search) {
      const s = (search as string).toLowerCase();
      orders = orders.filter((o) => {
        const orderNum = (o.orderNumber || "").toLowerCase();
        const name = (o.customerName || "").toLowerCase();
        const phone = String(o.customerPhone || "");
        const email = (o.customerEmail || "").toLowerCase();
        const city = (o.city || "").toLowerCase();
        const state = (o.state || "").toLowerCase();
        return (
          orderNum.includes(s) ||
          name.includes(s) ||
          phone.includes(s) ||
          email.includes(s) ||
          city.includes(s) ||
          state.includes(s)
        );
      });
    }

    orders.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));

    const total = orders.length;

    // Always apply pagination - default to page 1, limit 25
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 25;
    const startIndex = (pageNum - 1) * limitNum;
    orders = orders.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: { orders, total, page: pageNum, limit: limitNum },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
}

export async function getOrderById(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const order = await googleSheets.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    let qrCode = null;
    if (
      order.paymentStatus !== PaymentStatus.VERIFIED &&
      Number(order.totalAmount || 0) > 0
    ) {
      qrCode = await qrGenerator.generateQRCodeBase64({
        amount: order.totalAmount,
        orderNumber: order.orderNumber,
      });
    }

    res.json({ success: true, data: { order, qrCode } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
}

export async function updateOrderStatus(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { status } = req.body;
    const order = await googleSheets.updateOrder(req.params.id, {
      orderStatus: status,
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.json({ success: true, data: { order } });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
}

// General order update (for address, internal notes, etc.)
export async function updateOrder(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const {
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
      customerNotes,
      internalNotes,
    } = req.body;

    const updates: Partial<Order> = {};
    if (addressLine1 !== undefined) updates.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updates.addressLine2 = addressLine2;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (pincode !== undefined) updates.pincode = pincode;
    if (country !== undefined) updates.country = country;
    if (customerNotes !== undefined) updates.customerNotes = customerNotes;
    if (internalNotes !== undefined) updates.internalNotes = internalNotes;

    const order = await googleSheets.updateOrder(req.params.id, updates);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }
    res.json({ success: true, data: { order } });
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ success: false, message: "Failed to update order" });
  }
}

export async function updatePaymentStatus(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { paymentStatus, transactionId } = req.body;
    const updates: Partial<Order> = {
      paymentStatus,
      paymentTransactionId: transactionId,
    };

    if (
      paymentStatus === PaymentStatus.VERIFIED ||
      paymentStatus === PaymentStatus.RECEIVED
    ) {
      updates.paymentReceivedAt = new Date().toISOString();
      updates.orderStatus = OrderStatus.PAID;
    }

    const order = await googleSheets.updateOrder(req.params.id, updates);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (paymentStatus === PaymentStatus.VERIFIED) {
      try {
        await emailService.sendPaymentConfirmation(order);
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update payment" });
  }
}

export async function updateTracking(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { trackingId, deliveryPartner, expectedDeliveryDate, sendEmail } =
      req.body;

    if (!trackingId || !deliveryPartner) {
      res
        .status(400)
        .json({ success: false, message: "Tracking ID and partner required" });
      return;
    }

    let trackingUrl = "";
    if (deliveryPartner === "Delhivery")
      trackingUrl = `https://www.delhivery.com/track/package/${trackingId}`;
    else if (deliveryPartner === "BlueDart")
      trackingUrl = `https://www.bluedart.com/tracking/${trackingId}`;
    else if (deliveryPartner === "DTDC")
      trackingUrl = `https://www.dtdc.in/tracking/${trackingId}`;

    let order = await googleSheets.getOrderById(req.params.id);
    if (order && !order.invoiceNumber)
      await googleSheets.assignInvoiceNumber(req.params.id);

    order = await googleSheets.updateOrder(req.params.id, {
      trackingId,
      deliveryPartner,
      trackingUrl,
      expectedDeliveryDate,
      orderStatus: OrderStatus.SHIPPED,
      shippedAt: new Date().toISOString(),
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (sendEmail) {
      try {
        const pdf = await invoiceGenerator.generateInvoicePDF(order);
        await emailService.sendShippingNotification(order, pdf);
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update tracking" });
  }
}

// Cancel order
export async function cancelOrder(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const order = await googleSheets.updateOrder(req.params.id, {
      orderStatus: OrderStatus.CANCELLED,
      cancelledAt: new Date().toISOString(),
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
}

// Delete cancelled order permanently
export async function deleteCancelledOrder(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const order = await googleSheets.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const orderStatus = String(order.orderStatus || "").trim().toUpperCase();
    if (orderStatus !== OrderStatus.CANCELLED) {
      res.status(400).json({
        success: false,
        message: "Only cancelled orders can be deleted",
      });
      return;
    }

    const deleted = await googleSheets.deleteOrder(req.params.id);
    if (!deleted) {
      res.status(500).json({
        success: false,
        message: "Failed to delete order",
      });
      return;
    }

    res.json({
      success: true,
      message: "Cancelled order deleted successfully",
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    console.error("Delete cancelled order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
    });
  }
}

// Mark as delivered (even without payment)
export async function markDelivered(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const order = await googleSheets.updateOrder(req.params.id, {
      orderStatus: OrderStatus.DELIVERED,
      deliveredAt: new Date().toISOString(),
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({ success: true, data: { order } });
  } catch (error) {
    console.error("Mark delivered error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to mark as delivered" });
  }
}

export async function getOrderQR(req: Request, res: Response): Promise<void> {
  try {
    const order = await googleSheets.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (Number(order.totalAmount || 0) <= 0) {
      res.status(400).json({
        success: false,
        message: "No QR required for zero-value orders",
      });
      return;
    }

    const qrCode = await qrGenerator.generateQRCodeBase64({
      amount: order.totalAmount,
      orderNumber: order.orderNumber,
    });
    res.json({
      success: true,
      data: {
        qrCode,
        amount: order.totalAmount,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate QR" });
  }
}

export async function downloadInvoice(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    let order = await googleSheets.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (!order.invoiceNumber)
      order = await googleSheets.assignInvoiceNumber(req.params.id);
    if (!order) {
      res
        .status(500)
        .json({ success: false, message: "Failed to generate invoice" });
      return;
    }

    const pdf = await invoiceGenerator.generateInvoicePDF(order);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice-${order.invoiceNumber}.pdf"`,
    );
    res.send(pdf);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to generate invoice" });
  }
}

export async function downloadShippingLabel(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const order = await googleSheets.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const pdf = await shippingLabelGenerator.generateShippingLabelPDF(order);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ShippingLabel-${order.orderNumber}.pdf"`,
    );
    res.send(pdf);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to generate shipping label" });
  }
}

export async function emailInvoice(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    let order = await googleSheets.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (!order.invoiceNumber)
      order = await googleSheets.assignInvoiceNumber(req.params.id);
    if (!order) {
      res
        .status(500)
        .json({ success: false, message: "Failed to generate invoice" });
      return;
    }

    const pdf = await invoiceGenerator.generateInvoicePDF(order);

    // Send invoice via email
    await emailService.sendInvoiceEmail(order, pdf);

    res.json({ success: true, message: "Invoice sent successfully" });
  } catch (error) {
    console.error("Email invoice error:", error);
    res.status(500).json({ success: false, message: "Failed to send invoice" });
  }
}

export async function getDashboardStats(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    let orders: any[] = [];
    try {
      orders = await googleSheets.getAllOrders();
    } catch (ordersError) {
      console.error("Failed to fetch orders for dashboard:", ordersError);
      // Return empty stats if orders fetch fails
      res.json({
        success: true,
        data: {
          totalOrders: 0,
          pendingPayment: 0,
          paidOrders: 0,
          pendingShipment: 0,
          inTransit: 0,
          delivered: 0,
          totalRevenue: 0,
          returnCustomers: 0,
          returnCustomerPercentage: 0,
          recentOrders: [],
        },
      });
      return;
    }

    // Calculate return customers by phone and email
    const phoneMap = new Map<string, Set<string>>(); // phone -> order IDs
    const emailMap = new Map<string, Set<string>>(); // email -> order IDs

    orders.forEach((order: any) => {
      const email = String(order.customerEmail || "")
        .toLowerCase()
        .trim();
      const phone = String(order.customerPhone || "")
        .replace(/\D/g, "")
        .trim();
      const orderId = order.id || order.orderNumber;

      // Track by phone (at least 10 digits)
      if (phone && phone.length >= 10) {
        if (!phoneMap.has(phone)) phoneMap.set(phone, new Set());
        phoneMap.get(phone)!.add(orderId);
      }

      // Track by email (must contain @)
      if (email && email.includes("@")) {
        if (!emailMap.has(email)) emailMap.set(email, new Set());
        emailMap.get(email)!.add(orderId);
      }
    });

    // Count returning customers (more than 1 order by phone OR email)
    const returningIdentifiers = new Set<string>();

    phoneMap.forEach((orderIds, phone) => {
      if (orderIds.size > 1) returningIdentifiers.add(`phone:${phone}`);
    });

    emailMap.forEach((orderIds, email) => {
      if (orderIds.size > 1) returningIdentifiers.add(`email:${email}`);
    });

    const returnCustomers = returningIdentifiers.size;
    const totalCustomers =
      Math.max(phoneMap.size, emailMap.size) || orders.length;
    const returnCustomerPercentage =
      totalCustomers > 0
        ? Math.round((returnCustomers / totalCustomers) * 100)
        : 0;

    // Orders sheet contains ONLY regular orders now (bulk orders are in separate sheet)
    // No need to filter - all orders from this sheet are regular orders
    const regularOrders = orders;
    const sortedRecentOrders = [...regularOrders].sort(
      (a, b) => getOrderTimestamp(b) - getOrderTimestamp(a),
    );

    res.json({
      success: true,
      data: {
        // Regular orders stats (from Orders sheet only)
        totalOrders: regularOrders.length,
        pendingPayment: regularOrders.filter(
          (o) =>
            o.paymentStatus === PaymentStatus.PENDING ||
            o.paymentStatus === PaymentStatus.QR_SHARED,
        ).length,
        paidOrders: regularOrders.filter(
          (o) => o.paymentStatus === PaymentStatus.VERIFIED,
        ).length,
        pendingShipment: regularOrders.filter(
          (o) => o.orderStatus === OrderStatus.PAID,
        ).length,
        inTransit: regularOrders.filter(
          (o) => o.orderStatus === OrderStatus.SHIPPED,
        ).length,
        delivered: regularOrders.filter(
          (o) => o.orderStatus === OrderStatus.DELIVERED,
        ).length,
        totalRevenue: regularOrders
          .filter((o) => o.paymentStatus === PaymentStatus.VERIFIED)
          .reduce((sum, o) => sum + o.totalAmount, 0),
        returnCustomers,
        returnCustomerPercentage,
        // Total products sold - sum quantities from verified orders only
        totalProductsSold: regularOrders
          .filter((o) => o.paymentStatus === PaymentStatus.VERIFIED)
          .reduce((sum, o) => {
            const products = o.products || o.skuBreakdown || [];
            return (
              sum +
              products.reduce(
                (pSum: number, p: any) => pSum + (p.quantity || 0),
                0,
              )
            );
          }, 0),
        // Total units sold - includes ALL orders (paid + pending payments)
        totalUnitsSold: regularOrders.reduce((sum, o) => {
          const products = o.products || o.skuBreakdown || [];
          return (
            sum +
            products.reduce(
              (pSum: number, p: any) => pSum + (p.quantity || 0),
              0,
            )
          );
        }, 0),
        recentOrders: sortedRecentOrders.slice(0, 10),
        // Bulk order stats are now fetched separately from the Bulk Orders sheet
        // via the /bulk-orders/stats API endpoint
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
}

export async function shareQR(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { method } = req.body;
    const order = await googleSheets.getOrderById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (method === "email") {
      if (Number(order.totalAmount || 0) <= 0) {
        res.status(400).json({
          success: false,
          message: "No QR required for zero-value orders",
        });
        return;
      }

      const qrCode = await qrGenerator.generateQRCodeBase64({
        amount: order.totalAmount,
        orderNumber: order.orderNumber,
      });

      await emailService.sendPaymentQREmail(order, qrCode);

      // Update payment status to QR_SHARED if still pending
      if (order.paymentStatus === PaymentStatus.PENDING) {
        await googleSheets.updateOrder(order.id, {
          paymentStatus: PaymentStatus.QR_SHARED,
        });
      }

      res.json({ success: true, message: "Payment QR sent to customer email" });
    } else if (method === "whatsapp") {
      // For WhatsApp, we return the data needed to open WhatsApp
      const phone = String(order.customerPhone || "").replace(/\D/g, "");
      const message =
        `🌿 *The Awla Company - Payment Request*\n\n` +
        `📦 *Order:* ${order.orderNumber}\n` +
        `👤 *Customer:* ${order.customerName}\n` +
        `💰 *Amount:* ₹${order.totalAmount}\n\n` +
        `Please scan the QR code or pay to complete your order.\n\n` +
        `Thank you for choosing The Awla Company! 🙏`;

      res.json({
        success: true,
        data: {
          whatsappUrl: `https://wa.me/${phone ? "91" + phone : ""
            }?text=${encodeURIComponent(message)}`,
        },
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid share method" });
    }
  } catch (error) {
    console.error("Share QR error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to share QR code" });
  }
}

export async function uploadPaymentScreenshot(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { base64Image, mimeType } = req.body;

    // Get order details to verify it exists
    const orderRes = await googleSheets.getOrderById(id);
    if (!orderRes) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    // If base64Image is provided, save it locally
    if (base64Image) {
      const fs = await import("fs");
      const path = await import("path");

      // Check size (base64 is ~4/3 of original, so 10MB file ≈ 13.3MB base64)
      const maxBase64Size = 13.3 * 1024 * 1024; // ~10MB file
      if (base64Image.length > maxBase64Size) {
        res.status(400).json({
          success: false,
          message: "Screenshot must be less than 10MB",
        });
        return;
      }

      // Create uploads directory
      const uploadsDir = path.join(__dirname, "../../uploads/screenshots");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Determine file extension
      const ext =
        mimeType?.includes("jpeg") || mimeType?.includes("jpg") ? "jpg" : "png";
      const filename = `${orderRes.orderNumber}_${Date.now()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      // Decode and save
      const buffer = Buffer.from(base64Image, "base64");
      fs.writeFileSync(filepath, buffer);

      // Update order with FULL screenshot URL (not relative path)
      const { config } = await import("../config");
      const screenshotUrl = `${config.uploadsUrl}/screenshots/${filename}`;
      await googleSheets.uploadPaymentScreenshot({
        orderId: id,
        orderNumber: orderRes.orderNumber,
        base64Image: screenshotUrl, // Store full URL
        mimeType: "",
      });

      res.json({
        success: true,
        message: "Screenshot uploaded",
        data: { screenshotUrl },
      });
    } else {
      // Just mark as verified without storing file - still store full URL pattern
      const { config } = await import("../config");
      const verifiedUrl = `${config.uploadsUrl
        }/verified/${new Date().toISOString()}`;
      await googleSheets.uploadPaymentScreenshot({
        orderId: id,
        orderNumber: orderRes.orderNumber,
        base64Image: verifiedUrl,
        mimeType: "",
      });

      res.json({
        success: true,
        message: "Screenshot verified",
        data: { verified: true },
      });
    }
  } catch (error) {
    console.error("Upload payment screenshot error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload screenshot" });
  }
}

// Upload delivery receipt
export async function uploadDeliveryReceipt(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { base64Image, mimeType } = req.body;

    const order = await googleSheets.getOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const fs = await import("fs");
    const path = await import("path");

    // Size check
    const maxBase64Size = 13.3 * 1024 * 1024;
    if (base64Image.length > maxBase64Size) {
      res
        .status(400)
        .json({ success: false, message: "Receipt must be less than 10MB" });
      return;
    }

    // Create delivery-receipts directory
    const uploadsDir = path.join(__dirname, "../../uploads/delivery-receipts");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file
    const ext =
      mimeType?.includes("jpeg") || mimeType?.includes("jpg") ? "jpg" : "png";
    const filename = `${order.orderNumber}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(base64Image, "base64");
    fs.writeFileSync(filepath, buffer);

    // Update order with receipt URL
    const { config } = await import("../config");
    const receiptUrl = `${config.uploadsUrl}/delivery-receipts/${filename}`;
    await googleSheets.updateOrder(id, { deliveryReceiptUrl: receiptUrl });

    res.json({
      success: true,
      message: "Delivery receipt uploaded",
      data: { receiptUrl },
    });
  } catch (error) {
    console.error("Upload delivery receipt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload receipt" });
  }
}

// Search orders by customer name
export async function searchOrders(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { query } = req.query;
    if (!query) {
      res
        .status(400)
        .json({ success: false, message: "Search query required" });
      return;
    }

    const allOrders = await googleSheets.getAllOrders();
    const searchStr = String(query).toLowerCase();

    const matches = allOrders.filter(
      (o) =>
        (o.customerName || "").toLowerCase().includes(searchStr) ||
        (o.orderNumber || "").toLowerCase().includes(searchStr),
    );

    matches.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));

    res.json({ success: true, data: { orders: matches } });
  } catch (error) {
    console.error("Search orders error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to search orders" });
  }
}

// Get all orders for delivery receipts - show all orders so any can have receipt uploaded
export async function getDeliveryReceipts(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const allOrders = await googleSheets.getAllOrders();
    allOrders.sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
    // Return all orders - any order can have a delivery receipt uploaded
    res.json({
      success: true,
      data: { orders: allOrders, total: allOrders.length },
    });
  } catch (error) {
    console.error("Get delivery receipts error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get delivery receipts" });
  }
}

// =============================================================================
// Payment-Related Endpoints
// =============================================================================

// Get bulk payment page
export async function getBulkPaymentPage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const bulkOrder = await googleSheets.getBulkOrderById(id);
    if (!bulkOrder) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        orderId: id,
        paymentType: type,
        amount: bulkOrder.totalAmount,
        orderDetails: bulkOrder
      }
    });
  } catch (error) {
    console.error("Get bulk payment page error:", error);
    res.status(500).json({ success: false, message: "Failed to load payment page" });
  }
}

// Process bulk PayU payment
export async function processBulkPayUPayment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const paymentData = req.body;

    const bulkOrder = await googleSheets.getBulkOrderById(id);
    if (!bulkOrder) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    // Process PayU payment
    const paymentParams = payuPayment.generatePaymentParams({
      orderId: id,
      orderNumber: `BLK${id.slice(-8)}`,
      amount: bulkOrder.totalAmount,
      customerName: bulkOrder.customerName || 'Customer',
      customerEmail: bulkOrder.customerEmail,
      customerPhone: bulkOrder.customerPhone,
      productInfo: `Bulk Order #${id}`
    });

    res.json({
      success: true,
      data: {
        paymentUrl: payuPayment.getPayUFormUrl(),
        paymentParams,
        orderId: id
      }
    });
  } catch (error) {
    console.error("Process bulk PayU payment error:", error);
    res.status(500).json({ success: false, message: "Payment processing failed" });
  }
}

// Process bulk UPI payment
export async function processBulkUPIPayment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const bulkOrder = await googleSheets.getBulkOrderById(id);
    if (!bulkOrder) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    if (Number(bulkOrder.totalAmount || 0) <= 0) {
      res.status(400).json({
        success: false,
        message: "No UPI QR required for zero-value orders",
      });
      return;
    }

    // Generate UPI QR code
    const qrCode = await qrGenerator.generateQRCodeBase64({
      amount: bulkOrder.totalAmount,
      orderNumber: `BLK${id.slice(-8)}`
    });

    res.json({
      success: true,
      data: {
        qrCodeBase64: qrCode,
        upiString: qrGenerator.generateUPIString({
          amount: bulkOrder.totalAmount,
          orderNumber: `BLK${id.slice(-8)}`
        })
      }
    });
  } catch (error) {
    console.error("Process bulk UPI payment error:", error);
    res.status(500).json({ success: false, message: "UPI payment processing failed" });
  }
}
