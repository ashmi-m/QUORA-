const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin/adminController.js");
const customerController = require("../controller/admin/customerController");
const categoryController = require("../controller/admin/categoryController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const multer = require("multer");
const brandController = require("../controller/admin/brandController");
const upload = require("../middlewares/imageUppload.js");
const productController = require("../controller/admin/productController");
const orderController = require("../controller/user/orderController");
const couponController = require("../controller/admin/couponController");
const salesReportController = require("../controller/admin/salesReportController.js");

router.get("/pageerror", adminController.pageerror);
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);
router.get("/user", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);
router.get("/categories", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);

router.get("/editCategory/:id", categoryController.geteditCategory);
router.put("/editCategory/:id", categoryController.postEditCategory);

router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.patch("/toggleCategoryStatus/:id", adminAuth, categoryController.toggleCategoryStatus);
//Brand Management//
router.get("/brands", brandController.getBrandPage);

router.patch("/blockBrand/:id", adminAuth, brandController.blockBrand);
router.patch("/unblockBrand/:id", adminAuth, brandController.unblockBrand);
// router.delete("/deleteBrand/:id", adminAuth, brandController.deleteBrand);
router.post("/addBrand", upload.single("brandImage"), adminAuth, brandController.addBrand);

//Product Management//
router.get("/addproducts", adminAuth, productController.getProductAddPage);
router.post("/addProduct", adminAuth, upload.array("images", 4), productController.addProducts);

router.get("/products", adminAuth, productController.getProductpage);
router.get("/products/data", adminAuth, productController.getProductsData);

router.get("/editproduct/:id", adminAuth, productController.getEditProductPage);

router.post("/products/edit/:id", adminAuth, upload.array("images", 4), productController.updateProduct)

router.post("/delete-product-image", adminAuth, productController.deleteImage);
router.get("/orders", adminAuth, adminController.loadOrders);
router.get('/orders/:id', adminAuth, adminController.viewOrderDetails);
router.post("/orders/status/:id", adminAuth, adminController.updateOrderStatus);

router.post("/orders/:id/product/:index/status", adminAuth, adminController.updateProductStatus);


router.get("/orders/:id/json", adminAuth, adminController.getOrderDetailsJson);

router.post("/orders/:id/product/:index/return", adminAuth, adminController.requestReturn);
router.post("/orders/:id/product/:index/return-approve", adminAuth, adminController.approveReturn);
router.post("/orders/:id/product/:index/return-reject", adminAuth, adminController.rejectReturn);
router.patch("/products/toggle-block/:id", productController.toggleProductBlock);



// Coupon Management



router.get("/coupons", adminAuth, couponController.getCouponPage);

router.post("/coupons/add", adminAuth, couponController.addCoupon);

router.post("/coupons/toggle/:id", adminAuth, couponController.toggleCoupon);

router.post("/coupons/edit/:id", adminAuth, couponController.updateCoupon);

router.delete("/coupons/:id", adminAuth, couponController.deleteCoupon);
router.post("/products/offer/:id", adminAuth, productController.addProductOffer);
router.delete("/products/offer/:id", adminAuth, productController.removeProductOffer);

router.post("/category/offer/:id", adminAuth, categoryController.addCategoryOffer);
router.delete("/category/offer/:id", adminAuth, categoryController.removeCategoryOffer);

router.get("/sales-report", adminAuth, salesReportController.loadSalesReport);
router.get("/export-pdf", adminAuth, salesReportController.exportPdf);
router.get("/export-excel", adminAuth, salesReportController.exportExcel);

router.get("/dashboard-chart", adminController.getDashboardChart);
router.get("/dashboard-stats", adminController.getDashboardStats);
router.get("/top-products", adminController.getTopProducts);
router.get("/top-categories", adminController.getTopCategories);
router.get("/top-brands", adminController.getTopBrands);
module.exports = router;


