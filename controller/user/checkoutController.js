
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");

const loadCheckoutPage = async (req, res) => {
  try {
    // const userId = req.user._id;
 const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .lean();

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const addressDoc = await Address.findOne({ userId }).lean();
    console.log(addressDoc,'=kvgvhbn============')
    const addresses = addressDoc?.addresses || [];
    console.log(addresses,'==========================')


    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.totalPrice;
    });

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
    console.error("CHECKOUT ERROR ❌", err);
    res.redirect("/cart");
  }
};

const selectAddress = (req, res) => {
  const { addressId } = req.body;
  if (!addressId) return res.redirect("/checkout");

  req.session.selectedAddress = addressId;
  res.redirect("/checkout/payment");
};


module.exports = { loadCheckoutPage ,
  selectAddress
};
