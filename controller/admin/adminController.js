
const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");


const pageerror=async(req,res)=>{
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
            console.log("error in loaddashborad function",error);
            
            res.redirect("/pageerror");
        }
    } else {
        res.redirect("/admin/login");  
    }
}

const logout=async(req,res)=>{
try {
    req.session.destroy(err=>{
        if(err){
            console.log("Error destroying session",err);
            return res.redirect("/pageerror")
        }
        res.redirect("/admin/login")
    })
} catch (error) {
    console.log("unexpected error during logout",error);
    res.redirect("/pageerror")
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

    // ✅ Status filter
    if (status !== "All") {
      matchStage.status = status;
    }

    // ✅ Search logic
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
      // 🔹 JOIN USER
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      // 🔹 JOIN PRODUCTS
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productsData"
        }
      },

      // 🔹 APPLY FILTERS
      { $match: matchStage },

      // 🔹 SORT
      { $sort: { createdAt: -1 } },

      // 🔹 PAGINATION
      { $skip: skip },
      { $limit: limit }
    ];

    const rawOrders = await Order.aggregate(pipeline);

    // ✅ 🔥 IMPORTANT PART — RESHAPE DATA FOR EJS
    const orders = rawOrders.map(order => {
      return {
        ...order,

        // 👇 make EJS happy (order.userId.name)
        userId: order.user,

        // 👇 rebuild products[].productId
        products: order.products.map((p, index) => ({
          ...p,
          productId: order.productsData[index] || null
        }))
      };
    });

    // 🔢 COUNT FOR PAGINATION
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
const updateProductStatus = async (req, res) => {
  try {
    const { id, index } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).send("Order not found");

    order.products[index].status = status;
    await order.save();

    res.redirect(`/admin/orders/${id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
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
  updateProductStatus 
};
