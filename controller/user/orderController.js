const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");

const loadOrders = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const orders = await Order.find({
      userId: req.session.user._id
    })
      .populate({
        path: "products.productId",
        select: "productName productImage regularPrice salePrice"
      })
      .sort({ createdAt: -1 });

    res.render("orders", { orders });

  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
};


const loadOrderDetails = async (req, res) => {
  try {
    console.log("ORDER DETAILS ID:", req.params.id);
    console.log("USER ID:", req.session.user?._id);

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user._id,
    })
      .populate("products.productId");

    console.log("ORDER FOUND:", order);

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("orderDetails", {
      order,
      user: req.session.user,
    });

  } catch (error) {
    console.error("ORDER DETAILS ERROR ❌", error);
    res.status(500).send("Internal Server Error");
  }
};

  


const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;
    const userId = req.session.user._id;

    const cart = await Cart.findOne({ userId })
      .populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/checkout");
    }

    const products = cart.items.map(item => {
      const price =
        item.productId.salePrice ||
        item.productId.regularPrice;

      return {
        productId: item.productId._id,
        quantity: item.quantity,
        price
      };
    });

    const totalAmount = products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );

    const newOrder = new Order({
      userId,
      address: addressId,
      products,
      totalAmount,
      paymentMethod,
      status: paymentMethod === "COD" ? "Placed" : "Paid"
    });

    await newOrder.save();

    cart.items = [];
    await cart.save();

    res.redirect("/orders");

  } catch (err) {
    console.error(err);
    res.redirect("/pageNotFound");
  }
};

/* CANCEL ORDER */
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user._id
    });

    if (!order) return res.json({ success: false });

    if (!["Placed", "Paid"].includes(order.status)) {
      return res.json({ success: false });
    }

    order.status = "Cancelled";
    await order.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  loadOrders,
  placeOrder,
  cancelOrder,
  loadOrderDetails
};
