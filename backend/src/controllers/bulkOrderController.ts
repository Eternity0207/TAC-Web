import { Request, Response } from "express";
import googleSheets, {
  BulkOrder,
  BulkOrderStats,
} from "../services/googleSheets";
import bulkPricingService from "../services/bulkPricingService";
import payuPayment from "../services/payuPayment";
import qrGenerator from "../services/qrGenerator";
import {
  getResolvedBulkPricingConfig,
  getResolvedPackagingOptions,
} from "../services/bulkConfigResolver";
import { AuthRequest } from "../middleware/auth";
import {
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentMode,
  OrderType,
  Order,
} from "../types";

// Check if user can create bulk orders (Admin, Head of Distribution, or Sales)
function canCreateBulkOrders(req: AuthRequest): boolean {
  const role = req.user?.role;
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.ADMIN ||
    role === UserRole.HEAD_DISTRIBUTION ||
    role === UserRole.SALES
  );
}

/**
 * Create a bulk order (saved to separate Bulk Orders sheet)
 */
export async function createBulkOrder(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res
        .status(403)
        .json({
          success: false,
          message: "Admin or HEAD_DISTRIBUTION access required",
        });
      return;
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      businessName,
      gstNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
      products,
      customerNotes,
      referredBy,
      prepaidAmount,
      creditAmount,
      discountType,
      discountValue,
    } = req.body;

    // Validate required fields
    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !addressLine1 ||
      !city ||
      !state ||
      !pincode
    ) {
      res
        .status(400)
        .json({ success: false, message: "Missing required customer fields" });
      return;
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "Products array required" });
      return;
    }

    // Get pricing configs
    const pricingConfigs = await getResolvedBulkPricingConfig();
    const packagingOptions = await getResolvedPackagingOptions();

    if (!pricingConfigs || pricingConfigs.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "Bulk pricing not configured" });
      return;
    }

    // Calculate bulk pricing
    const calculation = bulkPricingService.calculateBulkPrice(
      products,
      pricingConfigs,
      packagingOptions,
    );

    // Create the order products
    const orderProducts = calculation.products.map((p) => ({
      name: p.name,
      variant: p.packaging,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalPrice: p.totalPrice,
    }));

    // Calculate dealer discount if provided
    let dealerDiscountAmount = 0;
    if (discountValue && discountValue > 0) {
      if (discountType === "PERCENTAGE") {
        dealerDiscountAmount = Math.round(
          (calculation.subtotal * discountValue) / 100,
        );
      } else if (discountType === "FIXED") {
        dealerDiscountAmount = Math.min(discountValue, calculation.subtotal);
      }
    }

    // Final total after dealer discount
    const finalTotal = calculation.subtotal - dealerDiscountAmount;

    // Calculate payment split (default to full prepaid if not specified)
    const prepaid =
      prepaidAmount !== undefined ? Number(prepaidAmount) : finalTotal;
    const credit = creditAmount !== undefined ? Number(creditAmount) : 0;

    // Validate payment split
    if (Math.abs(prepaid + credit - finalTotal) > 1) {
      res.status(400).json({
        success: false,
        message:
          "Prepaid + Credit amounts must equal total amount after discount",
      });
      return;
    }

    // Create bulk order in SEPARATE Bulk Orders sheet
    const bulkOrder = await googleSheets.createBulkOrder({
      customerName,
      customerEmail,
      customerPhone,
      businessName: businessName || "",
      gstNumber: gstNumber || "",
      addressLine1,
      addressLine2: addressLine2 || "",
      city,
      state,
      pincode,
      country: country || "India",
      products: orderProducts,
      subtotal: calculation.subtotal,
      discountPercent:
        calculation.tier === "10kg" ? 15 : calculation.tier === "5kg" ? 10 : 0,
      discountAmount: (calculation.savings || 0) + dealerDiscountAmount,
      discountType: discountType || undefined,
      discountValue: discountValue || undefined,
      shippingAmount: 0, // Bulk orders typically have free shipping
      taxAmount: 0,
      totalAmount: finalTotal,
      prepaidAmount: prepaid,
      creditAmount: credit,
      orderStatus: OrderStatus.PENDING,
      paymentMode: prepaid > 0 ? PaymentMode.PAYU : PaymentMode.COD,
      customerNotes: customerNotes || "",
      referredBy: referredBy || req.user?.id || "",
      createdBy: req.user?.id || "",
    });

    // Generate PayU payment link only if prepaid amount > 0
    let payuData = null;
    if (prepaid > 0) {
      payuData = {
        paymentParams: payuPayment.generatePaymentParams({
          orderId: bulkOrder.id,
          orderNumber: bulkOrder.orderNumber,
          amount: prepaid, // Only charge prepaid amount
          customerName: bulkOrder.customerName,
          customerEmail: bulkOrder.customerEmail,
          customerPhone: bulkOrder.customerPhone,
          productInfo: `Bulk Order ${bulkOrder.orderNumber} - Advance Payment`,
          isBulkOrder: true,
        }),
        paymentUrl: payuPayment.getPayUFormUrl(),
      };
    }

    res.status(201).json({
      success: true,
      message:
        prepaid > 0
          ? "Bulk order created - Please complete payment"
          : "Bulk order created (Credit)",
      data: {
        order: {
          id: bulkOrder.id,
          orderNumber: bulkOrder.orderNumber,
          totalAmount: bulkOrder.totalAmount,
          prepaidAmount: prepaid,
          creditAmount: credit,
          tier: calculation.tier,
          savings: calculation.savings,
          products: calculation.products,
        },
        payuData,
      },
    });
  } catch (error: any) {
    console.error("Create bulk order error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create bulk order",
    });
  }
}

/**
 * Get all bulk orders from separate Bulk Orders sheet
 */
export async function getBulkOrders(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res
        .status(403)
        .json({
          success: false,
          message: "Admin or HEAD_DISTRIBUTION access required",
        });
      return;
    }

    const bulkOrders = await googleSheets.getAllBulkOrders();

    res.json({
      success: true,
      data: { orders: bulkOrders, total: bulkOrders.length },
    });
  } catch (error) {
    console.error("Get bulk orders error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bulk orders" });
  }
}

/**
 * Get bulk order statistics for dashboard
 */
export async function getBulkOrderStatsController(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res
        .status(403)
        .json({
          success: false,
          message: "Admin or HEAD_DISTRIBUTION access required",
        });
      return;
    }

    const stats = await googleSheets.getBulkOrderStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get bulk order stats error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bulk order stats" });
  }
}

/**
 * Update bulk order (status, payment, etc.)
 */
export async function updateBulkOrder(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res
        .status(403)
        .json({
          success: false,
          message: "Admin or HEAD_DISTRIBUTION access required",
        });
      return;
    }

    const { id } = req.params;
    const updates = req.body;

    const updatedOrder = await googleSheets.updateBulkOrder(id, updates);
    if (!updatedOrder) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Update bulk order error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update bulk order" });
  }
}

/**
 * Initiate payment for prepaid or credit amount
 */
export async function initiatePayment(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { paymentType } = req.body; // 'prepaid' or 'credit'

    const order = await googleSheets.getBulkOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    let amount = 0;
    let productInfo = "";

    if (paymentType === "prepaid") {
      if (order.prepaidStatus === "PAID") {
        res
          .status(400)
          .json({ success: false, message: "Prepaid already paid" });
        return;
      }
      amount = order.prepaidAmount;
      productInfo = `Bulk Order ${order.orderNumber} - Advance Payment`;
    } else if (paymentType === "credit") {
      if (order.creditStatus === "PAID") {
        res
          .status(400)
          .json({ success: false, message: "Credit already paid" });
        return;
      }
      amount = order.creditAmount;
      productInfo = `Bulk Order ${order.orderNumber} - Credit Payment`;
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid payment type. Use "prepaid" or "credit"',
      });
      return;
    }

    if (amount <= 0) {
      res
        .status(400)
        .json({ success: false, message: `No ${paymentType} amount to pay` });
      return;
    }

    // Generate PayU payment link
    const payuData = {
      paymentParams: payuPayment.generatePaymentParams({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: amount,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        productInfo: productInfo,
        isBulkOrder: true,
      }),
      paymentUrl: payuPayment.getPayUFormUrl(),
    };

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType,
        amount,
        payuData,
      },
    });
  } catch (error) {
    console.error("Initiate payment error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to initiate payment" });
  }
}

/**
 * Mark prepaid or credit as paid (manual confirmation)
 */
export async function markPaymentPaid(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const { id } = req.params;
    const { paymentType, txnId } = req.body; // 'prepaid' or 'credit'

    const order = await googleSheets.getBulkOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    const updates: Partial<BulkOrder> = {};

    if (paymentType === "prepaid") {
      updates.prepaidStatus = "PAID";
      updates.prepaidPaidAt = new Date().toISOString();
      if (txnId) updates.prepaidTxnId = txnId;
    } else if (paymentType === "credit") {
      updates.creditStatus = "PAID";
      updates.creditPaidAt = new Date().toISOString();
      if (txnId) updates.creditTxnId = txnId;
    } else {
      res.status(400).json({ success: false, message: "Invalid payment type" });
      return;
    }

    const updatedOrder = await googleSheets.updateBulkOrder(id, updates);

    res.json({
      success: true,
      message: `${paymentType} marked as paid`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Mark payment paid error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to mark payment as paid" });
  }
}

/**
 * Get bulk order by ID
 */
export async function getBulkOrderByIdController(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const order = await googleSheets.getBulkOrderById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get bulk order by ID error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bulk order" });
  }
}

/**
 * Add tracking information to bulk order
 */
export async function addBulkOrderTracking(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const { deliveryPartner, trackingId, trackingUrl, expectedDeliveryDate } =
      req.body;

    if (!trackingId && !deliveryPartner) {
      res.status(400).json({
        success: false,
        message: "Tracking ID or Delivery Partner required",
      });
      return;
    }

    const updates: Partial<BulkOrder> = {
      deliveryPartner: deliveryPartner || "",
      trackingId: trackingId || "",
      trackingUrl: trackingUrl || "",
      expectedDeliveryDate: expectedDeliveryDate || "",
    };

    const updatedOrder = await googleSheets.updateBulkOrder(id, updates);

    if (!updatedOrder) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    res.json({
      success: true,
      message: "Tracking information added",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Add tracking error:", error);
    res.status(500).json({ success: false, message: "Failed to add tracking" });
  }
}

/**
 * Mark bulk order as shipped
 */
export async function markBulkOrderShipped(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const updates: Partial<BulkOrder> = {
      orderStatus: OrderStatus.SHIPPED,
      shippedAt: new Date().toISOString(),
    };

    const updatedOrder = await googleSheets.updateBulkOrder(id, updates);

    if (!updatedOrder) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    res.json({
      success: true,
      message: "Order marked as shipped",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Mark shipped error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to mark as shipped" });
  }
}

/**
 * Mark bulk order as delivered
 */
export async function markBulkOrderDelivered(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const updates: Partial<BulkOrder> = {
      orderStatus: OrderStatus.DELIVERED,
      deliveredAt: new Date().toISOString(),
    };

    const updatedOrder = await googleSheets.updateBulkOrder(id, updates);

    if (!updatedOrder) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    res.json({
      success: true,
      message: "Order marked as delivered",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Mark delivered error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to mark as delivered" });
  }
}

/**
 * Cancel bulk order
 */
export async function cancelBulkOrder(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    const updates: Partial<BulkOrder> = {
      orderStatus: OrderStatus.CANCELLED,
      internalNotes: reason ? `Cancelled: ${reason}` : "Order cancelled",
    };

    const updatedOrder = await googleSheets.updateBulkOrder(id, updates);

    if (!updatedOrder) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    res.json({
      success: true,
      message: "Order cancelled",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
}

/**
 * Download invoice PDF for bulk order
 */
export async function downloadBulkInvoice(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const order = await googleSheets.getBulkOrderById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    // Import invoice generator dynamically
    const invoiceGenerator = await import("../services/invoiceGenerator");

    // Convert BulkOrder to Order-like format for invoice generation
    const orderForInvoice: any = {
      ...order,
      invoiceNumber: order.invoiceNumber || order.orderNumber,
    };

    const pdfBuffer =
      await invoiceGenerator.generateBulkInvoicePDF(orderForInvoice);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice-${
        order.invoiceNumber || order.orderNumber
      }.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Download invoice error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate invoice" });
  }
}

/**
 * Email invoice to customer
 */
export async function emailBulkInvoice(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const order = await googleSheets.getBulkOrderById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    // Import services dynamically
    const invoiceGenerator = await import("../services/invoiceGenerator");
    const emailService = await import("../services/emailService");

    const orderForInvoice: any = {
      ...order,
      invoiceNumber: order.invoiceNumber || order.orderNumber,
    };

    const pdfBuffer =
      await invoiceGenerator.generateBulkInvoicePDF(orderForInvoice);
    await emailService.default.sendInvoiceEmail(orderForInvoice, pdfBuffer);

    res.json({
      success: true,
      message: `Invoice sent to ${order.customerEmail}`,
    });
  } catch (error) {
    console.error("Email invoice error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to email invoice" });
  }
}

/**
 * Get payment QR code for bulk order
 */
export async function getPaymentQR(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { paymentType } = req.query; // 'prepaid' or 'credit'

    const order = await googleSheets.getBulkOrderById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    let amount = 0;
    let paymentLabel = "";

    if (paymentType === "credit") {
      if (order.creditStatus === "PAID" || order.creditAmount <= 0) {
        res
          .status(400)
          .json({ success: false, message: "No credit payment required" });
        return;
      }
      amount = order.creditAmount;
      paymentLabel = "Credit";
    } else {
      // Default to prepaid
      if (order.prepaidStatus === "PAID" || order.prepaidAmount <= 0) {
        res
          .status(400)
          .json({ success: false, message: "No prepaid payment required" });
        return;
      }
      amount = order.prepaidAmount;
      paymentLabel = "Advance";
    }

    // Generate UPI QR code (same as regular orders)
    const orderNumberWithType = `${order.orderNumber}-${
      paymentType === "credit" ? "CR" : "ADV"
    }`;
    const qrCode = await qrGenerator.generateQRCodeBase64({
      amount: amount,
      orderNumber: orderNumberWithType,
    });

    // Get UPI deep link for sharing
    const upiLink = qrGenerator.getUPIDeepLink({
      amount: amount,
      orderNumber: orderNumberWithType,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType: paymentType || "prepaid",
        paymentLabel,
        amount,
        customerName: order.businessName || order.customerName,
        customerPhone: order.customerPhone,
        qrCode,
        upiLink,
      },
    });
  } catch (error) {
    console.error("Get payment QR error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get payment QR" });
  }
}

/**
 * Get PayU checkout data for bulk order payment
 */
export async function getPayUCheckout(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { paymentType } = req.query; // 'prepaid' or 'credit'

    const order = await googleSheets.getBulkOrderById(id);

    if (!order) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
      return;
    }

    let amount = 0;
    let productInfo = "";

    if (paymentType === "credit") {
      if (order.creditStatus === "PAID" || order.creditAmount <= 0) {
        res
          .status(400)
          .json({ success: false, message: "No credit payment required" });
        return;
      }
      amount = order.creditAmount;
      productInfo = `Bulk Order ${order.orderNumber} - Credit Payment`;
    } else {
      // Default to prepaid
      if (order.prepaidStatus === "PAID" || order.prepaidAmount <= 0) {
        res
          .status(400)
          .json({ success: false, message: "No prepaid payment required" });
        return;
      }
      amount = order.prepaidAmount;
      productInfo = `Bulk Order ${order.orderNumber} - Advance Payment`;
    }

    // Generate PayU payment params
    const payuData = {
      paymentParams: payuPayment.generatePaymentParams({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: amount,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        productInfo: productInfo,
        isBulkOrder: true,
      }),
      paymentUrl: payuPayment.getPayUFormUrl(),
    };

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentType: paymentType || "prepaid",
        amount,
        customerName: order.businessName || order.customerName,
        payuData,
      },
    });
  } catch (error) {
    console.error("Get PayU checkout error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get PayU checkout" });
  }
}

/**
 * Render payment page for bulk order (public endpoint for customers)
 * This serves an HTML page that auto-submits to PayU
 */
export async function renderPaymentPage(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const paymentType = type === "credit" ? "credit" : "prepaid";

    const order = await googleSheets.getBulkOrderById(id);

    if (!order) {
      res.status(404).send(`
        <html>
          <head><title>Order Not Found</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>Order Not Found</h1>
            <p>The order you're looking for doesn't exist.</p>
          </body>
        </html>
      `);
      return;
    }

    let amount = 0;
    let productInfo = "";
    let paymentLabel = "";

    if (paymentType === "credit") {
      if (order.creditStatus === "PAID" || order.creditAmount <= 0) {
        res.send(`
          <html>
            <head><title>Payment Complete</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>✅ Payment Already Completed</h1>
              <p>Order: ${order.orderNumber}</p>
            </body>
          </html>
        `);
        return;
      }
      amount = order.creditAmount;
      productInfo = `Bulk Order ${order.orderNumber} - Credit`;
      paymentLabel = "Credit";
    } else {
      if (order.prepaidStatus === "PAID" || order.prepaidAmount <= 0) {
        res.send(`
          <html>
            <head><title>Payment Complete</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h1>✅ Payment Already Completed</h1>
              <p>Order: ${order.orderNumber}</p>
            </body>
          </html>
        `);
        return;
      }
      amount = order.prepaidAmount;
      productInfo = `Bulk Order ${order.orderNumber} - Advance`;
      paymentLabel = "Advance";
    }

    const paymentParams = payuPayment.generatePaymentParams({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: amount,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      productInfo: productInfo,
      isBulkOrder: true,
    });
    const paymentUrl = payuPayment.getPayUFormUrl();

    const formInputs = Object.entries(paymentParams)
      .map(
        ([key, value]) =>
          `<input type="hidden" name="${key}" value="${value}" />`,
      )
      .join("");

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment - The Awla Company</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #2d5016, #4a7c23); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; }
            .card { background: white; border-radius: 16px; padding: 40px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
            h1 { color: #2d5016; margin: 0 0 10px 0; font-size: 24px; }
            .amount { font-size: 32px; font-weight: bold; color: #2d5016; margin: 20px 0; }
            .order { color: #666; margin-bottom: 20px; }
            .spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #2d5016; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .pay-btn { background: #2d5016; color: white; border: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🌿 The Awla Company</h1>
            <p class="order">Order: ${order.orderNumber}</p>
            <div class="amount">₹${amount.toFixed(2)}</div>
            <p>${paymentLabel} Payment</p>
            <div class="spinner"></div>
            <p>Redirecting to payment...</p>
            <form id="payuForm" method="POST" action="${paymentUrl}">
              ${formInputs}
              <noscript><button type="submit" class="pay-btn">Pay Now</button></noscript>
            </form>
          </div>
          <script>setTimeout(function(){ document.getElementById('payuForm').submit(); }, 1500);</script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Render payment page error:", error);
    res
      .status(500)
      .send(
        "<html><body><h1>Error</h1><p>Please try again later.</p></body></html>",
      );
  }
}

/**
 * Upload delivery receipt for bulk order (stored in uploads/bulk-delivery-receipts)
 */
export async function uploadBulkDeliveryReceipt(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const { base64Image, mimeType } = req.body;

    const order = await googleSheets.getBulkOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Bulk order not found" });
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

    // Create bulk-delivery-receipts directory
    const uploadsDir = path.join(
      __dirname,
      "../../uploads/bulk-delivery-receipts",
    );
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
    const receiptUrl = `${config.uploadsUrl}/bulk-delivery-receipts/${filename}`;
    await googleSheets.updateBulkOrder(id, {
      deliveryReceiptUrl: receiptUrl,
      orderStatus: OrderStatus.DELIVERED,
      deliveredAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Delivery receipt uploaded",
      data: { receiptUrl },
    });
  } catch (error) {
    console.error("Upload bulk delivery receipt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload receipt" });
  }
}

/**
 * Create a bulk enquiry (public endpoint - no authentication required)
 */
export async function createBulkEnquiry(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const rawContactPerson = String(
      req.body.contactPerson ?? req.body.name ?? "",
    ).trim();
    const rawBusinessName = String(
      req.body.businessName ?? req.body.company ?? "",
    ).trim();
    const rawEmail = String(req.body.email ?? "").trim().toLowerCase();
    const rawPhone = String(req.body.phone ?? "").trim();
    const rawProductInterest = String(req.body.productInterest ?? "").trim();
    const rawEstimatedQuantity = String(req.body.estimatedQuantity ?? "").trim();
    const rawMessage = String(req.body.message ?? "").trim();

    const normalizedPhone = rawPhone.replace(/\D/g, "");
    const phone =
      normalizedPhone.length === 12 && normalizedPhone.startsWith("91")
        ? normalizedPhone.slice(2)
        : normalizedPhone.length === 11 && normalizedPhone.startsWith("0")
          ? normalizedPhone.slice(1)
          : normalizedPhone;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors: Array<{ field: string; message: string }> = [];

    if (!rawContactPerson) {
      errors.push({ field: "name", message: "Contact person name is required" });
    }

    if (!rawEmail) {
      errors.push({ field: "email", message: "Email is required" });
    } else if (!emailRegex.test(rawEmail)) {
      errors.push({
        field: "email",
        message: "Please provide a valid email address",
      });
    }

    if (!rawPhone) {
      errors.push({ field: "phone", message: "Phone number is required" });
    } else if (!/^\d{10}$/.test(phone)) {
      errors.push({
        field: "phone",
        message: "Please provide a valid 10-digit phone number",
      });
    }

    if (!rawMessage) {
      errors.push({
        field: "message",
        message: "Please share your bulk requirement in the message",
      });
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: errors[0].message,
        errors,
      });
      return;
    }

    const enquiryId = `ENQ-${Date.now()}`;

    const enquiry = await googleSheets.createBulkEnquiry({
      id: enquiryId,
      businessName: rawBusinessName || "",
      contactPerson: rawContactPerson,
      email: rawEmail,
      phone,
      productInterest: rawProductInterest || "",
      estimatedQuantity: rawEstimatedQuantity || "",
      message: rawMessage,
      status: "NEW",
      source: "website",
      enquiryType: "bulk",
      // Keep legacy fields for backward compatibility in existing views.
      name: rawContactPerson,
      company: rawBusinessName || "",
    });

    res.status(201).json({
      success: true,
      message: "Thank you for your bulk enquiry! We will contact you soon.",
      data: {
        enquiryId: enquiry?.id || enquiryId,
        status: enquiry?.status || "NEW",
      },
    });

  } catch (error) {
    console.error("Create bulk enquiry error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit enquiry. Please try again.",
    });
  }
}

// Get all bulk enquiries
export async function getBulkEnquiries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const enquiries = await googleSheets.getAllBulkEnquiries();

    res.json({
      success: true,
      data: enquiries || []
    });
  } catch (error) {
    console.error("Get bulk enquiries error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get bulk enquiries"
    });
  }
}

export async function updateBulkEnquiryStatus(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!canCreateBulkOrders(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const status = String(req.body?.status || "")
      .trim()
      .toUpperCase();
    const notes = String(req.body?.notes || "").trim();

    const allowedStatuses = new Set([
      "NEW",
      "CONTACTED",
      "CONVERTED",
      "CLOSED",
    ]);

    if (!status || !allowedStatuses.has(status)) {
      res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
      return;
    }

    const enquiry = await googleSheets.updateBulkEnquiry(id, {
      status,
      notes,
      updatedBy: req.user?.id || "",
    });

    if (!enquiry) {
      res.status(404).json({ success: false, message: "Enquiry not found" });
      return;
    }

    res.json({
      success: true,
      message: "Enquiry status updated",
      data: enquiry,
    });
  } catch (error) {
    console.error("Update bulk enquiry status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update enquiry status",
    });
  }
}

export default {
  createBulkOrder,
  getBulkOrders,
  getBulkOrderStatsController,
  updateBulkOrder,
  initiatePayment,
  markPaymentPaid,
  getBulkOrderByIdController,
  addBulkOrderTracking,
  markBulkOrderShipped,
  markBulkOrderDelivered,
  cancelBulkOrder,
  downloadBulkInvoice,
  emailBulkInvoice,
  getPaymentQR,
  uploadBulkDeliveryReceipt,
  createBulkEnquiry,
  getBulkEnquiries,
  updateBulkEnquiryStatus,
};
