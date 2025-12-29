
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
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

    res.render("payment", {
      cartItems: cart.items,
      address,
      total
    });

  } catch (err) {
    console.error("PAYMENT PAGE ERROR ❌", err);
    res.redirect("/checkout");
  }
};
const placeOrder = async (req, res) => {
  try {
    console.log("🔥 PLACE ORDER HIT");
    console.log("BODY 👉", req.body);

    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login again"
      });
    }

    const userId = req.session.user._id;
    const { paymentMethod, addressId } = req.body;

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

    await Order.create({
      userId,
      address: addressId,
      products,
      totalAmount: total,
      paymentMethod,
      status: paymentMethod === "COD" ? "Placed" : "Paid"
    });

    await Cart.deleteOne({ userId });
    delete req.session.selectedAddress;

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("PLACE ORDER ERROR ❌", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};





module.exports = { loadPayment, placeOrder };
