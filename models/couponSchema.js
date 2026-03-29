
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },


  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true
  },

  discountValue: {
    type: Number,
    required: true
  },

  maxDiscount: {
    type: Number
  },

  minimumPurchase: {
    type: Number,
    default: 0
  },

  limit: {
    type: Number,
    required: true
  },

  expiryDate: {
    type: Date,
    required: true
  },

  description: {
    type: String
  },
  couponCode: {
    type: String,
    default: null
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);