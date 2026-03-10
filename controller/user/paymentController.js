const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const razorpay = require("../../config/razorpay");
const crypto = require("crypto");

function applyOffer(product) {
  const categoryOffer = product.category?.categoryOffer || 0;
  const productOffer = product.productOffer || 0;
  const effectiveOffer = Math.max(productOffer, categoryOffer);

  product.effectiveOffer = effectiveOffer;
  product.salePrice =
    effectiveOffer > 0
      ? Math.round(product.regularPrice - (product.regularPrice * effectiveOffer) / 100)
      : null;
}

const loadPayment = async (req, res) => {
  try {

    const userId = req.session.user._id;
    const addressId = req.session.selectedAddress;

    if (!addressId) return res.redirect("/checkout");

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: { path: "category" }
      })
      .lean();

    if (!cart || cart.items.length === 0) return res.redirect("/checkout");

    const addressDoc = await Address.findOne({ userId }).lean();

    const address = addressDoc.addresses.find(
      a => a._id.toString() === addressId.toString()
    );

    if (!address) return res.redirect("/checkout");

    const unavailableItems = [];
    const validItems = [];

    for (const item of cart.items) {

      const product = item.productId;

      const isUnavailable =
        !product ||
        product.isBlocked ||
        product.isListed === false ||
        !product.category ||
        product.category.isBlocked ||
        product.category.isListed === false ||
        product.quantity <= 0;

      if (isUnavailable) {
        unavailableItems.push(product?.productName || "A product");
      } else {
        validItems.push(item);
      }
    }

    if (validItems.length === 0) {
      return res.redirect("/cart?error=all_unavailable");
    }

    let subtotal = 0;
    
    validItems.forEach((item) => {
      const product = item.productId;
      applyOffer(product);

      const salePrice = product.salePrice ?? product.regularPrice;


      subtotal += salePrice * Number(item.quantity || 1);

    });

    const deliveryCharge = subtotal > 1000 ? 0 : 50;

    const discount = req.session.appliedCoupon
      ? req.session.appliedCoupon.discountAmount
      : 0;

    const grandTotal = subtotal + deliveryCharge - discount;

    const amountInPaise = Math.round(grandTotal * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: "order_" + Date.now()
    });

    res.render("payment", {
      cartItems: validItems,
      address,
      subtotal,
      deliveryCharge,
      discount,
      total: grandTotal,
      user: req.session.user,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      razorpayAmount: amountInPaise,
      unavailableItems
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