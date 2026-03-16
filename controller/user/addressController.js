const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const mongoose = require("mongoose");
const addAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, city, state, landmark, type, from } = req.body;
    const userId = req.session.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    let addressDoc = await Address.findOne({ userId });

    const newAddress = {
      addressType: type,
      name,
      phone: mobile,
      city,
      state,
      landMark: landmark,
      pincode
    };

    if (addressDoc) {
      addressDoc.addresses.push(newAddress);
    } else {
      addressDoc = new Address({
        userId,
        addresses: [newAddress]
      });
    }

    await addressDoc.save();
    return res.json({
      success: true,
      from: from === "checkout" ? "checkout" : "profile"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};
const getAddresses = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];
    res.json({ success: true, addresses });
  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
};

const addAddressFromProfile = async (req, res) => {
  try {
    const { name, mobile, pincode, city, state, landmark, type } = req.body;
    const userId = req.session.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    let addressDoc = await Address.findOne({ userId });
    const newAddress = {
      addressType: type,
      name,
      phone: mobile,
      city,
       altPhone: mobile,
      state,
      landMark: landmark,
      pincode
    };

    if (addressDoc) {
      addressDoc.addresses.push(newAddress);
    } else {
      addressDoc = new Address({
        userId,
        addresses: [newAddress]
      });
    }
    await addressDoc.save();
    return res.json({
      success: true,
      redirect: "/manage-address"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const loadAddAddressPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    res.render("addAddress");
  } catch (error) {
    console.error("Load add address error:", error);
    res.redirect("/pageNotFound");
  }
};

const loadProfilePage = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id;

    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    const user = await User.findById(userId).lean();
    const orders = await Order.find({
      userId: req.session.user._id
    })
      .populate("products.productId")
      .populate("address")
      .sort({ createdAt: -1 });

    res.render("profile", { user, orders, addresses });
  } catch (error) {
    console.log("Error loading profile:", error);
    res.redirect("/pageNotFound");
  }
};
const updateProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false });
    }

    const { name, phone, gender } = req.body;

    await User.findByIdAndUpdate(req.session.user._id, {
      name,
      phone,
      gender
    });

    req.session.user.name = name;

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: "Update failed" });
  }
};

const loadEditAddressPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addressId = req.params.id;

    const addressDoc = await Address.findOne(
      { userId, "addresses._id": addressId },
      { "addresses.$": 1 }
    );

    if (!addressDoc || !addressDoc.addresses.length) {
      return res.redirect("/manage-address");
    }

    const address = addressDoc.addresses[0];

    res.render("editAddress", { address });

  } catch (error) {
    console.error("Edit address load error:", error);
    res.redirect("/manage-address");
  }
};


const updateAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addressId = req.params.id;
    const {
      name,
      phone,
      address,
      city,
      state,
      pincode,
      type
    } = req.body;

    const result = await Address.updateOne(
      { userId, "addresses._id": addressId },
      {
        $set: {
          "addresses.$.name": name,
          "addresses.$.phone": phone,
          "addresses.$.address": address,
          "addresses.$.city": city,
          "addresses.$.state": state,
          "addresses.$.pincode": pincode,
          "addresses.$.type": type
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send("Address not found");
    }

    res.redirect("/manage-address");

  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).send("Server error");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addressId = req.params.id;

    const result = await Address.updateOne(
      { userId },
      { $pull: { addresses: { _id: addressId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }

    res.json({
      success: true,
      message: "Address deleted successfully"
    });

  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const loadManageAddressPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id;
   const user = await User.findById(userId)
   console.log(user)
    const addressDoc = await Address.findOne({ userId }).lean();

    res.render("manageAddress", {
      user,
      addresses: addressDoc ? addressDoc.addresses : []
    });

  } catch (error) {
    console.error("Load manage address error:", error);
    res.redirect("/pageNotFound");
  }
};

const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false });
    }

    const imageUrl = req.file.path;

    await User.findByIdAndUpdate(req.session.user._id, {
      profileImage: imageUrl
    });
    req.session.user.profileImage = imageUrl;

    res.json({
      success: true,
      image: imageUrl
    });
  } catch (error) {
    console.error("Profile image error:", error);
    res.json({ success: false });
  }
};

const loadAboutPage = async (req, res) => {
  try {
    res.render('about');
  } catch (error) {
    console.log("About page error:", error);
    res.redirect('/pageNotFound');
  }
};

module.exports = {
  addAddress,
  getAddresses,
  addAddressFromProfile,
  loadAddAddressPage,
  loadProfilePage,
  updateProfile,
  loadEditAddressPage,
  updateAddress,
  deleteAddress,
  loadManageAddressPage,
  updateProfileImage,
  loadAboutPage
};

