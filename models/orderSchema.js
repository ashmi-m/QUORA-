
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");
const orderSchema = new mongoose.Schema({
    orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
     default: () => `ORD-${uuidv4().split("-")[0].toUpperCase()}`
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    required: true,
    name: String,
    city: String,
    landMark: String,
    state: String,
    pincode: String,
    phone: String,
    altPhone: String
  },

  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
 status: {
        type: String,
        enum: ["Placed", "Cancelled", "Returned"],
        default: "Placed"
      },
      cancelReason: String,
      returnReason: String
    }
  ],

  totalAmount: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ["COD", "ONLINE", 'Wallet'],
    required: true
  },

  status: {
    type: String,
     enum: ["Placed", "Paid", "Delivered", "Cancelled"],
    default: "Placed"
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
