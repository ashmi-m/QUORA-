const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");

const MAX_QTY = 5;


function applyOffer(product) {
  const categoryOffer = product.category?.categoryOffer || 0;
  const productOffer = product.productOffer || 0;
  const effectiveOffer = Math.max(productOffer, categoryOffer);

  product.effectiveOffer = effectiveOffer;
  product.salePrice =
    effectiveOffer > 0
      ? Math.round(product.regularPrice - (product.regularPrice * effectiveOffer) / 100)
      : null;
}



const loadCartPage = async (req, res) => {
  try {
    console.log("USER:", req.user);

    const cart = await Cart.findOne({ userId: req.user._id })
      .populate({
        path: "items.productId",
        populate: { path: "category", select: "categoryOffer categoryName" }
      });

    console.log("CART:", cart);

    if (cart) {
      cart.items = cart.items.filter(item => item.productId != null);

      cart.items.forEach(item => {
        if (item.productId) {
          applyOffer(item.productId);

          const price =
            item.productId.salePrice ?? item.productId.regularPrice;

          item.price = price;
          item.totalPrice = price * item.quantity;
        }
      });
    }

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




const getCartItems = async (req, res) => {
  try {

    const items = await Cart.find({ userId: req.user._id })
      .populate({
        path: "items.productId",
        populate: { path: "category", select: "categoryOffer categoryName" }
      });

    items.forEach(cart => {
      cart.items.forEach(item => {
        if (item.productId) {
          applyOffer(item.productId);

          const price =
            item.productId.salePrice ?? item.productId.regularPrice;

          item.price = price;
          item.totalPrice = price * item.quantity;
        }
      });
    });

    res.json(items);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const addToCart = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first"
      });
    }

    const userId = req.session.user._id;
    const { productId } = req.body;

    const product = await Product.findById(productId)
      .populate({ path: "category", select: "categoryOffer" });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (
      product.isBlocked ||
      product.isListed === false ||
      !product.category ||
      product.category.isBlocked ||
      product.category.isListed === false
    ) {
      return res.status(403).json({
        success: false,
        message: "This product is unavailable"
      });
    }

    if (product.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock"
      });
    }

    applyOffer(product);

    const price = product.salePrice ?? product.regularPrice;

    let cart = await Cart.findOne({ userId });

    if (!cart) {

      cart = new Cart({
        userId,
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

        if (cart.items[index].quantity >= MAX_QTY) {
          return res.status(400).json({
            success: false,
            message: `You can only buy ${MAX_QTY} units`
          });
        }

        if (cart.items[index].quantity >= product.quantity) {
          return res.status(400).json({
            success: false,
            message: `Only ${product.quantity} items available in stock`
          });
        }

        cart.items[index].quantity += 1;
        cart.items[index].totalPrice =
          cart.items[index].quantity * price;

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

    await Wishlist.updateOne(
      { userId },
      { $pull: { items: { productId } } }
    );

    return res.status(200).json({
      success: true,
      message: "Product added to cart"
    });

  } catch (error) {
    console.error("Add to Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


const updateCartItem = async (req, res) => {
  try {

    const { itemId, action } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id })
      .populate({
        path: "items.productId",
        populate: { path: "category", select: "categoryOffer" }
      });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const product = item.productId;

    applyOffer(product);

    const price = product.salePrice ?? product.regularPrice;

    if (action === "inc") {

      if (item.quantity >= MAX_QTY) {
        return res.status(400).json({
          message: `You can only buy ${MAX_QTY} units`
        });
      }

      item.quantity += 1;
    }

    if (action === "dec") {

      if (item.quantity <= 1) {
        return res.status(400).json({
          message: "Minimum quantity is 1"
        });
      }

      item.quantity -= 1;
    }

    if (item.quantity > product.quantity) {
      return res.status(400).json({
        message: `Only ${product.quantity} items available`
      });
    }

    item.price = price;
    item.totalPrice = item.quantity * price;

    await cart.save();

    res.json({
      message: "Quantity updated",
      quantity: item.quantity,
      totalPrice: item.totalPrice
    });

  } catch (err) {
    console.error("Update cart error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const removeCartItem = async (req, res) => {
  try {

    const { itemId } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    item.deleteOne();
    await cart.save();

    res.json({ success: true, message: "Item removed successfully" });

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