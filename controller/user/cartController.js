

const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");

const MAX_QTY = 5;

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




const addToCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    const userId = req.session.user._id;
    const { productId } = req.body;

    const product = await Product.findById(productId).populate("category");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.isBlocked || product.isListed === false) {
      return res.status(403).json({ success: false, message: "This product is unavailable" });
    }

    if (!product.category || product.category.isBlocked || product.category.isListed === false) {
      return res.status(403).json({ success: false, message: "This product category is unavailable" });
    }

    const price = product.salePrice ?? product.regularPrice;
    if (!price) {
      return res.status(500).json({ success: false, message: "Product price missing" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId: product._id, quantity: 1, price, totalPrice: price }]
      });
    } else {
      const index = cart.items.findIndex(item => item.productId.toString() === productId);

      if (index > -1) {
        if (cart.items[index].quantity >= MAX_QTY) {
          return res.status(400).json({
            success: false,
            message: `You can only buy ${MAX_QTY} units of this product`
          });
        }

        cart.items[index].quantity += 1;
        cart.items[index].totalPrice = cart.items[index].quantity * cart.items[index].price;
      } else {
        cart.items.push({ productId: product._id, quantity: 1, price, totalPrice: price });
      }
    }

    await cart.save();


    await Wishlist.updateOne(
      { userId },
      { $pull: { items: { productId } } }
    );

    return res.status(200).json({
      success: true,
      message: "Product added to cart and removed from wishlist"
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
        populate: { path: "category" }
      });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const product = item.productId;
    if (product.isBlocked || product.isListed === false) {
      return res.status(403).json({
        message: "This product is no longer available"
      });
    }
    if (!product.category || product.category.isBlocked || product.category.isListed === false) {
      return res.status(403).json({
        message: "This product category is no longer available"
      });
    }

      if (action === "inc") {
      if (item.quantity >= MAX_QTY) {
        return res.status(400).json({
          message: `You can only buy ${MAX_QTY} units`
        });
      }
      if (item.quantity >= product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} items in stock`
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
    item.totalPrice = item.quantity * item.price;
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
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

 
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
