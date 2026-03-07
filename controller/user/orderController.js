const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const walletController = require("../user/walletController");
const PDFDocument = require("pdfkit");

const loadOrders = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const user = await User.findById(req.session.user._id)

    const orders = await Order.find({
      userId: req.session.user._id
    })
      .populate({
        path: "products.productId",
        select: "productName productImage regularPrice salePrice"
      })
      .sort({ createdAt: -1 });

    res.render("orders", { orders, user });

  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
};
const loadOrderDetails = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const userId = req.session.user

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.user._id,
    }).populate("products.productId");

    console.log("order issss", order)
    if (!order) {
      return res.redirect('/userprofile');
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
    if (!req.session.user) return res.redirect("/login");

    const userId = req.session.user._id;
    const { addressId, paymentMethod } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, message: "Address is required" });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: { path: "category" }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) {
      return res.status(400).json({ success: false, message: "No addresses found" });
    }

    const selectedAddress = addressDoc.addresses.id(addressId);
    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Selected address not found" });
    }
    for (const item of cart.items) {
      const product = item.productId;

      if (
        !product ||
        product.isBlocked ||
        product.isListed === false ||
        !product.category ||
        product.category.isBlocked ||
        product.category.isListed === false
      ) {
        return res.status(400).json({
          success: false,
          message: `"${product?.productName || "A product"}" is no longer available. Please remove it from your cart.`
        });
      }

      if (product.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `"${product.productName}" is out of stock. Please remove it from your cart.`
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.quantity} unit(s) of "${product.productName}" are available.`
        });
      }
    }
    let total = 0;
    let totalProductDiscount = 0;
    const products = [];

    for (const item of cart.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.productId._id, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(400).json({
          success: false,
          message: `"${item.productId.productName}" went out of stock. Please update your cart.`
        });
      }

      if (updatedProduct.quantity === 0) {
        updatedProduct.status = "out of stock";
        await updatedProduct.save();
      }

      const regularPrice = updatedProduct.regularPrice;
      const offerPercent = updatedProduct.productOffer || 0;
      const salePrice = offerPercent > 0
        ? regularPrice - (regularPrice * offerPercent) / 100
        : regularPrice;

      const itemDiscount = (regularPrice - salePrice) * item.quantity;
      totalProductDiscount += itemDiscount;
      total += salePrice * item.quantity;

      products.push({
        productId: updatedProduct._id,
        quantity: item.quantity,
        price: regularPrice,
        salePrice: salePrice,
        discount: itemDiscount,
        offerApplied: offerPercent,
        status: "Placed"
      });
    }
    const couponData = req.session.appliedCoupon || null;
    const couponDiscount = couponData ? couponData.discountAmount : 0;

    const totalDiscount = totalProductDiscount + couponDiscount;
    const finalTotal = total - couponDiscount;
    if (paymentMethod === "Wallet") {
      const user = await User.findById(userId);

      if (!user || user.wallet < finalTotal) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Your balance: ₹${user?.wallet?.toFixed(2) || 0}, Required: ₹${finalTotal.toFixed(2)}`
        });
      }

      await walletController.debitWallet(userId, finalTotal, "Order payment via Wallet");
    }
    if (paymentMethod === "Razorpay") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment details missing" });
      }

      const crypto = require("crypto");
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment verification failed" });
      }
    }
    await Order.create({
      userId,
      address: {
        addressType: selectedAddress.addressType,
        name: selectedAddress.name,
        city: selectedAddress.city,
        landMark: selectedAddress.landMark,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        phone: selectedAddress.phone,
        altPhone: selectedAddress.altPhone
      },
      products,
      totalAmount: finalTotal,   
      discount: totalDiscount,   
      couponCode: couponData ? couponData.code : null,
      paymentMethod,
      status: paymentMethod === "COD" ? "Placed" : "Paid"
    });

    await Cart.deleteOne({ userId });
    delete req.session.appliedCoupon;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("PLACE ORDER ERROR ❌", error);
    return res.status(500).json({
      success: false,
      message: "Order failed: " + error.message
    });
  }
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
        { $inc: { quantity: item.quantity } }
      );

      item.status = "Cancelled";
      item.cancelReason = reason;
    }

    order.status = "Cancelled";
    order.cancelReason = reason;

    await order.save();

    if (order.paymentMethod !== "COD") {
      await walletController.creditWallet(
        order.userId,
        order.totalAmount,
        "Refund for cancelled order",
        order._id
      );
    }


    res.json({ success: true });

  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({ success: false });
  }
};

const cancelSingleProduct = async (req, res) => {
  try {
    const { orderId, productId, reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.session.user._id
    }).populate("products.productId");

    if (!order) return res.json({ success: false, message: "Order not found" });

    const product = order.products.find(
      p => p.productId._id.toString() === productId
    );

    if (!product || product.status === "Cancelled") {
      return res.json({ success: false, message: "Cannot cancel product" });
    }

    product.status = "Cancelled";
    product.cancelReason = reason || "";

    if (product.productId) {
      await Product.findByIdAndUpdate(product.productId._id, {
        $inc: { quantity: product.quantity }
      });
    }


    if (order.products.every(p => p.status === "Cancelled")) {
      order.status = "Cancelled";
    }

    await order.save();
if (order.paymentMethod !== "COD") {
  const refundAmount = product.price * product.quantity;

  await walletController.creditWallet(
    order.userId,
    refundAmount,
    "Refund for cancelled product",
    order._id
  );
}

    res.json({ success: true });
  } catch (error) {
    console.error("Cancel single product error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const returnSingleProduct = async (req, res) => {
  try {
    const { orderId, productId, reason } = req.body;

    if (!reason) {
      return res.json({ success: false, message: "Return reason required" });
    }

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

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    if (product.status !== "Delivered") {
      return res.json({
        success: false,
        message: "Return allowed only after delivery"
      });
    }

    if (product.returnRequested) {
      return res.json({
        success: false,
        message: "Return already requested"
      });
    }

    product.returnRequested = true;
    product.returnReason = reason;

    await order.save();

    res.json({ success: true });

  } catch (error) {
    console.error("Return single product error:", error);
    res.status(500).json({ success: false });
  }
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
      if (p.status === "Delivered") {
        p.returnRequested = true;
        p.returnReason = reason;
      }
    });
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
`attachment; filename=invoice-${order.orderId}.pdf`
    );
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const margin = 50;
    const contentW = pageWidth - margin * 2;
    const PRIMARY = "#1a1a2e";
    const ACCENT = "#e94560";
    const LIGHT_BG = "#f0f0f0";
    const WHITE = "#ffffff";
    const GRAY_TEXT = "#888888";
    doc.rect(0, 0, pageWidth, 100).fill(PRIMARY);
    doc.fillColor(WHITE).fontSize(28).font("Helvetica-Bold")
      .text("INVOICE", margin, 28, { align: "center" });
    doc.fillColor(ACCENT).fontSize(10).font("Helvetica")
      .text("Thank you for your purchase!", margin, 65, { align: "center" });
    let y = 120;

    const drawLabel = (label, value, x, ty) => {
      doc.fillColor(GRAY_TEXT).fontSize(8).font("Helvetica")
        .text(label.toUpperCase(), x, ty);
      doc.fillColor(PRIMARY).fontSize(10).font("Helvetica-Bold")
        .text(value, x, ty + 11);
    };

drawLabel("Order ID", `${order.orderId}`, margin, y);
    drawLabel("Order Date", new Date(order.createdAt).toDateString(), margin, y + 36);
    drawLabel("Payment Method", order.paymentMethod, margin + contentW / 2, y);
    drawLabel("Order Status", order.status, margin + contentW / 2, y + 36);
    y = 210;
    doc.moveTo(margin, y).lineTo(margin + contentW, y)
      .strokeColor(ACCENT).lineWidth(1.5).stroke();
    y += 16;
    const cols = [
      { header: "#", x: margin, w: 30, align: "left" },
      { header: "Product", x: margin + 30, w: 230, align: "left" },
      { header: "Price", x: margin + 260, w: 80, align: "right" },
      { header: "Qty", x: margin + 340, w: 45, align: "center" },
      { header: "Subtotal", x: margin + 385, w: 80, align: "right" },
    ];
    const ROW_H = 26;
    doc.rect(margin, y, contentW, ROW_H).fill(PRIMARY);
    cols.forEach(col => {
      doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold")
        .text(col.header, col.x + 4, y + 8, { width: col.w - 8, align: col.align });
    });
    y += ROW_H;
    let total = 0;
    let rowNum = 0;

    order.products.forEach((item, index) => {
      if (item.status === "Cancelled") return;

      const name = item.productId?.productName || "Product";
      const price = item.price;
      const qty = item.quantity;
      const subtotal = price * qty;
      total += subtotal;
      doc.rect(margin, y, contentW, ROW_H).fill(rowNum % 2 === 0 ? LIGHT_BG : WHITE);
      doc.rect(margin, y, contentW, ROW_H).strokeColor("#dddddd").lineWidth(0.5).stroke();

      const cells = [
        { val: `${index + 1}`, col: cols[0] },
        { val: name, col: cols[1] },
        { val: `Rs.${price.toFixed(2)}`, col: cols[2] },
        { val: `${qty}`, col: cols[3] },
        { val: `Rs.${subtotal.toFixed(2)}`, col: cols[4] },
      ];

      cells.forEach(({ val, col }) => {
        doc.fillColor(PRIMARY).fontSize(9).font("Helvetica")
          .text(val, col.x + 4, y + 8, { width: col.w - 8, align: col.align });
      });

      y += ROW_H;
      rowNum++;
    });
    doc.rect(margin, y, contentW, ROW_H + 2).fill(PRIMARY);
    doc.fillColor(WHITE).fontSize(10).font("Helvetica-Bold")
      .text("TOTAL", margin + 4, y + 9, { width: contentW - cols[4].w - 60, align: "right" });
    doc.fillColor(ACCENT).fontSize(10).font("Helvetica-Bold")
      .text(`Rs.${total.toFixed(2)}`, cols[4].x + 4, y + 9, { width: cols[4].w - 8, align: "right" });
    const footerY = doc.page.height - 55;
    doc.moveTo(margin, footerY - 10).lineTo(margin + contentW, footerY - 10)
      .strokeColor("#dddddd").lineWidth(1).stroke();
    doc.fillColor(GRAY_TEXT).fontSize(9).font("Helvetica")
      .text("Thank you for shopping with us!", margin, footerY, { align: "center", width: contentW });

    doc.end();

  } catch (error) {
    console.error("Invoice download error:", error);
    res.status(500).send("Failed to generate invoice");
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user._id

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
  cancelSingleProduct,
  returnSingleProduct,
  returnOrder,
  downloadInvoice,
  viewOrderDetails

};
