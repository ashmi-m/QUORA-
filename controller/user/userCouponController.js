const Cart = require('../../models/cartSchema');
const Coupon = require('../../models/couponSchema');

const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.session.user;

    if (!code) {
      return res.json({ success: false, message: "Enter coupon code" });
    }
    if (req.session.appliedCoupon) {
      return res.json({ success: false, message: "Coupon already applied" });
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon" });
    }
    if (coupon.expiryDate < new Date()) {
      return res.json({ success: false, message: "Coupon expired" });
    }
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    let subtotal = 0;

    cart.items.forEach(item => {
      const product = item.productId;
      const price = product.salePrice || product.regularPrice;
      subtotal += price * item.quantity;
    });
    if (subtotal < coupon.minimumPurchase) {
      return res.json({
        success: false,
        message: `Minimum purchase ₹${coupon.minimumPurchase}`
      });
    }
    let discount = 0;

    if (coupon.discountType === "percentage") {
      discount = (subtotal * coupon.discountValue) / 100;

      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }
    req.session.appliedCoupon = {
      code: coupon.code,
      discountAmount: discount
    };

    const deliveryCharge = 50; 
    const grandTotal = subtotal + deliveryCharge - discount;

    res.json({
      success: true,
      message: "Coupon applied successfully",
      discount,
      grandTotal
    });

  } catch (error) {
    console.error("Apply Coupon Error:", error);
    res.json({ success: false, message: "Server error" });
  }
};

const removeCoupon = (req, res) => {
  req.session.appliedCoupon = null;

  res.json({
    success: true,
    message: "Coupon removed"
  });
};

module.exports = { 
    applyCoupon ,
     removeCoupon
};

