import PDFDocument from "pdfkit";
import { Order } from "../types";
import path from "path";
import fs from "fs";

export async function generateInvoicePDF(order: Order): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const primaryColor = "#4a7c23";
    const darkGray = "#333333";
    const lightGray = "#666666";
    const bgLight = "#f8f9fa";
    const pageWidth = 515;

    // Format currency without special symbols
    const fmt = (amount: number) => `Rs. ${amount.toFixed(2)}`;

    // ===== HEADER SECTION =====
    // Green header bar
    doc.rect(0, 0, 595, 100).fill(primaryColor);

    // Try to add logo
    const logoPath = path.join(
      __dirname,
      "../../../awla-landing/assets/logo.png",
    );
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, 20, { width: 60 });
      } catch (e) {
        // Logo load failed, continue without it
      }
    }

    // Company name - white on green (positioned after logo)
    doc.fontSize(24).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("The Awla Company", 110, 30);
    doc.fontSize(10).fillColor("#e0e0e0").font("Helvetica");
    doc.text("Premium Amla Products | Royal Way to Stay Healthy", 110, 58);

    // INVOICE badge on right
    doc.fontSize(12).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("INVOICE", 450, 35, { width: 100, align: "right" });

    // ===== INVOICE INFO BOX =====
    doc.rect(40, 115, pageWidth, 65).fill(bgLight).stroke("#e0e0e0");

    doc.fontSize(9).fillColor(lightGray).font("Helvetica");
    doc.text("Invoice Number", 55, 125);
    doc.text("Order Number", 200, 125);
    doc.text("Invoice Date", 345, 125);
    doc.text("Payment Status", 450, 125);

    doc.fontSize(11).fillColor(darkGray).font("Helvetica-Bold");
    doc.text(order.invoiceNumber || "N/A", 55, 142);
    doc.text(order.orderNumber, 200, 142);
    doc.text(
      new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      345,
      142,
    );
    doc
      .fillColor(primaryColor)
      .text(
        order.paymentStatus === "VERIFIED" ? "PAID" : order.paymentStatus,
        450,
        142,
      );

    // ===== BILLING DETAILS =====
    const billY = 200;
    const lineHeight = 14; // Consistent line height
    const maxAddrWidth = 240; // Width for address text

    // Bill To section
    doc.fontSize(10).fillColor(primaryColor).font("Helvetica-Bold");
    doc.text("BILL TO", 55, billY);
    doc
      .moveTo(55, billY + 14)
      .lineTo(130, billY + 14)
      .stroke(primaryColor);

    let billTextY = billY + 28;
    doc.fontSize(11).fillColor(darkGray).font("Helvetica-Bold");
    doc.text(String(order.customerName || ""), 55, billTextY, {
      width: maxAddrWidth,
      lineGap: 2,
    });

    billTextY += lineHeight + 4;
    doc.fontSize(9).fillColor(lightGray).font("Helvetica");

    // Address line 1 - may wrap
    const addr1 = String(order.addressLine1 || "");
    doc.text(addr1, 55, billTextY, { width: maxAddrWidth, lineGap: 2 });
    billTextY += addr1.length > 40 ? lineHeight * 2 : lineHeight;

    // Address line 2 (optional)
    if (order.addressLine2) {
      doc.text(String(order.addressLine2), 55, billTextY, {
        width: maxAddrWidth,
      });
      billTextY += lineHeight;
    }

    // City, State - Pincode
    const cityLine = `${order.city || ""}, ${order.state || ""} - ${order.pincode || ""
      }`;
    doc.text(cityLine, 55, billTextY, { width: maxAddrWidth });
    billTextY += lineHeight;

    // Phone
    doc.text(`Phone: ${String(order.customerPhone || "")}`, 55, billTextY, {
      width: maxAddrWidth,
    });
    billTextY += lineHeight;

    // Email
    doc.text(`Email: ${String(order.customerEmail || "")}`, 55, billTextY, {
      width: maxAddrWidth,
    });

    // Ship To section
    doc.fontSize(10).fillColor(primaryColor).font("Helvetica-Bold");
    doc.text("SHIP TO", 320, billY);
    doc
      .moveTo(320, billY + 14)
      .lineTo(395, billY + 14)
      .stroke(primaryColor);

    let shipTextY = billY + 28;
    doc.fontSize(11).fillColor(darkGray).font("Helvetica-Bold");
    doc.text(String(order.customerName || ""), 320, shipTextY, {
      width: maxAddrWidth,
      lineGap: 2,
    });

    shipTextY += lineHeight + 4;
    doc.fontSize(9).fillColor(lightGray).font("Helvetica");

    // Address line 1
    doc.text(addr1, 320, shipTextY, { width: maxAddrWidth, lineGap: 2 });
    shipTextY += addr1.length > 40 ? lineHeight * 2 : lineHeight;

    // Address line 2
    if (order.addressLine2) {
      doc.text(String(order.addressLine2), 320, shipTextY, {
        width: maxAddrWidth,
      });
      shipTextY += lineHeight;
    }

    // City, State - Pincode
    doc.text(cityLine, 320, shipTextY, { width: maxAddrWidth });

    // ===== PRODUCTS TABLE =====
    const tableY = 330;

    // Table header
    doc.rect(40, tableY, pageWidth, 28).fill(primaryColor);
    doc.fontSize(10).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("#", 52, tableY + 8, { width: 25 });
    doc.text("Product Description", 80, tableY + 8, { width: 200 });
    doc.text("Qty", 300, tableY + 8, { width: 50, align: "center" });
    doc.text("Unit Price", 360, tableY + 8, { width: 80, align: "right" });
    doc.text("Total", 460, tableY + 8, { width: 80, align: "right" });

    // Table rows
    let rowY = tableY + 28;
    const products = Array.isArray(order.products) ? order.products : [];

    if (products.length === 0) {
      // Show a row indicating no products
      doc.rect(40, rowY, pageWidth, 30).fill("#fafafa");
      doc.fontSize(10).fillColor(lightGray).font("Helvetica");
      doc.text("No products", 80, rowY + 10, { width: 400 });
      rowY += 30;
    } else {
      products.forEach((product: any, index: number) => {
        const isEven = index % 2 === 0;
        if (isEven) {
          doc.rect(40, rowY, pageWidth, 30).fill("#fafafa");
        }

        // Handle different product data formats
        const productName = product.name || product.productName || "Product";
        const productVariant = product.variant || product.size || "";
        const qty = product.quantity || product.qty || 1;
        const unitPrice = product.unitPrice || product.price || 0;
        const totalPrice =
          product.totalPrice || product.total || qty * unitPrice || 0;

        doc.fontSize(10).fillColor(darkGray).font("Helvetica");
        doc.text((index + 1).toString(), 52, rowY + 10, { width: 25 });
        doc
          .font("Helvetica-Bold")
          .text(String(productName), 80, rowY + 6, { width: 200 });
        if (productVariant) {
          doc
            .font("Helvetica")
            .fillColor(lightGray)
            .text(String(productVariant), 80, rowY + 18, { width: 200 });
        }
        doc
          .fillColor(darkGray)
          .font("Helvetica")
          .text(String(qty), 300, rowY + 10, { width: 50, align: "center" });
        doc.text(fmt(unitPrice), 360, rowY + 10, { width: 80, align: "right" });
        doc
          .font("Helvetica-Bold")
          .text(fmt(totalPrice), 460, rowY + 10, { width: 80, align: "right" });

        rowY += 30;
      });
    }

    // Table bottom border
    doc.moveTo(40, rowY).lineTo(555, rowY).stroke("#e0e0e0");

    // ===== TOTALS SECTION =====
    const totalsY = rowY + 20;
    const totalsX = 360;

    // Totals box
    doc.rect(totalsX - 10, totalsY - 5, 205, 95).fill(bgLight);

    doc.fontSize(10).fillColor(lightGray).font("Helvetica");
    doc.text("Subtotal:", totalsX, totalsY + 5, { width: 100 });
    doc.fillColor(darkGray).text(fmt(order.subtotal || 0), 460, totalsY + 5, {
      width: 80,
      align: "right",
    });

    doc
      .fillColor(lightGray)
      .text("Shipping:", totalsX, totalsY + 25, { width: 100 });
    doc
      .fillColor(darkGray)
      .text(
        order.shippingAmount === 0 ? "FREE" : fmt(order.shippingAmount || 0),
        460,
        totalsY + 25,
        { width: 80, align: "right" },
      );

    if (order.taxAmount && order.taxAmount > 0) {
      doc
        .fillColor(lightGray)
        .text("Tax:", totalsX, totalsY + 45, { width: 100 });
      doc.fillColor(darkGray).text(fmt(order.taxAmount), 460, totalsY + 45, {
        width: 80,
        align: "right",
      });
    }

    // Total line with green background
    doc.rect(totalsX - 10, totalsY + 55, 205, 30).fill(primaryColor);
    // Auto-adjust font size based on total amount
    const totalStr = fmt(order.totalAmount || 0);
    const totalFontSize =
      totalStr.length > 12 ? 11 : totalStr.length > 10 ? 12 : 14;
    doc.fontSize(totalFontSize).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("TOTAL:", totalsX, totalsY + 65, { width: 100 });
    doc.text(totalStr, 460, totalsY + 65, { width: 80, align: "right" });

    // ===== PAYMENT INFO =====
    if (order.paymentTransactionId) {
      const payY = totalsY + 110;
      doc.fontSize(9).fillColor(lightGray).font("Helvetica");
      doc.text(`Transaction ID: ${order.paymentTransactionId}`, 40, payY);
    }

    // ===== TRACKING INFO =====
    if (order.trackingId) {
      const trackY = totalsY + 130;
      doc.rect(40, trackY, pageWidth, 45).fill(bgLight).stroke("#e0e0e0");
      doc.fontSize(10).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text("SHIPPING DETAILS", 55, trackY + 8);
      doc.fontSize(9).fillColor(darkGray).font("Helvetica");
      doc.text(`Tracking ID: ${order.trackingId}`, 55, trackY + 24);
      doc.text(`Carrier: ${order.deliveryPartner || "N/A"}`, 250, trackY + 24);
      if (order.expectedDeliveryDate) {
        doc.text(`Expected: ${order.expectedDeliveryDate}`, 400, trackY + 24);
      }
    }

    // ===== FOOTER =====
    const footerY = 720;

    // Decorative line
    doc.moveTo(40, footerY).lineTo(555, footerY).stroke("#e0e0e0");

    // Thank you message
    doc.fontSize(12).fillColor(primaryColor).font("Helvetica-Bold");
    doc.text("Thank you for your purchase!", 40, footerY + 15, {
      align: "center",
      width: pageWidth,
    });

    doc.fontSize(9).fillColor(lightGray).font("Helvetica");
    doc.text("The Awla Company - Royal Way to Stay Healthy", 40, footerY + 35, {
      align: "center",
      width: pageWidth,
    });
    doc.text(
      "Email: orders@theawlacompany.com | Web: theawlacompany.com",
      40,
      footerY + 50,
      { align: "center", width: pageWidth },
    );

    // Terms
    doc.fontSize(7).fillColor("#999999");
    doc.text(
      "This is a computer-generated invoice and does not require a signature.",
      40,
      footerY + 70,
      { align: "center", width: pageWidth },
    );

    doc.end();
  });
}

export async function generateBulkInvoicePDF(order: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const primaryColor = "#4a7c23";
    const darkGray = "#333333";
    const lightGray = "#666666";
    const bgLight = "#f8f9fa";
    const pageWidth = 515;

    const fmt = (amount: number) => `Rs. ${(amount || 0).toFixed(2)}`;

    // ===== HEADER SECTION =====
    doc.rect(0, 0, 595, 100).fill(primaryColor);

    const logoPath = path.join(
      __dirname,
      "../../../awla-landing/assets/logo.png",
    );
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, 20, { width: 60 });
      } catch (e) {
        /* continue without logo */
      }
    }

    doc.fontSize(24).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("The Awla Company", 110, 30);
    doc.fontSize(10).fillColor("#e0e0e0").font("Helvetica");
    doc.text("Premium Amla Products | Royal Way to Stay Healthy", 110, 58);

    doc.fontSize(12).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("BULK ORDER INVOICE", 420, 35, { width: 130, align: "right" });

    // ===== INVOICE INFO BOX =====
    doc.rect(40, 115, pageWidth, 65).fill(bgLight).stroke("#e0e0e0");

    doc.fontSize(9).fillColor(lightGray).font("Helvetica");
    doc.text("Invoice Number", 55, 125);
    doc.text("Order Number", 200, 125);
    doc.text("Invoice Date", 345, 125);
    doc.text("Order Status", 450, 125);

    doc.fontSize(11).fillColor(darkGray).font("Helvetica-Bold");
    doc.text(order.invoiceNumber || "N/A", 55, 142);
    doc.text(order.orderNumber, 200, 142);
    doc.text(
      new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      345,
      142,
    );
    doc.fillColor(primaryColor).text(order.orderStatus || "PENDING", 450, 142);

    // ===== BILLING DETAILS =====
    const billY = 200;
    const lineHeight = 14;
    const maxAddrWidth = 240;

    // Bill To section
    doc.fontSize(10).fillColor(primaryColor).font("Helvetica-Bold");
    doc.text("BILL TO", 55, billY);
    doc
      .moveTo(55, billY + 14)
      .lineTo(130, billY + 14)
      .stroke(primaryColor);

    let billTextY = billY + 28;

    // Business name (if present)
    if (order.businessName) {
      doc.fontSize(11).fillColor(darkGray).font("Helvetica-Bold");
      doc.text(String(order.businessName), 55, billTextY, {
        width: maxAddrWidth,
      });
      billTextY += lineHeight + 2;
    }

    doc.fontSize(10).fillColor(darkGray).font("Helvetica-Bold");
    doc.text(String(order.customerName || ""), 55, billTextY, {
      width: maxAddrWidth,
    });
    billTextY += lineHeight + 4;

    doc.fontSize(9).fillColor(lightGray).font("Helvetica");

    const addr1 = String(order.addressLine1 || "");
    doc.text(addr1, 55, billTextY, { width: maxAddrWidth });
    billTextY += addr1.length > 40 ? lineHeight * 2 : lineHeight;

    if (order.addressLine2) {
      doc.text(String(order.addressLine2), 55, billTextY, {
        width: maxAddrWidth,
      });
      billTextY += lineHeight;
    }

    const cityLine = `${order.city || ""}, ${order.state || ""} - ${order.pincode || ""
      }`;
    doc.text(cityLine, 55, billTextY, { width: maxAddrWidth });
    billTextY += lineHeight;

    doc.text(`Phone: ${String(order.customerPhone || "")}`, 55, billTextY);
    billTextY += lineHeight;

    if (order.gstNumber) {
      doc.text(`GSTIN: ${order.gstNumber}`, 55, billTextY);
      billTextY += lineHeight;
    }

    // Ship To (right side)
    doc.fontSize(10).fillColor(primaryColor).font("Helvetica-Bold");
    doc.text("SHIP TO", 330, billY);
    doc
      .moveTo(330, billY + 14)
      .lineTo(405, billY + 14)
      .stroke(primaryColor);

    let shipTextY = billY + 28;
    if (order.businessName) {
      doc.fontSize(11).fillColor(darkGray).font("Helvetica-Bold");
      doc.text(String(order.businessName), 330, shipTextY, {
        width: maxAddrWidth,
      });
      shipTextY += lineHeight + 2;
    }
    doc.fontSize(10).fillColor(darkGray).font("Helvetica-Bold");
    doc.text(String(order.customerName || ""), 330, shipTextY, {
      width: maxAddrWidth,
    });
    shipTextY += lineHeight + 4;
    doc.fontSize(9).fillColor(lightGray).font("Helvetica");
    doc.text(addr1, 330, shipTextY, { width: maxAddrWidth });
    shipTextY += addr1.length > 40 ? lineHeight * 2 : lineHeight;
    if (order.addressLine2) {
      doc.text(String(order.addressLine2), 330, shipTextY, {
        width: maxAddrWidth,
      });
      shipTextY += lineHeight;
    }
    doc.text(cityLine, 330, shipTextY, { width: maxAddrWidth });

    // ===== PRODUCTS TABLE =====
    const tableTop = Math.max(billTextY, shipTextY) + 30;

    doc.rect(40, tableTop, pageWidth, 22).fill(primaryColor);
    doc.fontSize(9).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("PRODUCT", 55, tableTop + 7);
    doc.text("QTY", 340, tableTop + 7, { width: 40, align: "center" });
    doc.text("UNIT PRICE", 390, tableTop + 7, { width: 70, align: "right" });
    doc.text("TOTAL", 470, tableTop + 7, { width: 70, align: "right" });

    let rowY = tableTop + 28;
    const products = order.products || [];

    products.forEach((item: any, index: number) => {
      const fillColor = index % 2 === 0 ? "#ffffff" : bgLight;
      doc.rect(40, rowY - 4, pageWidth, 22).fill(fillColor);

      doc.fontSize(9).fillColor(darkGray).font("Helvetica");
      const productName = item.variant
        ? `${item.name} - ${item.variant}`
        : item.name;
      doc.text(productName, 55, rowY, { width: 270 });
      doc.text(String(item.quantity || 1), 340, rowY, {
        width: 40,
        align: "center",
      });
      doc.text(fmt(item.unitPrice || item.price), 390, rowY, {
        width: 70,
        align: "right",
      });
      doc.text(
        fmt(
          item.totalPrice ||
          (item.unitPrice || item.price) * (item.quantity || 1),
        ),
        470,
        rowY,
        { width: 70, align: "right" },
      );

      rowY += 22;
    });

    // ===== TOTALS SECTION =====
    const totalsStartY = rowY + 20;
    const totalsX = 370;
    const valueX = 470;
    const totalsWidth = 70;

    doc.fontSize(9).fillColor(lightGray).font("Helvetica");
    let currentY = totalsStartY;

    doc.text("Subtotal:", totalsX, currentY);
    doc
      .fillColor(darkGray)
      .text(fmt(order.subtotal || order.totalAmount), valueX, currentY, {
        width: totalsWidth,
        align: "right",
      });
    currentY += 16;

    if (order.discountAmount && order.discountAmount > 0) {
      const discountLabel =
        order.discountType === "FIXED"
          ? "Discount (Fixed):"
          : `Discount (${order.discountPercent || order.discountValue || 0}%):`;
      doc.fillColor(lightGray).text(discountLabel, totalsX, currentY);
      doc
        .fillColor("#28a745")
        .text(`- ${fmt(order.discountAmount)}`, valueX, currentY, {
          width: totalsWidth,
          align: "right",
        });
      currentY += 16;
    }

    if (order.taxAmount && order.taxAmount > 0) {
      doc.fillColor(lightGray).text("Tax:", totalsX, currentY);
      doc.fillColor(darkGray).text(fmt(order.taxAmount), valueX, currentY, {
        width: totalsWidth,
        align: "right",
      });
      currentY += 16;
    }

    doc.moveTo(totalsX, currentY).lineTo(555, currentY).stroke("#cccccc");
    currentY += 8;

    doc.rect(totalsX - 10, currentY - 4, 195, 28).fill(primaryColor);
    // Auto-adjust font size based on total amount
    const bulkTotalStr = fmt(order.totalAmount);
    const bulkTotalFontSize =
      bulkTotalStr.length > 12 ? 9 : bulkTotalStr.length > 10 ? 10 : 11;
    doc.fontSize(bulkTotalFontSize).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("TOTAL:", totalsX, currentY);
    doc.text(bulkTotalStr, valueX, currentY, {
      width: totalsWidth,
      align: "right",
    });

    // ===== PAYMENT BREAKDOWN =====
    currentY += 40;
    doc.fontSize(10).fillColor(primaryColor).font("Helvetica-Bold");
    doc.text("PAYMENT BREAKDOWN", 55, currentY);
    doc
      .moveTo(55, currentY + 14)
      .lineTo(200, currentY + 14)
      .stroke(primaryColor);

    currentY += 25;
    doc.fontSize(9).fillColor(lightGray).font("Helvetica");

    // Prepaid
    const prepaidStatus =
      order.prepaidStatus === "PAID" ? "(PAID)" : "(PENDING)";
    const prepaidColor = order.prepaidStatus === "PAID" ? "#28a745" : "#dc3545";
    doc.text("Advance Payment:", 55, currentY);
    doc.fillColor(darkGray).text(fmt(order.prepaidAmount || 0), 160, currentY);
    doc
      .fillColor(prepaidColor)
      .font("Helvetica-Bold")
      .text(prepaidStatus, 250, currentY);
    currentY += 16;

    // Credit
    if (order.creditAmount > 0) {
      const creditStatus =
        order.creditStatus === "PAID" ? "(PAID)" : "(PENDING)";
      const creditColor = order.creditStatus === "PAID" ? "#28a745" : "#dc3545";
      doc
        .fillColor(lightGray)
        .font("Helvetica")
        .text("Credit Payment:", 55, currentY);
      doc.fillColor(darkGray).text(fmt(order.creditAmount || 0), 160, currentY);
      doc
        .fillColor(creditColor)
        .font("Helvetica-Bold")
        .text(creditStatus, 250, currentY);
    }

    // ===== TRACKING SECTION =====
    if (order.trackingId) {
      currentY += 30;
      doc.rect(40, currentY, pageWidth, 40).fill(bgLight).stroke("#e0e0e0");
      doc.fontSize(9).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text("SHIPPING DETAILS", 55, currentY + 8);
      doc.fontSize(9).fillColor(darkGray).font("Helvetica");
      doc.text(`Tracking ID: ${order.trackingId}`, 55, currentY + 24);
      doc.text(
        `Carrier: ${order.deliveryPartner || "N/A"}`,
        250,
        currentY + 24,
      );
      if (order.expectedDeliveryDate) {
        doc.text(`Expected: ${order.expectedDeliveryDate}`, 400, currentY + 24);
      }
    }

    // ===== FOOTER =====
    const footerY = 720;
    doc.moveTo(40, footerY).lineTo(555, footerY).stroke("#e0e0e0");

    doc.fontSize(12).fillColor(primaryColor).font("Helvetica-Bold");
    doc.text("Thank you for your business!", 40, footerY + 15, {
      align: "center",
      width: pageWidth,
    });

    doc.fontSize(9).fillColor(lightGray).font("Helvetica");
    doc.text("The Awla Company - Royal Way to Stay Healthy", 40, footerY + 35, {
      align: "center",
      width: pageWidth,
    });
    doc.text(
      "Email: orders@theawlacompany.com | Web: theawlacompany.com",
      40,
      footerY + 50,
      { align: "center", width: pageWidth },
    );

    doc.fontSize(7).fillColor("#999999");
    doc.text(
      "This is a computer-generated invoice and does not require a signature.",
      40,
      footerY + 70,
      { align: "center", width: pageWidth },
    );

    doc.end();
  });
}

export default { generateInvoicePDF, generateBulkInvoicePDF };
