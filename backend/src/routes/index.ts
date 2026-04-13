import { Router, Request, Response } from "express";
import multer from "multer";
import {
  authMiddleware,
  authorize,
  n8nWebhookAuth,
  AuthRequest,
} from "../middleware/auth";
import { UserRole } from "../types";

// Controller imports
import * as authController from "../controllers/authController";
import * as orderController from "../controllers/orderController";
import * as webhookController from "../controllers/webhookController";
import * as userController from "../controllers/userController";
import * as reviewController from "../controllers/reviewController";
import * as configController from "../controllers/configController";
import * as bulkOrderController from "../controllers/bulkOrderController";
import * as salesController from "../controllers/salesController";
import * as inventoryController from "../controllers/inventoryController";
import * as analyticsController from "../controllers/analyticsController";
import * as bulkCustomerController from "../controllers/bulkCustomerController";
import * as couponController from "../controllers/couponController";
import * as launchController from "../controllers/launchController";
import * as careerController from "../controllers/careerController";
import * as internController from "../controllers/internController";
import * as credentialController from "../controllers/credentialController";
import * as tagController from "../controllers/tagController";
import * as productController from "../controllers/productController";
import * as socialMediaController from "../controllers/socialMediaController";

const router = Router();

const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

// =============================================
// Health Check
// =============================================
router.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    name: "Unified Order Management System API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      base: "/api"
    }
  });
});

router.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Unified OMS API running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// =============================================
// Public Routes (No Authentication Required)
// =============================================

// Auth Routes
router.post("/auth/init", authController.initAdmin);
router.post("/auth/login", authController.login);

// Orders - Public
router.post("/orders", orderController.createOrder);
router.post("/orders/landing", orderController.createOrderFromLanding);
router.get("/orders/:id/qr", orderController.getOrderQR);
router.get("/staff", userController.getStaffList);

// Reviews - Public
router.post("/reviews", reviewController.submitReview);
router.get("/reviews", reviewController.getApprovedReviews);
router.get("/reviews/photo/:id", reviewController.getReviewPhoto);

// Coupons - Public
router.post("/coupons/validate", couponController.validate);
router.post("/coupons/apply", couponController.apply);
router.get("/coupons/public", couponController.getValidCoupons);

// Products - Public
router.get("/products/public", productController.getPublicProducts);
router.get("/products/public/:slug", productController.getProductBySlug);

// Bulk Enquiry - Public (no auth required)
router.post("/enquiry/bulk", bulkOrderController.createBulkEnquiry);

// Public payment pages (no auth - for customer access)
router.get("/pay/bulk/:id", bulkOrderController.renderPaymentPage);

// =============================================
// Payment Routes
// =============================================
// router.get("/pay/bulk/:id", orderController.getBulkPaymentPage);
// router.post("/pay/bulk/:id/payu", orderController.processBulkPayUPayment);
// router.post("/pay/bulk/:id/upi", orderController.processBulkUPIPayment);

// =============================================
// Webhook Routes (Special Authentication)
// =============================================
router.post("/webhooks/payment", n8nWebhookAuth, webhookController.n8nPaymentWebhook);
router.post("/webhooks/payu/callback", webhookController.payuPaymentCallback);
router.post("/webhooks/payu/webhook", webhookController.payuWebhookHandler);
router.post("/webhooks/payu/bulk-callback", webhookController.payuBulkOrderCallback);
router.post("/webhooks/payu/bulk-webhook", webhookController.payuBulkOrderWebhook);
router.get("/webhooks/health", webhookController.webhookHealthCheck);
router.post("/webhooks/inventory", n8nWebhookAuth, inventoryController.updateBatch);

// =============================================
// Protected Routes (Authentication Required)
// =============================================

// Orders Management
router.get("/orders", authMiddleware, orderController.getAllOrders);
router.get("/orders/search", authMiddleware, orderController.searchOrders);
router.get("/orders/delivery-receipts", authMiddleware, orderController.getDeliveryReceipts);
router.get("/orders/:id", authMiddleware, orderController.getOrderById);
router.put("/orders/:id", authMiddleware, orderController.updateOrder);
router.put("/orders/:id/status", authMiddleware, orderController.updateOrderStatus);
router.put("/orders/:id/payment", authMiddleware, orderController.updatePaymentStatus);
router.put("/orders/:id/tracking", authMiddleware, orderController.updateTracking);
router.put("/orders/:id/cancel", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), orderController.cancelOrder);
router.put("/orders/:id/mark-delivered", authMiddleware, orderController.markDelivered);
router.get("/orders/:id/invoice", authMiddleware, orderController.downloadInvoice);
router.get("/orders/:id/shipping-label", authMiddleware, orderController.downloadShippingLabel);
router.post("/orders/:id/email-invoice", authMiddleware, orderController.emailInvoice);
router.post("/orders/:id/share-qr", authMiddleware, orderController.shareQR);
router.post("/orders/:id/upload-screenshot", authMiddleware, orderController.uploadPaymentScreenshot);
router.post("/orders/:id/upload-delivery-receipt", authMiddleware, orderController.uploadDeliveryReceipt);
router.delete("/orders/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), orderController.cancelOrder);

// User Management
router.get("/users", authMiddleware, userController.getAllUsers);
router.get("/users/:id", authMiddleware, userController.getUserById);
router.post("/users", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.createUser);
router.put("/users/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.updateUser);
router.put("/users/:id/deactivate", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.deactivateUser);
router.put("/users/:id/activate", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.activateUser);
router.put("/users/:userId/targets", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), salesController.setUserTargets);
router.get("/users/team/:managerId", authMiddleware, userController.getTeamMembers);
router.get("/users/team", authMiddleware, userController.getTeamMembers);
router.delete("/users/:id", authMiddleware, authorize(UserRole.SUPER_ADMIN), userController.deleteUser);
router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);
router.post(
  "/profile/photo",
  authMiddleware,
  profilePhotoUpload.single("photo"),
  userController.uploadProfilePhoto
);
router.put("/profile/password", authMiddleware, userController.changePassword);

// Dashboard & Analytics
router.get("/dashboard", authMiddleware, analyticsController.getDashboardStats);
router.get("/dashboard/stats", authMiddleware, analyticsController.getDashboardStats); // Fix for admin panel
router.get("/analytics/orders", authMiddleware, analyticsController.getOrderAnalytics);
router.get("/analytics/sales", authMiddleware, analyticsController.getSalesAnalytics);
router.get("/analytics/revenue", authMiddleware, analyticsController.getRevenueAnalytics);

// Bulk Orders
router.get("/bulk-orders", authMiddleware, bulkOrderController.getBulkOrders);
router.get("/bulk-orders/stats", authMiddleware, bulkOrderController.getBulkOrderStatsController); // Fix for admin panel
router.post("/bulk-orders", authMiddleware, bulkOrderController.createBulkOrder);
router.get("/bulk-orders/:id", authMiddleware, bulkOrderController.getBulkOrderByIdController);
router.put("/bulk-orders/:id", authMiddleware, bulkOrderController.updateBulkOrder);
router.put("/bulk-orders/:id/tracking", authMiddleware, bulkOrderController.addBulkOrderTracking);
router.put("/bulk-orders/:id/ship", authMiddleware, bulkOrderController.markBulkOrderShipped);
router.put("/bulk-orders/:id/deliver", authMiddleware, bulkOrderController.markBulkOrderDelivered);
router.put("/bulk-orders/:id/cancel", authMiddleware, bulkOrderController.cancelBulkOrder);
router.post("/bulk-orders/:id/initiate-payment", authMiddleware, bulkOrderController.initiatePayment);
router.post("/bulk-orders/:id/mark-paid", authMiddleware, bulkOrderController.markPaymentPaid);
router.get("/bulk-orders/:id/invoice", authMiddleware, bulkOrderController.downloadBulkInvoice);
router.post("/bulk-orders/:id/email-invoice", authMiddleware, bulkOrderController.emailBulkInvoice);
router.get("/bulk-orders/:id/payment-qr", authMiddleware, bulkOrderController.getPaymentQR);
router.get("/bulk-orders/:id/payu-checkout", authMiddleware, bulkOrderController.getPayUCheckout);
router.post("/bulk-orders/:id/delivery-receipt", authMiddleware, bulkOrderController.uploadBulkDeliveryReceipt);
router.delete("/bulk-orders/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), bulkOrderController.cancelBulkOrder);

// Bulk Customers
router.get("/bulk-customers", authMiddleware, bulkCustomerController.getAll);
router.post("/bulk-customers", authMiddleware, bulkCustomerController.create);
router.get("/bulk-customers/:id", authMiddleware, bulkCustomerController.getAll);
router.put("/bulk-customers/:id", authMiddleware, bulkCustomerController.update);
router.delete("/bulk-customers/:id", authMiddleware, bulkCustomerController.remove);

// Sales Management
router.get("/sales", authMiddleware, salesController.getAllSales);
router.get("/sales/all-stats", authMiddleware, salesController.getAllUserStats); // Fix for admin panel
router.get("/sales/my-stats", authMiddleware, salesController.getMyReferralStats);
router.get("/sales/my-orders", authMiddleware, salesController.getMyOrders);
router.get("/sales/team-stats", authMiddleware, salesController.getTeamStats);
router.get("/sales/sku-breakdown/:userId", authMiddleware, salesController.getSKUSalesData);
router.get("/sales/performance", authMiddleware, salesController.getSalesPerformance);
router.get("/sales/targets", authMiddleware, salesController.getSalesTargets);
router.put("/sales/targets", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), salesController.updateSalesTargets);
router.get("/sales/enquiries", authMiddleware, salesController.getSalesEnquiries);
router.post("/sales/enquiries", authMiddleware, salesController.createSalesEnquiry);
router.put("/sales/enquiries/:id", authMiddleware, salesController.updateSalesEnquiry);
router.delete("/sales/enquiries/:id", authMiddleware, salesController.deleteSalesEnquiry);

// Inventory Management
router.get("/inventory", authMiddleware, inventoryController.getAllBatches);
router.get("/inventory/batches", authMiddleware, inventoryController.getAllBatches);
router.get("/inventory/stats", authMiddleware, inventoryController.getInventoryStats);
router.get("/inventory/low-stock", authMiddleware, inventoryController.getLowStockBatches);
router.get("/inventory/expiring-soon", authMiddleware, inventoryController.getExpiringSoonBatches);
router.post("/inventory/batches", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), inventoryController.createBatch);
router.get("/inventory/batches/:id", authMiddleware, inventoryController.getBatchById);
router.put("/inventory/batches/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), inventoryController.updateBatch);
router.delete("/inventory/batches/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), inventoryController.deleteBatch);
router.get("/inventory/batches/:batchId/labels", authMiddleware, inventoryController.generateBatchLabelsPDF);
router.get("/inventory/report", authMiddleware, inventoryController.generateInventoryReportPDF);
router.put("/inventory/:skuId", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), inventoryController.updateBatch);

// Product Management
router.get("/products", authMiddleware, productController.getAllProducts);
router.get("/products/all", authMiddleware, productController.getAllProducts); // Backward compatibility for admin bundle
router.post("/products", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), productController.createProduct);
router.put("/products/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), productController.updateProduct);
router.delete("/products/:id", authMiddleware, authorize(UserRole.SUPER_ADMIN), productController.deleteProduct);

// Reviews Management
router.get("/reviews/all", authMiddleware, reviewController.getAllReviews); // Fix for admin panel
router.get("/admin/reviews", authMiddleware, reviewController.getAllReviews);
router.put("/reviews/:id/status", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), reviewController.updateReviewStatus);
router.put("/admin/reviews/:id/approve", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), reviewController.approveReview);
router.put("/admin/reviews/:id/reject", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), reviewController.rejectReview);
router.delete("/reviews/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), reviewController.deleteReview);
router.delete("/admin/reviews/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), reviewController.deleteReview);

// Configuration Management
router.get("/config/bulk-pricing", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), configController.getBulkPricingConfig);
router.put("/config/bulk-pricing", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), configController.updateBulkPricingConfig);
router.get("/config/packaging", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), configController.getPackagingConfig);
router.put("/config/packaging", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), configController.updatePackagingConfig);
router.get("/skus", authMiddleware, configController.getSKUs);
router.put("/skus/:skuId/pricing", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), configController.updateSKUPricing);
router.post("/bulk-orders/preview-price", authMiddleware, configController.previewBulkPrice);
// router.get("/config", authMiddleware, configController.getConfig);
// router.put("/config", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), configController.updateConfig);
// router.get("/settings", authMiddleware, configController.getSettings);
// router.put("/settings", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), configController.updateSettings);

// Coupon Management
router.get("/coupons", authMiddleware, couponController.getAll);
router.post("/coupons", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), couponController.create);
router.put("/coupons/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), couponController.update);
router.delete("/coupons/:id", authMiddleware, authorize(UserRole.SUPER_ADMIN), couponController.remove);

// Career Management
router.get("/careers", authMiddleware, careerController.getAllCareers);
router.post("/careers", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), careerController.createCareer);
router.get("/applications", authMiddleware, careerController.getAllApplications);

// Intern Management
router.get("/interns/reports", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), internController.getDailyReports);
router.post("/interns/reports", authMiddleware, internController.submitDailyReport);
// router.get("/interns", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), internController.getAllInterns);

// Credentials Management
router.get("/credentials", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), credentialController.getAll);
router.post("/credentials", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), credentialController.create);
router.put("/credentials/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), credentialController.update);
router.delete("/credentials/:id", authMiddleware, authorize(UserRole.SUPER_ADMIN), credentialController.remove);

// Tags Management
router.get("/tags", authMiddleware, tagController.getAllTags);
router.post("/tags", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), tagController.createTag);
router.put("/tags/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), tagController.updateTag);
router.delete("/tags/:id", authMiddleware, authorize(UserRole.SUPER_ADMIN), tagController.deleteTag);

// Social Media Analytics
router.get("/social-media", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TECHNICAL_ANALYST), socialMediaController.getSocialMediaAnalytics);

// Launch Management
router.get("/launches", authMiddleware, launchController.getAllLaunches);
router.post("/launches", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), launchController.createLaunch);

// Unit Economics (Competitor Analysis)
router.get("/unit-economics", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TECHNICAL_ANALYST), analyticsController.getUnitEconomics);

// Team Management & Performance
router.get("/team/distribution", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), analyticsController.getTeamDistribution);
router.get("/team/performance", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), analyticsController.getTeamPerformance);
router.get("/team/earnings", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), analyticsController.getTeamEarnings);

// SKU Management
// router.get("/skus", authMiddleware, productController.getAllSKUs);
// router.post("/skus", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), productController.createSKU);
// router.put("/skus/:id", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), productController.updateSKU);
// router.delete("/skus/:id", authMiddleware, authorize(UserRole.SUPER_ADMIN), productController.deleteSKU);

// Wholesale SKU Management
// router.get("/wholesale-skus", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), productController.getWholesaleSKUs);

// Commission Settings
// router.get("/commission-settings", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), configController.getCommissionSettings);
// router.put("/commission-settings", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), configController.updateCommissionSettings);

// Monthly Targets
router.get("/monthly-targets", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), salesController.getMonthlyTargets);
router.put("/monthly-targets", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), salesController.updateMonthlyTargets);

// Upcoming Products
// router.get("/upcoming-products", authMiddleware, productController.getUpcomingProducts);
// router.post("/upcoming-products", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), productController.createUpcomingProduct);

// Bulk Enquiries Administration
router.get("/bulk-enquiries", authMiddleware, bulkOrderController.getBulkEnquiries);
// router.post("/bulk-enquiries", authMiddleware, bulkOrderController.createBulkEnquiry);

// Video Reviews & WhatsApp Reviews
router.get("/video-reviews", authMiddleware, reviewController.getVideoReviews);
router.get("/whatsapp-reviews", authMiddleware, reviewController.getWhatsAppReviews);

// Production Videos
// router.get("/production-videos", authMiddleware, productController.getProductionVideos);
// router.post("/production-videos", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), productController.createProductionVideo);

// Staff Management
router.get("/staff/list", authMiddleware, userController.getStaffList);
router.get("/staff/performance", authMiddleware, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEAD_DISTRIBUTION), userController.getStaffPerformance);

// =============================================
// Catch-all for undefined routes
// =============================================
router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.path,
    method: req.method
  });
});

export default router;