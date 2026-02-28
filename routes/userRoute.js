

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

const walletController = require("../controller/user/walletController");
const profileController = require("../controller/user/profileController")
const userCouponController = require('../controller/user/userCouponController');


const upload = require("../middlewares/imageUppload");

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
    req.session.user = req.user;
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


router.get("/shop", shopController.loadShopPage);
router.get("/product/:id", shopController.loadProductDetails);
router.get("/shop/brand/:brandId", productController.getProductsByBrand);
router.get("/brands", productController.getAllBrands);



router.get("/userprofile", userAuth, userController.loadProfilePage);
router.put("/profile/update", userAuth, userController.updateProfile);

router.post("/address/add", userAuth, userController.addAddress);

router.get( "/manage-address",userAuth, userController.loadManageAddressPage);

router.get("/add-address", userAuth, userController.loadAddAddressPage);
router.get("/add-address-profile", userAuth, userController.loadAddAddressPageProfile);


router.post( "/profile/address/add", userAuth, addressController.addAddressFromProfile);

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



router.post("/checkout/select-address", checkoutController.selectAddress);


// router.get("/checkout/payment", paymentController.loadPayment);
router.get("/checkout/payment", userAuth, paymentController.loadPayment);
router.post("/checkout/payment/place", orderController.placeOrder);
router.get("/order-success", paymentController.loadOrderSuccess);

router.get("/orders", userAuth, orderController.loadOrders);
router.post("/place-order", userAuth, orderController.placeOrder);
router.put("/user/cancel/:id", userAuth, orderController.cancelOrder);

router.get("/orders/:id", userAuth, orderController.loadOrderDetails);
router.put("/profile/upload-image",userAuth,upload.single("profileImage"),userController.updateProfileImage);
router.put("/orders/cancel-product",userAuth,orderController.cancelSingleProduct);
router.put("/orders/return/:id",userAuth,orderController.returnOrder);
router.put("/orders/return-product",userAuth,orderController.returnSingleProduct);


router.get("/orders/invoice/:id",userAuth,orderController.downloadInvoice);



router.get( "/userprofile/privacy-security", userAuth, profileController.loadPrivacySecurity);

router.post("/userprofile/change-password",userAuth,profileController.changePassword);

router.post("/userprofile/change-email", userAuth, profileController.changeEmail);

router.post( "/userprofile/verify-email", userAuth, profileController.verifyEmail);
router.put("/profile/update", profileController.updateProfile);
router.post("/wishlist/toggle", userAuth, wishlistController.toggleWishlist);
router.post('/wishlist/remove', userAuth, wishlistController.removeFromWishlist);
router.get("/order-failed",paymentController.loadOrderFailed)


router.post("/apply-coupon", userAuth, userCouponController.applyCoupon);
router.post("/remove-coupon", userAuth, userCouponController.removeCoupon);


router.get("/wallet", walletController.loadWallet);
router.post("/wallet/create-order", walletController.createWalletOrder);
router.post("/wallet/add", walletController.addMoneyToWallet);

module.exports = router;

