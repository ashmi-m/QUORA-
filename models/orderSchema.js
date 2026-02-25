
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
    addressType:String, 
    name: String,
    city: String,
    landMark: String,
    state: String,
    pincode: Number,
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
        enum: [  "Placed",
          "Processing",
          "Shipped",
          "Out for Delivery",
          "Delivered",
          "Cancelled",
          "Returned"],
        default: "Placed"
      },
      cancelReason: String,
      returnReason: String,
      returnRequested: { type: Boolean, default: false }
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
     enum: [ "Placed",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
         "Returned", 
      "Payment Failed"],
    default: "Placed"
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
