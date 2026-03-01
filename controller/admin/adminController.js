
const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");

const pageerror = async (req, res) => {
  res.render("pageerror");
}

const loadLogin = (req, res) => {
  return res.render("adminlogin", { message: null });
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });

    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);
      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("/admin/dashboard");
      } else {
        return res.redirect("/admin/login");
      }
    } else {
      return res.redirect("/admin/login");
    }
  } catch (error) {
    console.log("login error", error);
    return res.redirect("/pageerror");
  }
};
const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      return res.render("dashboard");
    } catch (error) {
      res.redirect("/pageerror");
    }
  } else {
    res.redirect("/admin/login");
  }
}
const logout = async (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) {
      
        return res.redirect("/pageerror")
      }
     return res.redirect("/admin/login")
    })
  } catch (error) {
   return res.redirect("/pageerror")
  }
}
const loadOrders = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "All";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    let matchStage = {};
    if (status !== "All") {
      matchStage.status = status;
    }
    if (search) {
      if (mongoose.Types.ObjectId.isValid(search)) {
        matchStage._id = new mongoose.Types.ObjectId(search);
      } else {
        matchStage.$or = [
          { status: { $regex: search, $options: "i" } },
          { "user.name": { $regex: search, $options: "i" } },
          { "productsData.name": { $regex: search, $options: "i" } },
          { "productsData.productName": { $regex: search, $options: "i" } },
          { "productsData.title": { $regex: search, $options: "i" } }
        ];
      }
    }
    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productsData"
        }
      },
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];
    const rawOrders = await Order.aggregate(pipeline);
  const orders = rawOrders.map(order => {
  const mappedProducts = order.products.map((p, index) => ({
    ...p,
    productId: order.productsData[index] || null
  }));
  const hasReturnRequest = mappedProducts.some(p => p.returnRequested === true);

  return {
    ...order,
    userId: order.user,
    products: mappedProducts,
    hasReturnRequest
  };
});
    const countPipeline = pipeline.filter(
      stage => !("$skip" in stage) && !("$limit" in stage)
    );

    const totalOrdersArr = await Order.aggregate([
      ...countPipeline,
      { $count: "count" }
    ]);

    const totalOrders = totalOrdersArr[0]?.count || 0;

    res.render("adminOrders", {
      orders,
      search,
      status,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      limit
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};
const viewOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("products.productId");
    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("adminOrderDetails", { order });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

    if (!order) return res.status(404).send("Order not found");
    res.redirect("/admin/orders");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
function recalculateOrderStatus(order) {
  const statuses = order.products.map(p => p.status);

  if (statuses.every(s => s === "Cancelled")) {
    order.status = "Cancelled";
  } 
  else if (statuses.every(s => s === "Delivered")) {
    order.status = "Delivered";
  } 
  else if (statuses.every(s => s === "Returned")) {
    order.status = "Returned";
  } 
  else if (statuses.some(s =>
    s === "Processing" ||
    s === "Shipped" ||
    s === "Out for Delivery"
  )) {
    order.status = "Processing";
  } 
  else {
    order.status = "Placed";
  }
}
const updateProductStatus = async (req, res) => {
  try {
    if (!req.session || !req.session.admin) {
      return res.status(401).json({
        success: false,
        message: "Session expired"
      });
    }
    const { status } = req.body;
   console.log("status is",status)

    const {id}= req.params;
    const index=Number(req.params.index);
  
    const order = await Order.findById(id);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }
     const productIndex = Number(index);
     const product = order.products [index];
     console.log("product is ",product)
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }
      const currentStatus = product.status;
    console.log("currentstatus is",currentStatus)
    if (currentStatus === "Cancelled") {
      return res.json({
        success: false,
        message: "Cancelled product cannot be modified"
      });
    }
     const allowedTransitions = {
      "Placed": ["Processing", "Cancelled","Delivered"],
      "Processing": ["Shipped", "Cancelled"],
      "Shipped": ["Out for Delivery"],
      "Out for Delivery": ["Delivered"],
      "Delivered": [],
      "Cancelled": [],
       "Returned": []
    };
     if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.json({
        success: false,
        message: `Cannot change status from ${currentStatus} to ${status}`
      });
    }
    product.status = status;

    recalculateOrderStatus(order);

    await order.save();
      return res.json({ success: true });

  } catch (err) {
    console.error("Update product status error:", err);
    res.status(500).json({ success: false });
  }
};
const getOrderDetailsJson = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId")
      .populate("products.productId")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    let addressData = {
      name: "N/A",
      city: "N/A",
      state: "N/A",
      pincode: "N/A",
      phone: "N/A"
    };
    if (order.address && order.address.name) {
      addressData = {
        name: order.address.name || "N/A",
        city: order.address.city || "N/A",
        landMark: order.address.landMark || "",
        state: order.address.state || "N/A",
        pincode: order.address.pincode || "N/A",
        phone: order.address.phone || "N/A"
      };
    } else {
      try {
        const Address = require("../../models/addressSchema");
        const addressDoc = await Address.findOne({
          userId: order.userId?._id
        }).lean();

        if (addressDoc && addressDoc.addresses?.length > 0) {
          let selectedAddress = addressDoc.addresses[0];
          
          if (order.address && mongoose.Types.ObjectId.isValid(order.address)) {
            const matched = addressDoc.addresses.find(
              a => a._id.toString() === order.address.toString()
            );
            if (matched) selectedAddress = matched;
          }

          addressData = {
            name: selectedAddress.name || "N/A",
            city: selectedAddress.city || "N/A",
            landMark: selectedAddress.landMark || "",
            state: selectedAddress.state || "N/A",
            pincode: selectedAddress.pincode || "N/A",
            phone: selectedAddress.phone || "N/A"
          };
        }
      } catch (err) {
        console.error("Error fetching address:", err);
      }
    }
    const products = order.products.map((p, index) => {
      let imagePath = "/images/no-image.png";

      if (p.productId?.productImage?.length > 0) {
        const img = p.productId.productImage[0];
        imagePath = img.startsWith("http") ? img : `/uploads/${img}`;
      }
      return {
        index,
        name: p.productId?.productName || "Product",
        image: imagePath,
        quantity: p.quantity,
        price: p.price,
        status: p.status || "Placed",
        returnRequested: !!p.returnRequested,
        returnReason: p.returnReason || ""
      };
    });
    res.json({
      _id: order._id,
      orderId: order.orderId,
      user: {
        name: order.userId?.name || "N/A",
        email: order.userId?.email || "N/A",
        phone: order.userId?.phone || "N/A"
      },
      address: addressData,
      payment: {
        method: order.paymentMethod || "N/A",
        status: order.status || "Pending",
        subTotal: order.totalAmount || 0,
        discount: 0,
        total: order.totalAmount || 0
      },
      products: products
    });

  } catch (err) {
    console.error("❌ getOrderDetailsJson Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const requestReturn = async (req, res) => {
  try {
    const { id, index } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const product = order.products[index];
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (product.status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Return only allowed after delivery" });
    }

    product.returnRequested = true;
    product.returnReason = reason;
    await order.save();

    res.json({ success: true, message: "Return requested. Admin will review." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const approveReturn = async (req, res) => {
  try {
    const { id, index } = req.params;
    const order = await Order.findById(id).populate("userId");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const product = order.products[index];
    if (!product || !product.returnRequested) {
      return res.status(400).json({ success: false, message: "No return requested for this product" });
    }
    product.status = "Returned";
    product.returnRequested = false;
     recalculateOrderStatus(order);
    await order.save();
    const User = require("../../models/userSchema");
    const user = await User.findById(order.userId._id);
    user.wallet = (user.wallet || 0) + product.price;
    await user.save();

    res.json({ success: true, message: "Return approved and wallet updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const rejectReturn = async (req, res) => {
  try {
    const { id, index } = req.params;

    const order = await Order.findById(id);
    if (!order) return res.json({ success: false, message: "Order not found" });

    const product = order.products[index];
    if (!product || !product.returnRequested) {
      return res.json({ success: false, message: "No return request found" });
    }

    product.returnRequested = false;
    product.returnReason = "";

    await order.save();

    res.json({ success: true, message: "Return rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout,
  loadOrders,
  viewOrderDetails,
  updateOrderStatus,
  updateProductStatus,
  getOrderDetailsJson,
  requestReturn,
  approveReturn,
  rejectReturn

};
