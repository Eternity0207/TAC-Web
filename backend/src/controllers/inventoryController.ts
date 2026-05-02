import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { UserRole } from "../types";
import PDFDocument from "pdfkit";
import inventoryService, {
  InventoryBatch,
  InventoryStats,
} from "../services/inventoryService";
import * as productsService from "../services/productsService";

// Re-export interfaces for external use
export { InventoryBatch, InventoryStats };

// Helper to check admin access
function canManageInventory(req: AuthRequest): boolean {
  const role = req.user?.role;
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.ADMIN ||
    role === UserRole.HEAD_DISTRIBUTION
  );
}

function normalizePackagingKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

async function syncProductStockFromInventory(productId: string): Promise<void> {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) return;

  try {
    const [productRows, activeBatchResult] = await Promise.all([
      productsService.getAllProducts(),
      inventoryService.getAllBatches({
        productId: normalizedProductId,
        status: "ACTIVE",
      }),
    ]);

    if (!activeBatchResult.success) {
      throw new Error(activeBatchResult.message || "Failed to fetch inventory batches");
    }

    const product = (productRows || []).find((p: any) => {
      const pid = String(p?.id || "").trim();
      const pslug = String(p?.slug || "").trim();
      return pid === normalizedProductId || pslug === normalizedProductId;
    });

    if (!product) return;

    const activeBatches = activeBatchResult.data || [];
    const variantStockMap = new Map<string, number>();
    let totalRemaining = 0;

    for (const batch of activeBatches) {
      const qty = Math.max(0, Number(batch?.remainingQuantity || 0));
      const packagingKey = normalizePackagingKey(batch?.packaging);
      totalRemaining += qty;
      if (packagingKey) {
        variantStockMap.set(packagingKey, (variantStockMap.get(packagingKey) || 0) + qty);
      }
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const updatedVariants = variants.map((variant: any) => {
      const key = normalizePackagingKey(variant?.weight || variant?.variant || variant?.size);
      const variantQty = key ? variantStockMap.get(key) || 0 : 0;
      return {
        ...variant,
        stock: variantQty,
        stockQuantity: variantQty,
        stockStatus: variantQty <= 0 ? "OUT_OF_STOCK" : "IN_STOCK",
      };
    });

    await productsService.updateProduct(String(product.id), {
      variants: updatedVariants as any,
      stock: totalRemaining,
      stockQuantity: totalRemaining,
      stockStatus: totalRemaining <= 0 ? "OUT_OF_STOCK" : "IN_STOCK",
    } as any);
  } catch (error) {
    console.error("Inventory stock sync warning:", error);
  }
}

/**
 * Create a new inventory batch
 */
export async function createBatch(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const {
      productId,
      productName,
      packaging,
      quantity,
      mrp,
      mfgDate,
      expiryDate,
      notes,
    } = req.body;

    if (!productId || !productName || !packaging || !quantity || !mrp) {
      res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
      return;
    }

    const result = await inventoryService.createBatch({
      productId,
      productName,
      packaging,
      quantity: Number(quantity),
      remainingQuantity: Number(quantity),
      mrp: Number(mrp),
      mfgDate: mfgDate || new Date().toISOString().split("T")[0],
      expiryDate: expiryDate || "",
      notes: notes || "",
      createdBy: req.user?.email || req.user?.id || "",
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: result.data,
    });
    await syncProductStockFromInventory(String(result.data?.productId || productId));
  } catch (error: any) {
    console.error("Create batch error:", error);
    res.status(500).json({ success: false, message: "Failed to create batch" });
  }
}

/**
 * Get all inventory batches
 */
export async function getAllBatches(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { status, productId, productName } = req.query;

    const result = await inventoryService.getAllBatches({
      status: status as string,
      productId: productId as string,
      productName: productName as string,
    });

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    const batches = result.data || [];

    res.json({
      success: true,
      data: {
        batches,
        total: batches.length,
      },
    });
  } catch (error) {
    console.error("Get batches error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch batches" });
  }
}

/**
 * Get a single batch by ID
 */
export async function getBatchById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;

    const result = await inventoryService.getBatchById(id);

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Get batch by ID error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch batch" });
  }
}

/**
 * Get inventory statistics
 */
export async function getInventoryStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const result = await inventoryService.getInventoryStats();

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    // Transform stats to match frontend expectations
    const stats = result.data;
    if (stats) {
      res.json({
        success: true,
        data: {
          totalBatches: stats.totalBatches,
          totalQuantity: stats.totalQuantity,
          activeQuantity: stats.totalRemainingQuantity,
          totalValue: stats.totalValue,
          activeBatches: stats.activeBatches,
          depletedBatches: stats.depletedBatches,
          expiredBatches: stats.expiredBatches,
          expiringSoonBatches: stats.expiringSoonBatches,
          productBreakdown: stats.productBreakdown.map((p) => ({
            productName: p.productName,
            packaging: p.packaging,
            quantity: p.remainingQuantity,
            value: p.totalValue,
          })),
          recentBatches: [], // Fetched separately if needed
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          totalBatches: 0,
          totalQuantity: 0,
          activeQuantity: 0,
          totalValue: 0,
          productBreakdown: [],
          recentBatches: [],
        },
      });
    }
  } catch (error) {
    console.error("Get inventory stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
}

/**
 * Update batch
 */
export async function updateBatch(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const updates = req.body;
    const existing = await inventoryService.getBatchById(id);

    const result = await inventoryService.updateBatch(id, updates);

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.json({
      success: true,
      message: "Batch updated successfully",
      data: result.data,
    });
    const oldProductId = String(existing.data?.productId || "").trim();
    const newProductId = String(result.data?.productId || oldProductId).trim();
    if (oldProductId) await syncProductStockFromInventory(oldProductId);
    if (newProductId && newProductId !== oldProductId) {
      await syncProductStockFromInventory(newProductId);
    }
  } catch (error) {
    console.error("Update batch error:", error);
    res.status(500).json({ success: false, message: "Failed to update batch" });
  }
}

/**
 * Delete a batch
 */
export async function deleteBatch(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { id } = req.params;
    const existing = await inventoryService.getBatchById(id);

    const result = await inventoryService.deleteBatch(id);

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.json({
      success: true,
      message: "Batch deleted successfully",
    });
    await syncProductStockFromInventory(String(existing.data?.productId || ""));
  } catch (error) {
    console.error("Delete batch error:", error);
    res.status(500).json({ success: false, message: "Failed to delete batch" });
  }
}

/**
 * Get low stock batches
 */
export async function getLowStockBatches(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const threshold = req.query.threshold
      ? Number(req.query.threshold)
      : undefined;

    const result = await inventoryService.getLowStockBatches(threshold);

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error("Get low stock batches error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch low stock batches" });
  }
}

/**
 * Get expiring soon batches
 */
export async function getExpiringSoonBatches(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const days = req.query.days ? Number(req.query.days) : undefined;

    const result = await inventoryService.getExpiringSoonBatches(days);

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error("Get expiring soon batches error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expiring batches",
    });
  }
}

/**
 * Generate batch labels PDF
 */
export async function generateBatchLabelsPDF(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const { batchId } = req.params;
    const {
      paperSize = "A4",
      labelsPerRow = 3,
      labelCount: requestedCount,
      shelfLife = "9 months",
    } = req.query;

    // Fetch batch from Google Sheets
    const batchResult = await inventoryService.getBatchById(batchId);
    if (!batchResult.success || !batchResult.data) {
      res.status(404).json({ success: false, message: "Batch not found" });
      return;
    }

    const batch = batchResult.data;

    // Paper sizes in points (72 points = 1 inch)
    const paperSizes: Record<string, { width: number; height: number }> = {
      A4: { width: 595.28, height: 841.89 },
      A5: { width: 419.53, height: 595.28 },
      Letter: { width: 612, height: 792 },
    };

    const paper = paperSizes[paperSize as string] || paperSizes.A4;
    const margin = 20;
    const cols = Number(labelsPerRow) || 4;
    const gapX = 8;
    const gapY = 8;
    const labelWidth = (paper.width - margin * 2 - (cols - 1) * gapX) / cols;
    // Reduced label height for simpler content
    const labelHeightPt = 45;

    // Create PDF
    const doc = new PDFDocument({
      size: [paper.width, paper.height],
      margins: { top: margin, bottom: margin, left: margin, right: margin },
    });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Labels-${batch.batchNumber}.pdf"`
    );

    doc.pipe(res);

    // Format dates
    const mfgDateFormatted = batch.mfgDate
      ? new Date(batch.mfgDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

    // All text in black
    const textBlack = "#000000";

    // Generate labels based on remaining quantity or requested count
    const totalLabels = requestedCount
      ? Number(requestedCount)
      : batch.remainingQuantity || batch.quantity;

    // Calculate rows per page
    const rowsPerPage = Math.floor(
      (paper.height - margin * 2) / (labelHeightPt + gapY)
    );
    const labelsPerPage = rowsPerPage * cols;

    let labelIndex = 0;

    while (labelIndex < totalLabels) {
      // Add new page if not the first page
      if (labelIndex > 0 && labelIndex % labelsPerPage === 0) {
        doc.addPage();
      }

      // Calculate position within current page
      const positionOnPage = labelIndex % labelsPerPage;
      const row = Math.floor(positionOnPage / cols);
      const col = positionOnPage % cols;

      const currentX = margin + col * (labelWidth + gapX);
      const currentY = margin + row * (labelHeightPt + gapY);

      // Draw label border with light dashed lines for cutting
      doc
        .strokeColor("#b0b0b0")
        .lineWidth(0.5)
        .dash(3, { space: 2 })
        .rect(currentX, currentY, labelWidth, labelHeightPt)
        .stroke()
        .undash();

      // Label content with fixed positions
      const padding = 6;
      const contentWidth = labelWidth - padding * 2;
      const leftX = currentX + padding;
      let lineY = currentY + padding;

      // Line 1: Batch No.
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(textBlack)
        .text("Batch No.: ", leftX, lineY, { continued: true });
      doc.font("Helvetica").text(batch.batchNumber);
      lineY += 12;

      // Line 2: Mfg Date
      if (mfgDateFormatted) {
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("Mfg Date: ", leftX, lineY, { continued: true });
        doc.font("Helvetica").text(mfgDateFormatted);
      }

      labelIndex++;
    }

    doc.end();
  } catch (error) {
    console.error("Generate labels PDF error:", error);
    res.status(500).json({ success: false, message: "Failed to generate PDF" });
  }
}

/**
 * Generate inventory report PDF
 */
export async function generateInventoryReportPDF(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!canManageInventory(req)) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    // Fetch batches from Google Sheets
    const batchesResult = await inventoryService.getAllBatches({
      status: "ACTIVE",
    });
    const activeBatches = batchesResult.data || [];

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Inventory-Report-${
        new Date().toISOString().split("T")[0]
      }.pdf"`
    );

    doc.pipe(res);

    // Title
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#2d5016")
      .text("THE AWLA COMPANY", { align: "center" });

    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#333333")
      .text("Inventory Report", { align: "center" });

    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, {
        align: "center",
      });

    doc.moveDown(2);

    // Summary stats
    const totalValue = activeBatches.reduce(
      (sum, b) => sum + (b.remainingQuantity || b.quantity) * b.mrp,
      0
    );
    const totalQuantity = activeBatches.reduce(
      (sum, b) => sum + (b.remainingQuantity || b.quantity),
      0
    );

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text("Summary", 50);

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Total Active Batches: ${activeBatches.length}`);
    doc.text(`Total Active Quantity: ${totalQuantity} units`);
    doc.text(`Total Inventory Value: ₹${totalValue.toLocaleString("en-IN")}`);

    doc.moveDown(1.5);

    // Batch table header
    doc.fontSize(12).font("Helvetica-Bold").text("Batch Details", 50);

    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidths = [80, 120, 60, 50, 60, 60, 60];
    const headers = ["Batch #", "Product", "Pkg", "Qty", "MRP", "MFG", "EXP"];

    // Header row
    doc.fontSize(8).font("Helvetica-Bold");
    let x = 50;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i] });
      x += colWidths[i];
    });

    doc
      .moveTo(50, tableTop + 12)
      .lineTo(545, tableTop + 12)
      .stroke("#cccccc");

    // Data rows
    let y = tableTop + 18;
    doc.fontSize(7).font("Helvetica");

    for (const batch of activeBatches) {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      x = 50;
      const row = [
        batch.batchNumber,
        batch.productName,
        batch.packaging,
        (batch.remainingQuantity || batch.quantity).toString(),
        `₹${batch.mrp}`,
        batch.mfgDate
          ? new Date(batch.mfgDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })
          : "-",
        batch.expiryDate
          ? new Date(batch.expiryDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })
          : "-",
      ];

      row.forEach((cell, i) => {
        doc.text(cell, x, y, { width: colWidths[i] });
        x += colWidths[i];
      });

      y += 14;
    }

    doc.end();
  } catch (error) {
    console.error("Generate inventory report error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate report" });
  }
}

export default {
  createBatch,
  getAllBatches,
  getBatchById,
  getInventoryStats,
  updateBatch,
  deleteBatch,
  getLowStockBatches,
  getExpiringSoonBatches,
  generateBatchLabelsPDF,
  generateInventoryReportPDF,
};
