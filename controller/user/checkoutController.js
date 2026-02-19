
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");

const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .lean();

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;

    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];
    const paginatedAddresses = addresses.slice(skip, skip + limit);
    const totalPages = Math.ceil(addresses.length / limit);
    let subtotal = 0;

    const itemsWithTotal = cart.items.map(item => {
      const product = item.productId;
      if (!product) return null;

      const regularPrice = Number(product.regularPrice || 0);
      const discount = Number(product.productOffer || 0);
      const price = regularPrice - (regularPrice * discount) / 100; 
      const quantity = Number(item.quantity || 1);
      const itemTotal = price * quantity;

      subtotal += itemTotal;

      return {
        ...item,
        productName: product.productName,
        price,
        quantity,
        itemTotal
      };
    }).filter(Boolean); 

    const deliveryCharge = subtotal > 1000 ? 0 : 50;
    const total = subtotal + deliveryCharge;

    res.render("checkout", {
      cart: { ...cart, items: itemsWithTotal },
      addresses: paginatedAddresses,
      subtotal,
      deliveryCharge,
      total,
      currentPage: page,
      totalPages
    });

  } catch (error) {
    console.error("CHECKOUT ERROR ❌", error);
    res.redirect("/cart");
  }
};

const selectAddress = (req, res) => {
  const { addressId } = req.body;
  if (!addressId) return res.redirect("/checkout");

  req.session.selectedAddress = addressId;
  res.redirect("/checkout/payment");
};

module.exports = {
  loadCheckoutPage,
  selectAddress
};
