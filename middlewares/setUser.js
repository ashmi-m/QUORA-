

// module.exports = (req, res, next) => {
//   if (req.user && !req.session.user) {
//     req.session.user = req.user;
//   }

//   res.locals.user = req.session.user || null;
//   next()
// }

const Cart = require("../models/cartSchema");
const Wishlist = require("../models/wishlistSchema");
module.exports = async (req, res, next) => {
  try {

    if (req.user && !req.session.user) {
      req.session.user = req.user;
    }

    const user = req.session.user || null;
    res.locals.user = user;

    let cartCount = 0;
        let wishlistCount = 0; 

    if (user) {
      const cart = await Cart.findOne({ userId: user._id }).lean();

      if (cart && cart.items.length > 0) {
        cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      }
   const wishlist = await Wishlist.findOne({ userId: user._id }).lean();
      if (wishlist && wishlist.items.length > 0) {
        wishlistCount = wishlist.items.length;
      }
    }
    

    res.locals.cartCount = cartCount;
     res.locals.wishlistCount = wishlistCount;

    next();

  } catch (err) {
    console.error("setUser error:", err);
    res.locals.cartCount = 0;
      res.locals.wishlistCount = 0;
    next();
  }
};