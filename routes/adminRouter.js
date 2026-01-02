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


// router.delete("/deleteCategory/:id", categoryController.deleteCategory);
router.get("/editCategory/:id", categoryController.geteditCategory);
router.post("/editCategory", categoryController.postEditCategory)

router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
//Brand Management//
router.get("/brands", brandController.getBrandPage);
// router.post("/addBrand",adminAuth,brandController.addBrand);
router.patch("/blockBrand/:id", adminAuth, brandController.blockBrand);
router.patch("/unblockBrand/:id", adminAuth, brandController.unblockBrand);
// router.delete("/deleteBrand/:id", adminAuth, brandController.deleteBrand);
router.post("/addBrand", upload.single("brandImage"), adminAuth, brandController.addBrand);

//Product Management//
router.get("/addproducts", adminAuth, productController.getProductAddPage);
router.post("/addProduct", adminAuth, upload.array("images", 4), productController.addProducts);
// router.post("/addProduct", adminAuth, upload.any(), productController.addProducts);
router.get("/products",adminAuth, productController.getProductpage);
router.get("/products/data", adminAuth, productController.getProductsData);
router.delete("/products/:id", adminAuth, productController.deleteProduct);
router.get("/editproduct/:id", adminAuth, productController.getEditProductPage);
// router.post("/products/edit/:id", adminAuth, upload.any(), productController.updateProduct);
router.post("/products/edit/:id", adminAuth, upload.array("images", 4), productController.updateProduct)

router.post("/delete-product-image",adminAuth,productController.deleteImage);
router.get("/orders", adminAuth, adminController.loadOrders);
router.get('/orders/:id', adminAuth, adminController.viewOrderDetails);
router.post("/orders/status/:id", adminAuth, adminController.updateOrderStatus);


module.exports = router;


