const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const loadPrivacySecurity = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id).lean();

    const cart = await Cart.findOne({ userId: user._id }).lean();
    const wishlist = await Wishlist.findOne({ userId: user._id }).lean();

    res.render("privacy-security", {
  user,
  cartCount: cart ? cart.items.length : 0,
  wishlistCount: wishlist ? wishlist.items.length : 0
});


  } catch (error) {
    console.error("Error loading privacy & security:", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = {
  
  loadPrivacySecurity
};