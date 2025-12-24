

const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");

// Load Cart Page
const loadCartPage = async (req, res) => {
  try {
    console.log("USER:", req.user);

    const cart = await Cart.findOne({ userId: req.user._id })
      .populate("items.productId");

    console.log("CART:", cart);

    return res.render("cartitem", { cart });

  } catch (err) {
    console.error("Cart page error:", err);

    const now = new Date();
    const currentTime = now.toLocaleString();

    return res
      .status(500)
      .send(`Internal Server Error — Current Time: ${currentTime}`);
  }
};

// Get Cart Items (JSON)
const getCartItems = async (req, res) => {
  try {
    const items = await Cart.find({ userId: req.user._id })
      .populate("items.productId"); 

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Add to Cart


const addToCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Please login first" });
    }

    const { productId } = req.body;

    // 1️⃣ Find product + populate category
    const product = await Product.findById(productId)
      .populate("category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2️⃣ Product validation
    if (product.isBlocked || product.isListed === false) {
      return res.status(403).json({
        message: "This product is unavailable"
      });
    }

    // 3️⃣ Category validation
    if (
      !product.category ||
      product.category.isBlocked ||
      product.category.isListed === false
    ) {
      return res.status(403).json({
        message: "This product category is unavailable"
      });
    }

    // 4️⃣ Price validation
    const price = product.salePrice ?? product.regularPrice;
    if (!price) {
      return res.status(500).json({ message: "Product price missing" });
    }

    // 5️⃣ Find or create cart
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        items: [{
          productId: product._id,
          quantity: 1,
          price,
          totalPrice: price
        }]
      });
    } else {
      const index = cart.items.findIndex(
        item => item.productId.toString() === productId
      );

      if (index > -1) {
        cart.items[index].quantity += 1;
        cart.items[index].totalPrice =
          cart.items[index].quantity * cart.items[index].price;
      } else {
        cart.items.push({
          productId: product._id,
          quantity: 1,
          price,
          totalPrice: price
        });
      }
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Product added to cart"
    });

  } catch (error) {
    console.error("Add to Cart Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


const updateCartItem = async (req, res) => {
  try {
    const { itemId, action } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id })
      .populate({
        path: "items.productId",
        populate: { path: "category" }
      });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const product = item.productId;

    // 🚫 PRODUCT CHECK
    if (product.isBlocked || product.isListed === false) {
      return res.status(403).json({
        message: "This product is no longer available"
      });
    }

    // 🚫 CATEGORY CHECK
    if (
      !product.category ||
      product.category.isBlocked ||
      product.category.isListed === false
    ) {
      return res.status(403).json({
        message: "This product category is no longer available"
      });
    }

    if (action === "inc") item.quantity += 1;
    else if (action === "dec" && item.quantity > 1) item.quantity -= 1;

    item.totalPrice = item.quantity * item.price;

    await cart.save();
    res.json({ message: "Quantity updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // Remove the item using filter
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item._id.toString() !== itemId.toString());

    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: "Item not found" });
    }

    await cart.save();
    res.json({ message: "Item removed successfully" });
  } catch (err) {
    console.error("Remove Cart Item Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



module.exports = {
  loadCartPage,
  getCartItems,
  addToCart,
    updateCartItem,
  removeCartItem

};
