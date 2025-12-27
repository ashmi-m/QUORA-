// const Cart = require("../models/cartSchema");
// const Address = require("../models/addressSchema");
// const Order = require("../models/orderSchema");

// // Load payment page
// const loadPayment = async (req, res) => {
//   try {
//     const userId = req.session.user?._id || "user123";
//     const addressId = req.session.selectedAddress;

//     if (!addressId) return res.redirect("/checkout");

//     const cart = await Cart.findOne({ userId }).populate("items.productId").lean();
//     if (!cart || cart.items.length === 0) return res.redirect("/checkout");

//     const address = await Address.findById(addressId).lean();
//     let total = 0;
//     cart.items.forEach(item => { total += item.productId.price * item.quantity; });

//     res.render("payment", { cartItems: cart.items, address, total });
//   } catch (err) {
//     console.error(err);
//     res.redirect("/checkout");
//   }
// };

// // Place order
// const placeOrder = async (req, res) => {
//   try {
//     const userId = req.session.user?._id || "user123";
//     const { paymentMethod } = req.body;
//     const addressId = req.session.selectedAddress;

//     if (!paymentMethod || !addressId) return res.redirect("/checkout/payment");

//     const cart = await Cart.findOne({ userId }).populate("items.productId").lean();
//     if (!cart || cart.items.length === 0) return res.redirect("/checkout");

//     let total = 0;
//     const products = cart.items.map(item => {
//       total += item.productId.price * item.quantity;
//       return { productId: item.productId._id, quantity: item.quantity, price: item.productId.price };
//     });

//     await Order.create({
//       userId,
//       address: addressId,
//       products,
//       totalAmount: total,
//       paymentMethod,
//       status: paymentMethod.toLowerCase() === "cod" ? "Placed" : "Pending"
//     });

//     await Cart.deleteOne({ userId });
//     delete req.session.selectedAddress;

//     res.send("Order placed successfully!");
//   } catch (err) {
//     console.error(err);
//     res.redirect("/checkout/payment");
//   }
// };

// module.exports = { loadPayment, placeOrder };
