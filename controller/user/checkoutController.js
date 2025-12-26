const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");

const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId })
      .populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    // ✅ GET SINGLE ADDRESS DOCUMENT
    const addressDoc = await Address.findOne({ userId }).lean();

    // 🔥 EXTRACT INNER ARRAY
    const addresses = addressDoc ? addressDoc.addresses : [];

    let subtotal = 0;
    cart.items.forEach(item => subtotal += item.totalPrice);

    const deliveryCharge = subtotal > 1000 ? 0 : 50;
    const total = subtotal + deliveryCharge;

    res.render("checkout", {
      cart,
      addresses,
      subtotal,
      deliveryCharge,
      total
    });

  } catch (err) {
    console.error(err);
    res.redirect("/cart");
  }
};




module.exports = {
  loadCheckoutPage,

};
