
// const Cart = require("../../models/cartSchema");
// const Address = require("../../models/addressSchema");

// const loadCheckoutPage = async (req, res) => {
//   try {
//     const userId = req.session.user._id;

//     const cart = await Cart.findOne({ userId })
//       .populate("items.productId")
//       .lean();

//     if (!cart || cart.items.length === 0) {
//       return res.redirect("/cart");
//     }
//     const page = parseInt(req.query.page) || 1; // current page
//     const limit = 3; 
//     const skip = (page - 1) * limit;

//     const addressDoc = await Address.findOne({ userId }).lean();
//     const addresses = addressDoc?.addresses || [];
//      const paginatedAddresses = addresses.slice(skip, skip + limit);
//     const totalPages = Math.ceil(addresses.length / limit);

//     let subtotal = 0;

//     cart.items.forEach(item => {
//       const price = Number(item.productId?.price || 0);
//       const quantity = Number(item.quantity || 0);
//       subtotal += price * quantity;
//     });

//     const deliveryCharge = subtotal > 1000 ? 0 : 50;
//     const total = subtotal + deliveryCharge;

//     res.render("checkout", {
//       cart,
//       addresses,
//       subtotal,
//       deliveryCharge,
//       total,
//         currentPage: page,      
//   totalPages  
//     });

//   } catch (error) {
//     console.error("CHECKOUT ERROR ❌", error);
//     res.redirect("/cart");
//   }
// };

// const selectAddress = (req, res) => {
//   const { addressId } = req.body;
//   if (!addressId) return res.redirect("/checkout");

//   req.session.selectedAddress = addressId;
//   res.redirect("/checkout/payment");
// };

// module.exports = {
//   loadCheckoutPage,
//   selectAddress
// };
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");

const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // fetch cart and populate product details
    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .lean();

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    // pagination for addresses
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;

    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];
    const paginatedAddresses = addresses.slice(skip, skip + limit);
    const totalPages = Math.ceil(addresses.length / limit);

    // calculate item totals
    let subtotal = 0;

    const itemsWithTotal = cart.items.map(item => {
      const product = item.productId;
      if (!product) return null;

      const regularPrice = Number(product.regularPrice || 0);
      const discount = Number(product.productOffer || 0);
      const price = regularPrice - (regularPrice * discount) / 100; // price after discount
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
    }).filter(Boolean); // remove nulls

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
