
const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");

const Cart = require("../../models/cartSchema");

const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

   
    const wishlistDoc = await Wishlist.findOne({ userId })
      .populate("items.productId")
      .lean();

    const wishlist = wishlistDoc ? wishlistDoc.items : [];

    console.log("Wishlist Doc:", wishlistDoc); 

    res.render("wishlist", { wishlist });
  } catch (err) {
    console.error("Error fetching wishlist:", err);
    res.status(500).send("Server Error");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID required"
      });
    }

    const cart = await Cart.findOne({
      userId,
      "items.productId": productId
    });

    if (cart) {
      return res.status(400).json({
        success: false,
        message: "Product already in cart"
      });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        items: [{ productId }]
      });
      await wishlist.save();

      return res.json({ success: true, added: true });
    }

    const alreadyExists = wishlist.items.some(
      item => item.productId.toString() === productId
    );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist"
      });
    }

    wishlist.items.push({ productId });
    await wishlist.save();

    res.json({ success: true, added: true });

  } catch (err) {
    console.error("Add to Wishlist Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) return res.status(400).json({ success: false, message: "No product ID" });

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) return res.status(404).json({ success: false, message: "Wishlist not found" });

    wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId);

    await wishlist.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing from wishlist:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};
