

const express = require("express");
const router = express.Router();
const userController = require("../controller/user/userController");
const shopController = require("../controller/user/shopController");
const productController = require("../controller/admin/productController");
const {userAuth,preventAuthPages}= require("../middlewares/auth.js");
const orderController = require('../controller/user/orderController');
const addressController = require("../controller/user/addressController");
const cartController =require("../controller/user/cartController")
const wishlistController = require('../controller/user/wishlistController'); 
const checkoutController = require("../controller/user/checkoutController");
const paymentController = require("../controller/user/paymentController");

const passport = require("../config/passport.js");

router.get("/pageNotFound",userController.pageNotFound);


router.get('/', userController.loadlandingpage);
router.get('/home',userController.loadHomepage)
router.get('/signup', userController.loadSignup);  
router.post('/signup', userController.signup);  
router.post('/verify-otp', userController.conformOtp);
router.post("/resend-otp",userController.resendOtp);


router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
      console.log("Google login success:", req.user);
    res.redirect('/')
});

router.get("/login",preventAuthPages,userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",userController.logout);
router.get("/forgot-password", userController.loadForgotPassword); 
router.post("/forgot-password", userController.forgotPassword);   
router.post("/verify-reset-otp", userController.verifyResetOtp);
router.post("/reset-password", userController.resetPassword);


//shoppage//


// router.get("/shop/products/data",shopController.getProductsData);
// router.post("/shop/addProduct", shopController.addProducts);
router.get("/shop", shopController.loadShopPage);
router.get("/product/:id", shopController.loadProductDetails);
router.get("/shop/brand/:brandId", productController.getProductsByBrand);
router.get("/brands", productController.getAllBrands);


//
// PROFILE


router.get("/userprofile", userAuth, userController.loadProfilePage);
router.put("/profile/update", userAuth, userController.updateProfile);

// ===== ORDERS =====
// router.get("/place-order", userAuth, orderController.placeOrder);
// router.put("/user/cancel/:id", userAuth, orderController.cancelOrder);

// ===== ADDRESS =====
router.post("/address/add", userAuth, userController.addAddress);
router.get("/manage-address", userAuth, userController.loadManageAddressPage);

router.get("/add-address", userAuth, userController.loadAddAddressPage);


// EDIT ADDRESS
router.get("/edit-address/:id", userAuth, userController.loadEditAddressPage);
router.post("/address/edit/:id", userAuth, userController.updateAddress);

router.delete("/address/delete/:id", userAuth, userController.deleteAddress);

router.get("/cart", userAuth, cartController.loadCartPage);
router.post("/cart/add", userAuth, cartController.addToCart);

router.post("/cart/update", userAuth, cartController.updateCartItem);   
router.post("/cart/remove", userAuth, cartController.removeCartItem);   
router.get('/wishlist', userAuth, wishlistController.getWishlist);
router.post('/wishlist/add', userAuth, wishlistController.addToWishlist);
router.post('/wishlist/remove', userAuth, wishlistController.removeFromWishlist);
router.get("/checkout", userAuth, checkoutController.loadCheckoutPage);

// router.get("/payment", paymentController.loadPayment);
// router.post("/payment/place", paymentController.placeOrder);
// router.post("/select-address", checkoutController.selectAddress);

// router.get("/payment", paymentController.loadPayment);
// router.post("/payment", paymentController.placeOrder);
module.exports = router;


  

