import { randomUUID } from "crypto";
import { Request, Response } from "express";
import googleSheets from "../services/googleSheets";
import qrGenerator from "../services/qrGenerator";
import payuPayment from "../services/payuPayment";
import emailService from "../services/emailService";
import {
  buildPricedCart,
  CartValidationError,
  cartItemsToOrderProducts,
} from "../services/cartPricingService";
import { OrderStatus, PaymentMode, PaymentStatus, OrderType } from "../types";

function normalizeId(value: unknown): string {
  return String(value || "").trim();
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function toCartInputItems(items: any[]): any[] {
  return items.map((item) => ({
    productId: item?.productId,
    slug: item?.slug,
    weight: item?.weight || item?.variant,
    quantity: item?.quantity,
  }));
}

function normalizePaymentMode(raw: unknown): PaymentMode {
  const mode = String(raw || "").trim().toUpperCase();
  if (mode === PaymentMode.PAYU) return PaymentMode.PAYU;
  if (mode === PaymentMode.COD) return PaymentMode.COD;
  return PaymentMode.UPI_QR;
}

function buildEmptyCartSnapshot() {
  return {
    items: [],
    itemCount: 0,
    subtotal: 0,
    shippingAmount: 0,
    discountAmount: 0,
    discountType: null,
    couponCode: "",
    totalAmount: 0,
  };
}

export async function upsertCart(req: Request, res: Response): Promise<void> {
  try {
    const {
      cartId: rawCartId,
      items,
      couponCode,
      customerEmail,
      customerPhone,
    } = req.body || {};

    const incomingItems = Array.isArray(items) ? items : [];
    const priced = incomingItems.length > 0
      ? await buildPricedCart(incomingItems, couponCode)
      : { ...buildEmptyCartSnapshot(), couponCode: "", discountType: null };

    const nowIso = new Date().toISOString();
    const cartId = normalizeId(rawCartId) || randomUUID();
    const existing = await googleSheets.getCartById(cartId);

    const payload = {
      id: cartId,
      customerEmail: normalizeText(customerEmail) || existing?.customerEmail || "",
      customerPhone: normalizeText(customerPhone) || existing?.customerPhone || "",
      couponCode: priced.couponCode,
      discountType: priced.discountType,
      discountAmount: priced.discountAmount,
      subtotal: priced.subtotal,
      shippingAmount: priced.shippingAmount,
      totalAmount: priced.totalAmount,
      itemCount: priced.itemCount,
      currency: "INR",
      items: priced.items,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const cart = existing
      ? await googleSheets.updateCart(cartId, payload)
      : await googleSheets.createCart(payload);

    if (!cart) {
      res.status(500).json({ success: false, message: "Failed to save cart" });
      return;
    }

    res.json({ success: true, data: cart });
  } catch (error) {
    if (error instanceof CartValidationError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }

    console.error("Upsert cart error:", error);
    res.status(500).json({ success: false, message: "Failed to save cart" });
  }
}

export async function getCartById(req: Request, res: Response): Promise<void> {
  try {
    const cartId = normalizeId(req.params.id);
    if (!cartId) {
      res.status(400).json({ success: false, message: "Cart ID is required" });
      return;
    }

    const cart = await googleSheets.getCartById(cartId);
    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found" });
      return;
    }

    // Re-price on read so totals stay accurate if product pricing changed.
    const currentItems = Array.isArray(cart.items) ? cart.items : [];
    if (currentItems.length === 0) {
      res.json({ success: true, data: { ...cart, ...buildEmptyCartSnapshot() } });
      return;
    }

    try {
      const priced = await buildPricedCart(toCartInputItems(currentItems), cart.couponCode);
      const updated = await googleSheets.updateCart(cart.id, {
        items: priced.items,
        itemCount: priced.itemCount,
        subtotal: priced.subtotal,
        shippingAmount: priced.shippingAmount,
        discountAmount: priced.discountAmount,
        discountType: priced.discountType,
        couponCode: priced.couponCode,
        totalAmount: priced.totalAmount,
        updatedAt: new Date().toISOString(),
      });

      res.json({ success: true, data: updated || cart });
    } catch (pricingError) {
      if (pricingError instanceof CartValidationError) {
        res.status(409).json({
          success: false,
          message: `Cart requires attention: ${pricingError.message}`,
        });
        return;
      }
      throw pricingError;
    }
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ success: false, message: "Failed to get cart" });
  }
}

export async function clearCart(req: Request, res: Response): Promise<void> {
  try {
    const cartId = normalizeId(req.params.id);
    if (!cartId) {
      res.status(400).json({ success: false, message: "Cart ID is required" });
      return;
    }

    const existing = await googleSheets.getCartById(cartId);
    if (!existing) {
      res.status(404).json({ success: false, message: "Cart not found" });
      return;
    }

    const cleared = await googleSheets.updateCart(cartId, {
      ...buildEmptyCartSnapshot(),
      updatedAt: new Date().toISOString(),
      currency: "INR",
    });

    if (!cleared) {
      res.status(500).json({ success: false, message: "Failed to clear cart" });
      return;
    }

    res.json({ success: true, data: cleared });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ success: false, message: "Failed to clear cart" });
  }
}

export async function checkoutCart(req: Request, res: Response): Promise<void> {
  try {
    const cartId = normalizeId(req.params.id);
    if (!cartId) {
      res.status(400).json({ success: false, message: "Cart ID is required" });
      return;
    }

    const cart = await googleSheets.getCartById(cartId);
    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found" });
      return;
    }

    const cartItems = Array.isArray(cart.items) ? cart.items : [];
    if (cartItems.length === 0) {
      res.status(400).json({ success: false, message: "Cart is empty" });
      return;
    }

    const {
      name,
      email,
      phone,
      address,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
      message,
      referredBy,
      paymentMode: requestedPaymentMode,
      couponCode: couponCodeOverride,
    } = req.body || {};

    const normalizedName = normalizeText(name);
    const normalizedEmail = normalizeText(email);
    const normalizedPhone = normalizeText(phone);
    const normalizedAddressLine1 = normalizeText(addressLine1 || address);
    const normalizedAddressLine2 = normalizeText(addressLine2);
    const normalizedState = normalizeText(state);
    const normalizedPincode = normalizeText(pincode);

    if (
      !normalizedName ||
      !normalizedEmail ||
      !normalizedPhone ||
      !normalizedAddressLine1 ||
      !normalizedState ||
      !normalizedPincode
    ) {
      res.status(400).json({ success: false, message: "Missing required checkout fields" });
      return;
    }

    const couponCode = normalizeText(couponCodeOverride || cart.couponCode).toUpperCase();
    const priced = await buildPricedCart(toCartInputItems(cartItems), couponCode);
    const paymentMode = normalizePaymentMode(requestedPaymentMode);

    const nowIso = new Date().toISOString();
    const order = await googleSheets.createOrder({
      customerName: normalizedName,
      customerEmail: normalizedEmail,
      customerPhone: normalizedPhone,
      addressLine1: normalizedAddressLine1,
      addressLine2: normalizedAddressLine2,
      city: normalizeText(city),
      state: normalizedState,
      pincode: normalizedPincode,
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
      paymentMode,
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      orderType: OrderType.REGULAR,
      customerNotes: normalizeText(message),
      referredBy: normalizeText(referredBy),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (priced.couponCode && priced.discountAmount > 0) {
      try {
        await googleSheets.applyCoupon(priced.couponCode);
      } catch (couponError) {
        console.error("Apply coupon error:", couponError);
      }
    }

    let qrCode: string | null = null;
    let payuData: any = null;
    let emailSent: boolean | null = null;
    let emailWarning: string | null = null;

    if (paymentMode === PaymentMode.PAYU) {
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
    } else if (paymentMode === PaymentMode.UPI_QR && order.totalAmount > 0) {
      qrCode = await qrGenerator.generateQRCodeBase64({
        amount: order.totalAmount,
        orderNumber: order.orderNumber,
      });

      try {
        await emailService.sendOrderConfirmation(order, qrCode);
        emailSent = true;
      } catch (mailError) {
        emailSent = false;
        emailWarning = "Order placed successfully, but confirmation email could not be sent right now.";
        console.error("Checkout email error:", mailError);
      }
    } else if (order.totalAmount <= 0) {
      await googleSheets.updateOrder(order.id, {
        paymentStatus: PaymentStatus.VERIFIED,
        orderStatus: OrderStatus.PAID,
        paymentReceivedAt: new Date().toISOString(),
      });
    }

    await googleSheets.updateCart(cart.id, {
      ...buildEmptyCartSnapshot(),
      updatedAt: new Date().toISOString(),
      currency: "INR",
    });

    res.status(201).json({
      success: true,
      message: "Order submitted successfully",
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

    console.error("Checkout cart error:", error);
    res.status(500).json({ success: false, message: "Failed to checkout cart" });
  }
}
