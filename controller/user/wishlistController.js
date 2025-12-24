const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");

const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id; // assuming you have user in req.user
    const wishlist = await Wishlist.findOne({ userId }).populate('items.productId').lean();

    res.render('wishlist', {
      wishlist: wishlist ? wishlist.items : []
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [{ productId }] });
    } else {
      // prevent duplicates
      if (!wishlist.items.some(item => item.productId.toString() === productId)) {
        wishlist.items.push({ productId });
      }
    }

    await wishlist.save(); // save the changes
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

// Export functions correctly
module.exports = {
  getWishlist,
  addToWishlist
};
