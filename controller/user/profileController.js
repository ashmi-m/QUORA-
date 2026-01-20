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
  console.log("🚀 Trying to send email to:", email);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  });

 const mailOptions = {
    from: `"Sentique" <${process.env.NODEMAILER_EMAIL}>`,
    to: email,
    subject: "Email Verification Code",
    html: `
      <div style="font-family: Arial;">
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing:6px;">${code}</h1>
        <p>This code expires in 5 minutes.</p>
      </div>
    `,
  };
  
  await transporter.sendMail(mailOptions);
  console.log("✅ Verification email sent");
}

const loadPrivacySecurity = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).lean();

    res.render("privacy-security", {
      user,
      isGoogleUser: !!user.googleId,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
};


const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.json({ success: false, message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    // Password strength check
    if (newPassword.length < 8) {
      return res.json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const user = await User.findById(req.session.user._id);

    if (!user || !user.password) {
      return res.json({ success: false, message: "User not found" });
    }

    const isCurrentMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentMatch) {
      return res.json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // 🔥 NEW CHECK (IMPORTANT)
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.json({
        success: false,
        message: "New password cannot be the same as current password",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.json({ success: false, message: "Something went wrong" });
  }
};
const changeEmail = async (req, res) => {
  try {
    let { newEmail } = req.body;
    newEmail = newEmail?.trim().toLowerCase();

    if (!newEmail) {
      return res.json({ success: false, message: "New email is required" });
    }

    if (!req.session.user || !req.session.user._id) {
      return res.json({ success: false, message: "Please login again" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.googleId) {
      return res.json({
        success: false,
        message: "Google users cannot change email here",
      });
    }

    if (user.email.toLowerCase() === newEmail) {
      return res.json({
        success: false,
        message: "New email cannot be same as current email",
      });
    }

    const emailExists = await User.findOne({
      email: new RegExp(`^${newEmail}$`, "i"),
    });

    if (emailExists) {
      return res.json({
        success: false,
        message: "Email already in use",
      });
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();

    emailVerificationCodes.set(user._id.toString(), {
      code: verificationCode,
      newEmail,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await sendVerificationEmail(newEmail, verificationCode);

    return res.json({
      success: true,
      message: "Verification code sent to your new email",
       code: verificationCode 
    });
  } catch (err) {
    console.error("Email change error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.json({ success: false, message: "Verification code required" });
    }

    const userId = req.session.user?._id;
    if (!userId) {
      return res.json({ success: false, message: "Please login again" });
    }

    const record = emailVerificationCodes.get(userId.toString());

    if (!record) {
      return res.json({
        success: false,
        message: "No verification request found",
      });
    }

    if (Date.now() > record.expiresAt) {
      emailVerificationCodes.delete(userId.toString());
      return res.json({
        success: false,
        message: "Verification code expired",
      });
    }

    if (record.code !== code.trim()) {
      return res.json({
        success: false,
        message: "Invalid verification code",
      });
    }

    await User.findByIdAndUpdate(userId, {
      email: record.newEmail,
    });

    emailVerificationCodes.delete(userId.toString());

    // Update session email
    req.session.user.email = record.newEmail;

    return res.json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (err) {
    console.error("Verify email error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



module.exports = {
  loadPrivacySecurity,
  changePassword,
  changeEmail,
  verifyEmail,
};

