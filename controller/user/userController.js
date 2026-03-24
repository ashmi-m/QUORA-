const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Address = require("../../models/addressSchema");
const mongoose = require("mongoose");
const { creditWallet } = require("./walletController");

const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");

const loadHomepage = async (req, res) => {
  try {
    const products = await Product.find({ isBlocked: false })
  .sort({ createdAt: -1 })
  .limit(4)
  .lean();
    let wishlistIds = [];
    let cartCount = 0;
    if (req.session.user) {
      const wishlist = await Wishlist.findOne({ userId: req.session.user._id }).lean();
      if (wishlist && wishlist.items) {
        wishlistIds = wishlist.items.map(item => item.productId.toString());
      }
      const cart = await Cart.findOne({ userId: req.session.user._id }).lean();
      if (cart && cart.items) {
        cartCount = cart.items.length;
      }
    }
    res.render("home", {
      products,
      user: req.session.user || null,
      wishlistIds,
      cartCount
    });

  } catch (error) {
    console.error("Error loading homepage:", error);
    res.redirect("/pageNotFound");
  }
};

const loadlandingpage = async (req, res) => {
  try {
    const products = await Product.find({ isBlocked: false })
  .sort({ createdAt: -1 })
  .limit(4)
  .lean();

    let cart = null;
    let cartCount = 0;
    let wishlistIds = [];

    if (req.session.user) {

      cart = await Cart.findOne({ userId: req.session.user._id })
        .populate("items.productId")
        .lean();

      if (cart && cart.items) {
        cartCount = cart.items.length;
      }
      const wishlist = await Wishlist.findOne({
        userId: req.session.user._id
      }).lean();

      if (wishlist && wishlist.items) {
        wishlistIds = wishlist.items.map(item =>
          item.productId.toString()
        );
      }
    }

    res.render("home", {
      products,
      user: req.session.user || null,
      cart,
      cartCount,
      wishlistIds
    });

  } catch (error) {
    console.log("Error in landing page:", error);
    res.redirect("/pageNotFound");
  }
};
const pageNotFound = (req, res) => {
  res.status(404).render("page 404");
};

const loadSignup = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect('/');
    }
    return res.render("signup");
  } catch (error) {
    console.log("Signup page not found", error);
    res.status(500).send("Server error");
  }
};
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`
    });

    return info.accepted.length > 0;

  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}
function generateRefCode(name) {
  const prefix = name.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return prefix + random;
}

const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, refCode } = req.body;

    if (password !== confirmPassword) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", { message: "User already exists" });
    }

    const otp = generateOtp();
    console.log("🟢 Generated OTP for", email, "is:", otp);

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.render("signup", { message: "Failed to send OTP" });
    }

    req.session.userOtp = otp;
    req.session.userOtpExpiry = Date.now() + 1 * 30 * 1000;
    req.session.userData = {
      name,
      email,
      phone,
      password,
      referredBy: refCode || null
    };

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.render("signup", { message: "Something went wrong. Please try again." });
      }
      return res.render("conformOtp");  
    });

  } catch (error) {
    console.error(error);
    res.render("signup", { message: "Something went wrong" });
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    return passwordHash;
  } catch (error) {

  }
}
const conformOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.userOtp || !req.session.userOtpExpiry || Date.now() > req.session.userOtpExpiry) {
      delete req.session.userOtp;
      delete req.session.userOtpExpiry;
      // delete req.session.userData;
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please signup again"
      });
    }

    if (String(otp) === String(req.session.userOtp)) {
      const user = req.session.userData;

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Session expired. Please signup again"
        });
      }

      const passwordHash = await securePassword(user.password);

      let newRefCode;
      let isUnique = false;
      while (!isUnique) {
        newRefCode = generateRefCode(user.name);
        const exists = await User.findOne({ refCode: newRefCode });
        if (!exists) isUnique = true;
      }

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        refCode: newRefCode,
        referredBy: user.referredBy || null,
        wallet: 0
      });

      await saveUserData.save();

      if (user.referredBy) {
        const referrer = await User.findOne({ refCode: user.referredBy });
        if (referrer && referrer._id.toString() !== saveUserData._id.toString()) {
          await creditWallet(referrer._id, 50, `Referral bonus for ${user.name} joining`);
        }
      }

      req.session.user = {
        _id: saveUserData._id,
        name: saveUserData.name,
        email: saveUserData.email
      };

      delete req.session.userOtp;
      delete req.session.userOtpExpiry;
      delete req.session.userData;

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully"
      });

    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again"
      });
    }

  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const resendOtp = async (req, res) => {
  try {
    if (!req.session.userData || !req.session.userData.email) {
      return res.status(400).json({ 
        success: false, 
        message: "Session expired. Please signup again." 
      });
    }

    const email = req.session.userData.email;
    const otp = generateOtp();
    req.session.userOtp = otp;
    req.session.userOtpExpiry = Date.now() + 2 * 60 * 1000;

   
    req.session.save(async (err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ success: false, message: "Session error. Please try again." });
      }

      const emailSent = await sendVerificationEmail(email, otp);
      console.log("Resent OTP:", otp);

      if (emailSent) {
        return res.status(200).json({ success: true, message: "OTP Resent Successfully" });
      } else {
        return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
      }
    });

  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({ success: false, message: "Internal Server Error. Please try again." });
  }
};
const loadLogin = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect('/');
    }
    return res.render("login")
  } catch (error) {
    res.redirect("pageNotFound")
  }
}
const login = async (req, res) => {
  try {
    console.log("req ", req.body);
    const { email, password } = req.body;
   
    const findUser = await User.findOne({ isAdmin: false, email: email });
    console.log("find user", findUser)
    if (!findUser) {
      return res.render("login", { message: "User not found" })
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by admin" })
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    
    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect Password" })
    }

    req.session.user = {
      _id: findUser._id,
      name: findUser.name,
      email: findUser.email
    };

   return res.redirect("/");


  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed.Please try again later" })
  }
};
const loadForgotPassword = async (req, res) => {
  try {
    res.render("forgotPassword");
  } catch (error) {
    console.log("Error loading forgot password", error);
    res.redirect("/pageNotFound");
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.render("forgotPassword", { message: "User not found" });
    }

    const otp = generateOtp();
    console.log("Generated OTP:", otp);

    req.session.resetOtp = otp;
    req.session.resetEmail = email;
    req.session.resetOtpExpiry = Date.now() + 2 * 60 * 1000; 

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.render("forgotPassword", { message: "Failed to send OTP. Try again." });
    }

    return res.redirect("/reset-otp");

  } catch (error) {
    console.error("Error in forgot password", error);
    res.render("forgotPassword", { message: "Something went wrong" });
  }
};
const loadResetOtpPage = (req, res) => {
  if (!req.session.resetOtp || !req.session.resetEmail) {
    return res.redirect("/forgot-password");
  }
  if (Date.now() > req.session.resetOtpExpiry) {
  delete req.session.resetOtp;
  delete req.session.resetOtpExpiry;
  delete req.session.resetEmail;

  return res.render("forgotPassword", {
    message: "OTP has expired. Please request a new one."
  });
}

 
  const remainingMs = req.session.resetOtpExpiry - Date.now();
  const remainingSec = Math.floor(remainingMs / 1000);

  return res.render("resetOtp", {
    message: "",
    email: req.session.resetEmail,
    remainingSec  
  });
};
const verifyResetOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!req.session.resetOtp || !req.session.resetOtpExpiry) {
      return res.render("forgotPassword", {
        message: "OTP expired or session lost. Please request a new OTP."
      });
    }
   
    if (Date.now() > req.session.resetOtpExpiry) {
  delete req.session.resetOtp;
  delete req.session.resetOtpExpiry;
  delete req.session.resetEmail;
      return res.render("forgotPassword", {
        message: "OTP has expired. Please request a new one."
      });
    }
 
     if (String(otp) === String(req.session.resetOtp)) {
      delete req.session.resetOtp;
      delete req.session.resetOtpExpiry;
      return res.render("resetPassword", { message: "" });
    }
    return res.render("resetOtp", {
  message: "Invalid OTP. Try again.",
  email: req.session.resetEmail || "",
  remainingSec: Math.floor((req.session.resetOtpExpiry - Date.now()) / 1000)
});

  } catch (error) {
    console.error("Error verifying reset OTP", error);
    res.render("resetOtp", { message: "Something went wrong", email: "" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    console.log("req.body:", req.body);

    if (newPassword !== confirmPassword) {
      return res.render("resetPassword", { message: "Passwords do not match" });
    }

    const email = req.session.resetEmail;
  
    if (!email) {
      return res.render("forgotPassword", { 
        message: "Session expired. Please request a new OTP." 
      });
    }


    const passwordHash = await bcrypt.hash(newPassword, 10);
   const updatedUser= await User.findOneAndUpdate({ email }, { $set: { password: passwordHash } },{new:true});
    if(!updatedUser){
      return res.render("resetPassword",{message:"User not found"});
    }

  
 delete req.session.resetOtp;
delete req.session.resetEmail;
delete req.session.resetOtpExpiry;

    return res.redirect("/login");
  } catch (error) {
    console.error("Error resetting password", error);
    res.render("resetPassword", { message: "Something went wrong" });
  }
};
const resendResetOtp = async (req, res) => {
  try {
    const email = req.session.resetEmail;

    if (!email) {
      return res.status(400).json({ success: false, message: "Session expired. Please start again." });
    }

    const otp = generateOtp();
    req.session.resetOtp = otp;
    req.session.resetOtpExpiry = Date.now() + 2 * 60 * 1000; 

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resent Reset OTP:", otp);
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ success: false, message: "Failed to resend OTP" });
    }
  } catch (error) {
    console.error("Error resending reset OTP", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login")
    })
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound")

  }
};

const loadAddAddressPageProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    res.render("manageaddaddress", {
      from: "profile"
    });
  } catch (error) {
    console.error("Load add address error:", error);
    res.redirect("/pageNotFound");
  }
};

const addAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, locality, address, city, state, type, landmark } = req.body;
    const userId = req.session.user._id;

    if (!name || !mobile || !pincode || !locality || !address || !city || !state) {
      return res.redirect("/add-address");
    }

    if (!/^\d{10}$/.test(mobile) || !/^\d{6}$/.test(pincode)) {
      return res.redirect("/add-address");
    }

    const newAddress = {
      addressType: type,
      name,
      phone: mobile,
      altPhone: mobile,
      city,
      state,
      locality,   
  address,  
      landMark: landmark,
      pincode
    };

    let addressDoc = await Address.findOne({ userId });
    if (addressDoc) {
      addressDoc.addresses.push(newAddress);
      await addressDoc.save();
    } else {
      await Address.create({ userId, addresses: [newAddress] });
    }

    res.redirect("/checkout?saved=true");

  } catch (error) {
    console.error("Add address error:", error);
    res.redirect("/add-address");
  }
};
const addAddressFromProfile = async (req, res) => {
  try {
    console.log("fghjkl");

    const { name, mobile, pincode, locality, address, city, state, type, landmark ,from } = req.body;
    const userId = req.session.user._id;

    if (!name || !mobile || !pincode || !locality || !address || !city || !state) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled"
      });
    }

    if (!/^\d{10}$/.test(mobile) || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile or pincode"
      });
    }

    const newAddress = {
      addressType: type,
      name,
      phone: mobile,
      altPhone: mobile,
      locality,
      address,
      city,
      state,
      landMark: landmark,
      pincode
    };

    let addressDoc = await Address.findOne({ userId });

    if (addressDoc) {
      addressDoc.addresses.push(newAddress);
      await addressDoc.save();
    } else {
      await Address.create({ userId, addresses: [newAddress] });
    }
   let redirectUrl = "/userprofile#addressSection"; 
    if (from === "checkout") redirectUrl = "/checkout";

    return res.json({ success: true, redirect: redirectUrl });

  } catch (error) {
    console.error("Add address from profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  conformOtp,
  resendOtp,
  loadResetOtpPage,   
  resendResetOtp  ,
  loadLogin,
  login,
  logout,
  loadForgotPassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  loadlandingpage,
  addAddress,
  addAddressFromProfile,
  loadAddAddressPageProfile,
};