
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

    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .lean();

    if (!cart || cart.items.length === 0)
      return res.redirect("/checkout");

    const addressDoc = await Address.findOne({ userId }).lean();
    const address = addressDoc.addresses.find(
      a => a._id.toString() === addressId.toString()
    );

    if (!address) return res.redirect("/checkout");

  let total = 0;
cart.items.forEach(item => {
  total += Number(item.productId.regularPrice) * Number(item.quantity);
});

const amountInPaise = Math.round(total * 100);

const razorpayOrder = await razorpay.orders.create({
  amount: amountInPaise,
  currency: "INR",
  receipt: "order_" + Date.now()
});

res.render("payment", {
  cartItems: cart.items,
  address,
  total,
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

const placeOrder = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login again"
      });
    }

    const userId = req.session.user._id;
    const { addressId,paymentMethod } = req.body;

    if (!paymentMethod || !addressId) {
      return res.status(400).json({
        success: false,
        message: "Payment method or address missing"
      });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    let total = 0;
    const products = cart.items.map(item => {
      total += item.productId.regularPrice * item.quantity;
      return {
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.regularPrice
      };
    });
    const addressDoc = await Address.findOne({ userId });
    const selectedAddress = addressDoc.addresses.find(
      a => a._id.toString() === addressId.toString()
    );
   if (paymentMethod === "Razorpay") {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Payment details missing"
    });
  }

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    console.error("Expected signature:", generated_signature, "Received:", razorpay_signature);
    return res.status(400).json({
      success: false,
      message: "Payment verification failed"
    });
  }
}
    await Order.create({
      userId,
       address: selectedAddress,
      products,
      totalAmount: total,
      paymentMethod,
      status: paymentMethod === "COD" ? "Placed" : "Paid"
    });

    await Cart.deleteOne({ userId });
    delete req.session.selectedAddress;

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("PLACE ORDER ERROR ", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
const loadOrderFailed = (req, res) => {
 res.render("user/order-failed", {
  retryUrl: "/checkout/payment",
  ordersPage: "/orders"
});
};

module.exports = {
  loadPayment,
  placeOrder,
  loadOrderSuccess,
  loadOrderFailed
};
