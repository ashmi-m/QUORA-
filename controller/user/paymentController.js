
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const razorpay = require("../../config/razorpay");
const crypto = require("crypto");

const loadPayment = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addressId = req.session.selectedAddress;

    if (!addressId) return res.redirect("/checkout");

    const cart = await Cart.findOne({ userId }).populate("items.productId").lean();
    if (!cart || cart.items.length === 0) return res.redirect("/checkout");

    const addressDoc = await Address.findOne({ userId }).lean();
    const address = addressDoc.addresses.find(a => a._id.toString() === addressId.toString());
    if (!address) return res.redirect("/checkout");
    let subtotal = 0;
    cart.items.forEach(item => {
      const price = Number(item.productId.salePrice || item.productId.regularPrice || 0);
      subtotal += price * Number(item.quantity || 1);
    });
    const deliveryCharge = subtotal > 1000 ? 0 : 50;
    const discount = req.session.appliedCoupon ? req.session.appliedCoupon.discountAmount : 0;

    const grandTotal = subtotal + deliveryCharge - discount;
    const amountInPaise = Math.round(grandTotal * 100);

    
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: "order_" + Date.now()
    });

    res.render("payment", {
      cartItems: cart.items,
      address,
      subtotal,
      deliveryCharge,
      discount,
      total: grandTotal,
      user: req.session.user,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      razorpayAmount: amountInPaise
    });

  } catch (err) {
    console.error("PAYMENT PAGE ERROR ", err);
    res.redirect("/checkout");
  }
};
const loadOrderSuccess = (req, res) => {
  const method = req.query.method || "COD";
  req.session.cart = null;
  req.session.selectedAddress = null;
  res.render("order-success", {
    paymentMethod: method,
    ordersPage: "/orders"
  });
};

const loadOrderFailed = (req, res) => {
  res.render("order-failed", {
    retryUrl: "/checkout/payment",
    ordersPage: "/orders"
  });
};

module.exports = {
  loadPayment,
  loadOrderSuccess,
  loadOrderFailed
};
