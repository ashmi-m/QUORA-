
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
    const orders = await Order.find({})
      .populate("userId", "name email phone")   
      .populate("products.productId")
      .sort({ createdAt: -1 });

    res.render("orders", { orders });
  } catch (error) {
    console.log(error);
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

    res.render("orderDetails", { order });
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

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout,
  loadOrders,
  viewOrderDetails,
  updateOrderStatus
};
