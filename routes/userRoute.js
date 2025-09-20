

const express = require("express");
const router = express.Router();
const userController = require("../controller/user/userController.js");
const passport = require("../config/passport.js");

router.get("/pageNotFound",userController.pageNotFound);


router.get('/', userController.loadHomepage);
router.get('/signup', userController.loadSignup);  
router.post('/signup', userController.signup);  
router.post('/verify-otp', userController.conformOtp);
router.post("/resend-otp",userController.resendOtp);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
      console.log("✅ Google login success:", req.user);
    res.redirect('/')
});

router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",userController.logout);
router.get("/forgot-password", userController.loadForgotPassword); 
router.post("/forgot-password", userController.forgotPassword);   
router.post("/verify-reset-otp", userController.verifyResetOtp);
router.post("/reset-password", userController.resetPassword);



module.exports = router;


  