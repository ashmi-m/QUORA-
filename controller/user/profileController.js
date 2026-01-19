const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const emailVerificationCodes = new Map();


async function sendVerificationEmail(email, code) {
  try {
   
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification Code - Sentique",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Email Verification</h2>
          <p style="color: #555;">Your verification code is:</p>
          <div style="background: #e0b84f; color: #000; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="margin: 0; font-size: 36px; letter-spacing: 5px;">${code}</h1>
          </div>
          <p style="color: #555;">This code will expire in 5 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log("✅ Verification email sent to:", email);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
}

const loadPrivacySecurity = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id).lean();

    const cart = await Cart.findOne({ userId: user._id }).lean();
    const wishlist = await Wishlist.findOne({ userId: user._id }).lean();

    res.render("privacy-security", {
      user,
      isGoogleUser: !!user.googleId,
      cartCount: cart ? cart.items.length : 0,
      wishlistCount: wishlist ? wishlist.items.length : 0,
    });
  } catch (error) {
    console.error("Error loading privacy & security:", error);
    res.redirect("/pageNotFound");
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    const user = await User.findById(req.session.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Password update error:", err);
    res.json({ success: false, message: "Something went wrong" });
  }
};
const changeEmail = async (req, res) => {
  try {
    console.log("ENV CHECK:", {
  email: process.env.NODEMAILER_EMAIL,
  pass: process.env.NODEMAILER_PASSWORD,
});

    let { newEmail, password } = req.body;
    newEmail = newEmail?.trim();
    password = password?.trim();

    console.log("Change email request:", { 
      newEmail, 
      passwordLength: password?.length,
      hasPassword: !!password 
    });
    if (!newEmail || !password) {
      return res.json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }
    if (!req.session.user) {
      return res.json({ success: false, message: "Please login first" });
    }
    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    console.log("User found:", {
      id: user._id,
      email: user.email,
      hasPassword: !!user.password,
      hasGoogleId: !!user.googleId,
    });
    if (user.googleId) {
      return res.json({
        success: false,
        message: "Google users cannot change email here",
      });
    }
    if (!user.password) {
      return res.json({
        success: false,
        message: "Your account doesn't have a password.",
      });
    }
    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      return res.json({
        success: false,
        message: "New email cannot be the same as current email",
      });
    }
    const emailExists = await User.findOne({ 
      email: { $regex: new RegExp(`^${newEmail}$`, 'i') }
    });
    
    if (emailExists) {
      return res.json({
        success: false,
        message: "This email is already registered",
      });
    }
    console.log("Comparing passwords...");
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect password" });
    }
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    emailVerificationCodes.set(req.session.user._id.toString(), {
      code: verificationCode,
      newEmail: newEmail,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log("Sending verification email to:", newEmail);
    console.log("Verification code:", verificationCode); 

   
    await sendVerificationEmail(newEmail, verificationCode);

    res.json({
      success: true,
      message: "Verification code sent to your new email",
    });
  } catch (err) {
    console.error("Email change error:", err);
    res.json({ success: false, message: "Something went wrong: " + err.message });
  }
};

module.exports = {
  loadPrivacySecurity,
  changePassword,
  changeEmail,
};

