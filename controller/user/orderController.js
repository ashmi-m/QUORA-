const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const PDFDocument = require("pdfkit");
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
    if (!req.session.user) return res.redirect("/login");

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user._id,
    }).populate("products.productId");

    if (!order) {
      return res.status(404).send("Order not found");
    }
    const user = await User.findById(req.session.user._id);

    res.render("orderDetails", {
      order,
      user,   
    });

  } catch (error) {
    console.error("ORDER DETAILS ERROR ❌", error);
    res.status(500).send("Internal Server Error");
  }
};

const placeOrder = async (req, res) => {
  const { addressId, paymentMethod } = req.body;
  const userId = req.session.user._id;

  const cart = await Cart.findOne({ userId }).populate("items.productId");
  const user = await User.findById(userId);

  const address = user.addresses.id(addressId);

  const products = cart.items.map(i => ({
    productId: i.productId._id,
    quantity: i.quantity,
    price: i.productId.salePrice || i.productId.regularPrice
  }));

  const totalAmount = products.reduce(
    (sum, p) => sum + p.price * p.quantity,
    0
  );

  const order = new Order({
    userId,
    products,
    totalAmount,
    paymentMethod,
    status: paymentMethod === "COD" ? "Placed" : "Paid",
    shipping: address
  });

  await order.save();

  cart.items = [];
  await cart.save();

  res.redirect("/orders");
};



const cancelOrder = async (req, res) => {
  try {
    const reason = req.body?.reason || "";

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user._id
    }).populate("products.productId");

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    if (order.status === "Cancelled") {
      return res.json({ success: false, message: "Already cancelled" });
    }

    if (!["Placed", "Paid"].includes(order.status)) {
      return res.json({ success: false, message: "Cannot cancel now" });
    }

    for (let item of order.products) {
      if (!item.productId) continue;

      await Product.findByIdAndUpdate(
        item.productId._id,
        { $inc: { stock: item.quantity } }
      );

      item.status = "Cancelled";
      item.cancelReason = reason;
    }

    order.status = "Cancelled";
    order.cancelReason = reason;

    await order.save();

    res.json({ success: true });

  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({ success: false });
  }
};
const cancelSingleProduct = async (req, res) => {
  const { orderId, productId, reason } = req.body;

  const order = await Order.findOne({
    _id: orderId,
    userId: req.session.user._id
  });

  if (!order) {
    return res.json({ success: false, message: "Order not found" });
  }

  const product = order.products.find(
    p => p.productId.toString() === productId
  );

  if (!product || product.status === "Cancelled") {
    return res.json({ success: false, message: "Cannot cancel product" });
  }

  product.status = "Cancelled";
  product.cancelReason = reason || "";

  await Product.findByIdAndUpdate(productId, {
    $inc: { stock: product.quantity }
  });

  const allCancelled = order.products.every(
    p => p.status === "Cancelled"
  );

  if (allCancelled) {
    order.status = "Cancelled";
  }

  await order.save();

  res.json({ success: true });
};


const returnOrder = async (req, res) => {
  try {
    const reason = req.body?.reason;

    if (!reason) {
      return res.json({ success: false, message: "Return reason required" });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user._id
    });

    if (!order || order.status !== "Delivered") {
      return res.json({ success: false });
    }

    order.products.forEach(p => {
      p.status = "Returned";
      p.returnReason = reason;
    });

    order.status = "Returned";
    await order.save();

    res.json({ success: true });

  } catch (err) {
    console.error("Return order error:", err);
    res.status(500).json({ success: false });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user._id,
    }).populate("products.productId");

    if (!order) {
      return res.status(404).send("Order not found");
    }
    if (["Cancelled", "Returned"].includes(order.status)) {
      return res.status(400).send("Invoice not available for cancelled or returned orders");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order._id}.pdf`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(20).text("INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Order ID: ${order._id}`);
    doc.text(`Order Date: ${new Date(order.createdAt).toDateString()}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.text(`Order Status: ${order.status}`);
    doc.moveDown();

    doc.text("Items:", { underline: true });
    doc.moveDown(0.5);

    let total = 0;

    order.products.forEach((item, index) => {
      if (item.status === "Cancelled") return;

      const name = item.productId?.productName || "Product";
      const price = item.price;
      const qty = item.quantity;
      const subtotal = price * qty;
      total += subtotal;

      doc.text(`${index + 1}. ${name} | ₹${price} x ${qty} = ₹${subtotal}`);
    });

    doc.moveDown();
    doc.fontSize(13).text(`Total Amount: ₹${total}`, { bold: true });

    doc.moveDown(2);
    doc.fontSize(11).text("Thank you for shopping with us!", {
      align: "center",
    });

    doc.end();

  } catch (error) {
    console.error("Invoice download error:", error);
    res.status(500).send("Failed to generate invoice");
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user_id; 
    const order = await Order.findOne({ _id: orderId, userId: userId }).populate("items.product");

    if (!order) {
      return res.status(404).render("error", { message: "Order not found or access denied" });
    }

    res.render("user/orderDetails", {
      title: "Order Details",
      order: order,
      user: req.session.user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", { message: "Something went wrong" });
  }
};


module.exports = {
  loadOrders,
  placeOrder,
  cancelOrder,
  loadOrderDetails,
  cancelSingleProduct ,
   returnOrder ,
    downloadInvoice ,
 viewOrderDetails 

};
