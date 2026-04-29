import { Request, Response } from "express";
import supabase from "../services/supabase";
import emailService from "../services/emailService";
import payuPayment from "../services/payuPayment";
import invoiceGenerator from "../services/invoiceGenerator";
import {
  OrderStatus,
  PaymentStatus,
  PaymentMode,
  N8nPaymentWebhook,
} from "../types";
import { config } from "../config";

// n8n payment webhook (existing functionality)
export async function n8nPaymentWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { orderRef, amount, transactionId, paidAt }: N8nPaymentWebhook =
      req.body;

    if (!orderRef || !amount || !transactionId) {
      res.status(400).json({ success: false, message: "Missing fields" });
      return;
    }

    const order = await supabase.getOrderByNumber(orderRef);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const updated = await supabase.updateOrder(order.id, {
      paymentStatus: PaymentStatus.RECEIVED,
      orderStatus: OrderStatus.PAID,
      paymentTransactionId: transactionId,
      paymentReceivedAt: paidAt || new Date().toISOString(),
    });

    if (updated) {
      try {
        await emailService.sendPaymentConfirmation(updated);
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    res.json({
      success: true,
      message: "Payment recorded",
      data: { orderNumber: order.orderNumber },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// PayU browser redirect callback (success/failure)
export async function payuPaymentCallback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = payuPayment.processPayUCallback(req.body);

    if (!result.success) {
      // Redirect to frontend with failure status
      const failureUrl = `${config.frontendUrl
        }/payment-status?status=failed&order=${result.orderNumber
        }&message=${encodeURIComponent(result.message)}`;
      res.redirect(failureUrl);
      return;
    }

    const order = await supabase.getOrderByNumber(result.orderNumber);
    if (!order) {
      const failureUrl = `${config.frontendUrl
        }/payment-status?status=failed&message=${encodeURIComponent(
          "Order not found"
        )}`;
      res.redirect(failureUrl);
      return;
    }

    // Update order with payment details
    const updated = await supabase.updateOrder(order.id, {
      paymentStatus: PaymentStatus.VERIFIED,
      orderStatus: OrderStatus.PAID,
      paymentTransactionId: result.paymentId,
      payuTxnId: result.txnId,
      payuMihpayid: result.paymentId,
      payuPaymentMode: result.mode,
      paymentReceivedAt: new Date().toISOString(),
      paymentMode: PaymentMode.PAYU,
    });

    if (updated) {
      // Send payment confirmation email
      try {
        await emailService.sendPaymentConfirmation(updated);
      } catch (e) {
        console.error("Email error:", e);
      }

      // Generate invoice for paid order
      try {
        await supabase.assignInvoiceNumber(order.id);
      } catch (e) {
        console.error("Invoice number assignment error:", e);
      }
    }

    // Redirect to frontend with success status
    const successUrl = `${config.frontendUrl}/payment-status?status=success&order=${order.orderNumber}`;
    res.redirect(successUrl);
  } catch (error) {
    console.error("PayU callback error:", error);
    const errorUrl = `${config.frontendUrl
      }/payment-status?status=failed&message=${encodeURIComponent(
        "Payment processing error"
      )}`;
    res.redirect(errorUrl);
  }
}

// PayU server-to-server webhook (for reliable payment status updates)
export async function payuWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = payuPayment.processPayUCallback(req.body);

    if (!result.success) {
      // Still return 200 to PayU to prevent retries for invalid requests
      res.status(200).json({ success: false, message: result.message });
      return;
    }

    const order = await supabase.getOrderByNumber(result.orderNumber);
    if (!order) {
      res.status(200).json({ success: false, message: "Order not found" });
      return;
    }

    // Check if already processed
    if (order.paymentStatus === PaymentStatus.VERIFIED) {
      res.status(200).json({ success: true, message: "Already processed" });
      return;
    }

    // Update order with payment details
    const updated = await supabase.updateOrder(order.id, {
      paymentStatus: PaymentStatus.VERIFIED,
      orderStatus: OrderStatus.PAID,
      paymentTransactionId: result.paymentId,
      payuTxnId: result.txnId,
      payuMihpayid: result.paymentId,
      payuPaymentMode: result.mode,
      paymentReceivedAt: new Date().toISOString(),
      paymentMode: PaymentMode.PAYU,
    });

    if (updated) {
      // Send payment confirmation email
      try {
        await emailService.sendPaymentConfirmation(updated);
      } catch (e) {
        console.error("Webhook email error:", e);
      }

      // Generate invoice for paid order
      try {
        await supabase.assignInvoiceNumber(order.id);
      } catch (e) {
        console.error("Invoice number assignment error:", e);
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment verified",
      data: { orderId: order.id, orderNumber: order.orderNumber },
    });
  } catch (error) {
    console.error("PayU webhook error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function webhookHealthCheck(
  req: Request,
  res: Response
): Promise<void> {
  res.json({ success: true, message: "Webhooks active" });
}

// PayU bulk order browser redirect callback
export async function payuBulkOrderCallback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = payuPayment.processPayUCallback(req.body);
    const productInfo = req.body.productinfo || "";

    // Determine payment type from productinfo
    const isCredit = productInfo.toLowerCase().includes("credit");
    const paymentType = isCredit ? "credit" : "prepaid";

    // Get order to check details
    const order = await supabase.getBulkOrderByNumber(result.orderNumber);

    if (!order) {
      // Render failure page with close button
      res.send(
        renderPaymentResultPage({
          success: false,
          orderNumber: result.orderNumber,
          message: "Bulk order not found",
          paymentType,
        })
      );
      return;
    }

    if (!result.success) {
      // Payment failed - update the sheet with failure status
      const updates: any = {};
      if (paymentType === "prepaid") {
        updates.prepaidStatus = "FAILED";
        updates.prepaidFailedAt = new Date().toISOString();
        updates.prepaidErrorMessage = result.message;
      } else {
        updates.creditStatus = "FAILED";
        updates.creditFailedAt = new Date().toISOString();
        updates.creditErrorMessage = result.message;
      }

      await supabase.updateBulkOrder(order.id, updates);

      // Render failure page with retry option and close button
      res.send(
        renderPaymentResultPage({
          success: false,
          orderNumber: order.orderNumber,
          orderId: order.id,
          message: result.message,
          paymentType,
          allowRetry: true,
        })
      );
      return;
    }

    // Update the appropriate payment status
    const updates: any = {};
    if (paymentType === "prepaid") {
      updates.prepaidStatus = "PAID";
      updates.prepaidPaidAt = new Date().toISOString();
      updates.prepaidTxnId = result.paymentId;
      updates.prepaidPayuTxnId = result.txnId;
    } else {
      updates.creditStatus = "PAID";
      updates.creditPaidAt = new Date().toISOString();
      updates.creditTxnId = result.paymentId;
      updates.creditPayuTxnId = result.txnId;
    }

    // Check if both payments are complete to update order status
    const prepaidDone =
      paymentType === "prepaid"
        ? true
        : order.prepaidStatus === "PAID" || order.prepaidAmount === 0;
    const creditDone =
      paymentType === "credit"
        ? true
        : order.creditStatus === "PAID" || order.creditAmount === 0;

    if (prepaidDone && creditDone) {
      updates.orderStatus = OrderStatus.PAID;
    } else if (paymentType === "prepaid" && order.creditAmount > 0) {
      updates.orderStatus = OrderStatus.PROCESSING;
    }

    await supabase.updateBulkOrder(order.id, updates);

    // Send payment confirmation email
    try {
      await emailService.sendBulkPaymentConfirmation(
        order,
        paymentType,
        result.paymentId
      );
    } catch (e) {
      console.error("Bulk order email error:", e);
    }

    // Render success page with close button
    res.send(
      renderPaymentResultPage({
        success: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        message: "Payment successful!",
        paymentType,
        amount:
          paymentType === "prepaid" ? order.prepaidAmount : order.creditAmount,
        transactionId: result.paymentId,
      })
    );
  } catch (error) {
    console.error("PayU bulk order callback error:", error);
    res.send(
      renderPaymentResultPage({
        success: false,
        orderNumber: "",
        message: "Payment processing error. Please contact support.",
        paymentType: "prepaid",
      })
    );
  }
}

/**
 * Render payment result page with close/retry functionality
 */
function renderPaymentResultPage(options: {
  success: boolean;
  orderNumber: string;
  orderId?: string;
  message: string;
  paymentType: string;
  amount?: number;
  transactionId?: string;
  allowRetry?: boolean;
}): string {
  const {
    success,
    orderNumber,
    orderId,
    message,
    paymentType,
    amount,
    transactionId,
    allowRetry,
  } = options;

  const statusIcon = success ? "✅" : "❌";
  const statusTitle = success ? "Payment Successful!" : "Payment Failed";
  const statusColor = success ? "#2d5016" : "#dc3545";

  const retryButton =
    allowRetry && orderId
      ? `
        <a href="${config.backendUrl}/pay/bulk/${orderId}?type=${paymentType}" class="retry-btn">
            🔄 Try Again
        </a>
    `
      : "";

  const amountDisplay = amount
    ? `<p class="amount">₹${amount.toFixed(2)}</p>`
    : "";
  const txnDisplay = transactionId
    ? `<p class="txn">Transaction ID: ${transactionId}</p>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${statusTitle} - The Awla Company</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, ${success ? "#2d5016" : "#6c757d"
    }, ${success ? "#4a7c23" : "#495057"}); 
                min-height: 100vh; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                margin: 0; 
                padding: 20px; 
            }
            .card { 
                background: white; 
                border-radius: 16px; 
                padding: 40px; 
                max-width: 420px; 
                width: 100%; 
                text-align: center; 
                box-shadow: 0 20px 60px rgba(0,0,0,0.3); 
            }
            .icon { font-size: 64px; margin-bottom: 16px; }
            h1 { color: ${statusColor}; margin: 0 0 16px 0; font-size: 24px; }
            .order { color: #666; margin-bottom: 8px; font-size: 14px; }
            .amount { font-size: 28px; font-weight: bold; color: #2d5016; margin: 16px 0; }
            .txn { color: #888; font-size: 12px; word-break: break-all; margin: 8px 0; }
            .message { color: #666; margin: 16px 0; line-height: 1.5; }
            .btn-group { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }
            .close-btn { 
                background: ${statusColor}; 
                color: white; 
                border: none; 
                padding: 14px 40px; 
                border-radius: 8px; 
                font-size: 16px; 
                cursor: pointer; 
                text-decoration: none;
                display: inline-block;
            }
            .close-btn:hover { opacity: 0.9; }
            .retry-btn { 
                background: #f8f9fa; 
                color: #333; 
                border: 2px solid #ddd; 
                padding: 12px 40px; 
                border-radius: 8px; 
                font-size: 16px; 
                cursor: pointer; 
                text-decoration: none;
                display: inline-block;
            }
            .retry-btn:hover { background: #e9ecef; }
            .note { color: #888; font-size: 12px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">${statusIcon}</div>
            <h1>${statusTitle}</h1>
            ${orderNumber ? `<p class="order">Order: ${orderNumber}</p>` : ""}
            ${amountDisplay}
            ${txnDisplay}
            <p class="message">${message}</p>
            <div class="btn-group">
                ${retryButton}
                <button class="close-btn" onclick="closeWindow()">Close Window</button>
            </div>
            <p class="note">You can safely close this window.</p>
        </div>
        <script>
            function closeWindow() {
                // Try to close the window
                window.close();
                // If window.close() doesn't work (opened directly), redirect
                setTimeout(function() {
                    // If still open, show message
                    document.querySelector('.note').innerHTML = 'Please close this tab manually.';
                }, 500);
            }
            
            // Auto-close after 10 seconds for successful payments
            ${success
      ? "setTimeout(function() { window.close(); }, 10000);"
      : ""
    }
        </script>
    </body>
    </html>
    `;
}

// PayU bulk order server-to-server webhook (reliable)
export async function payuBulkOrderWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {

    const result = payuPayment.processPayUCallback(req.body);
    const productInfo = req.body.productinfo || "";

    // Determine payment type from productinfo
    const isCredit = productInfo.toLowerCase().includes("credit");
    const paymentType = isCredit ? "credit" : "prepaid";

    // Get order first (we need it for both success and failure cases)
    const order = await supabase.getBulkOrderByNumber(result.orderNumber);
    if (!order) {
      res.status(200).json({ success: false, message: "Bulk order not found" });
      return;
    }

    // Handle failed payments
    if (!result.success) {

      // Update the sheet with failure status
      const failureUpdates: any = {};
      if (paymentType === "prepaid") {
        failureUpdates.prepaidStatus = "FAILED";
        failureUpdates.prepaidFailedAt = new Date().toISOString();
        failureUpdates.prepaidErrorMessage = result.message;
      } else {
        failureUpdates.creditStatus = "FAILED";
        failureUpdates.creditFailedAt = new Date().toISOString();
        failureUpdates.creditErrorMessage = result.message;
      }

      await supabase.updateBulkOrder(order.id, failureUpdates);

      res.status(200).json({
        success: false,
        message: result.message,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentType,
          status: "FAILED",
        },
      });
      return;
    }

    // Check if already processed
    if (paymentType === "prepaid" && order.prepaidStatus === "PAID") {
      res.status(200).json({ success: true, message: "Already processed" });
      return;
    }
    if (paymentType === "credit" && order.creditStatus === "PAID") {
      res.status(200).json({ success: true, message: "Already processed" });
      return;
    }

    // Update the appropriate payment status
    const updates: any = {};
    if (paymentType === "prepaid") {
      updates.prepaidStatus = "PAID";
      updates.prepaidPaidAt = new Date().toISOString();
      updates.prepaidTxnId = result.paymentId;
      updates.prepaidPayuTxnId = result.txnId;
    } else {
      updates.creditStatus = "PAID";
      updates.creditPaidAt = new Date().toISOString();
      updates.creditTxnId = result.paymentId;
      updates.creditPayuTxnId = result.txnId;
    }

    // Check if both payments are complete to update order status
    const prepaidDone =
      paymentType === "prepaid"
        ? true
        : order.prepaidStatus === "PAID" || order.prepaidAmount === 0;
    const creditDone =
      paymentType === "credit"
        ? true
        : order.creditStatus === "PAID" || order.creditAmount === 0;

    if (prepaidDone && creditDone) {
      updates.orderStatus = OrderStatus.PAID;
    } else if (paymentType === "prepaid" && order.creditAmount > 0) {
      updates.orderStatus = OrderStatus.PROCESSING;
    }

    await supabase.updateBulkOrder(order.id, updates);

    // Send payment confirmation email
    try {
      await emailService.sendBulkPaymentConfirmation(
        order,
        paymentType,
        result.paymentId
      );
    } catch (e) {
      console.error("Bulk order webhook email error:", e);
    }

    res.status(200).json({
      success: true,
      message: `${paymentType} payment verified`,
      data: { orderId: order.id, orderNumber: order.orderNumber, paymentType },
    });
  } catch (error) {
    console.error("PayU bulk order webhook error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
