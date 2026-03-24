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
  console.log("MAIL USER:", process.env.NODEMAILER_EMAIL);
console.log("MAIL PASS LENGTH:", process.env.NODEMAILER_PASSWORD?.length);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    await transporter.verify();
    console.log("Nodemailer transporter verified");

    const mailOptions = {
      from: `"Quora" <${process.env.NODEMAILER_EMAIL}>`,
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
    console.log("Verification email sent to:", email);
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    throw err;
  }
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
    let { currentEmail, newEmail } = req.body;

    if (!currentEmail || !newEmail) {
      return res.json({
        success: false,
        message: "Both current and new email are required",
      });
    }

    currentEmail = currentEmail.trim().toLowerCase();
    newEmail = newEmail.trim().toLowerCase();

    if (!req.session.user || !req.session.user._id) {
      return res.json({ success: false, message: "Please login again" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) return res.json({ success: false, message: "User not found" });

    if (user.googleId) {
      return res.json({
        success: false,
        message: "Google users cannot change email here",
      });
    }

    if (currentEmail !== user.email.toLowerCase()) {
      return res.json({
        success: false,
        message: "Current email does not match your account email",
      });
    }

    if (newEmail === currentEmail) {
      return res.json({
        success: false,
        message: "New email must be different from current email",
      });
    }

    const emailExists = await User.findOne({
      email: new RegExp(`^${newEmail}$`, "i"),
    });
    if (emailExists) {
      return res.json({ success: false, message: "Email already in use" });
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();

    console.log(" VERIFICATION CODE:", verificationCode);

    emailVerificationCodes.set(user._id.toString(), {
      code: verificationCode,
      newEmail,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await sendVerificationEmail(newEmail, verificationCode);

    return res.json({
      success: true,
      message: `Verification code sent to ${newEmail}`,
    });
  } catch (err) {
    console.error("Email change error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.json({ success: false, message: "Verification code required" });

    const userId = req.session.user?._id;
    if (!userId) return res.json({ success: false, message: "Please login again" });

    const record = emailVerificationCodes.get(userId.toString());
    if (!record) return res.json({ success: false, message: "No verification request found" });

    if (Date.now() > record.expiresAt) {
      emailVerificationCodes.delete(userId.toString());
      return res.json({ success: false, message: "Verification code expired" });
    }

    if (record.code !== code.trim()) return res.json({ success: false, message: "Invalid verification code" });

   
    await User.findByIdAndUpdate(userId, { email: record.newEmail });

   
    req.session.user.email = record.newEmail;

    emailVerificationCodes.delete(userId.toString());

    return res.json({ success: true, message: "Email updated successfully" });
  } catch (err) {
    console.error("Verify email error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
const updateProfile = async(req,res)=>{
  try{
    const userId = req.session.user._id;
    const{name,phone,gender}=req.body
     name = name ? name.trim() : ""
     const namePattern = /^[A-Za-z\s]{3,20}$/;
    if (!namePattern.test(name)) {
      return res.json({
        success: false,
        message: "Name must be 3–20 characters and contain only alphabets"
      });
    }
    await User.findByIdAndUpdate(userId,{
      name,
      phone,
      gender
    });
       req.session.user.name = name;
    req.session.user.phone = phone;
    req.session.user.gender = gender;
     res.json({ success: true });
  }catch(err){
     console.error(err);
    res.json({ success: false });
  }
}


module.exports = {
  loadPrivacySecurity,
  changePassword,
  changeEmail,
  verifyEmail,
    updateProfile
};

