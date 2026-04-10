

// module.exports = (req, res, next) => {
//   if (req.user && !req.session.user) {
//     req.session.user = req.user;
//   }

//   res.locals.user = req.session.user || null;
//   next()
// }

const Cart = require("../models/cartSchema");

module.exports = async (req, res, next) => {
  try {

    if (req.user && !req.session.user) {
      req.session.user = req.user;
    }

    const user = req.session.user || null;
    res.locals.user = user;

    let cartCount = 0;

    if (user) {
      const cart = await Cart.findOne({ userId: user._id }).lean();

      if (cart && cart.items.length > 0) {
        cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }

    

    res.locals.cartCount = cartCount;

    next();

  } catch (err) {
    console.error("setUser error:", err);
    res.locals.cartCount = 0;
    next();
  }
};