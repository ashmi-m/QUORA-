
const Coupon = require("../../models/couponSchema");

const getCouponPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / limit);

    const coupons = await Coupon.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("coupon", { coupons, currentPage: page, totalPages });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};
const addCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      maxDiscount,
      description,
      limit,
      expiryDate,
      minimumPurchase
    } = req.body;


     const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    if (!expiryDate || isNaN(expiry.getTime()) || expiry < today) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be today or a future date"
      });
    }

    if (!code || !discountValue || !limit || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    const existing = await Coupon.findOne({
      code: code.toUpperCase()
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Coupon already exists"
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      description,
      limit: Number(limit),
      expiryDate: new Date(expiryDate),
      minimumPurchase: minimumPurchase ? Number(minimumPurchase) : 0,
      isActive: true
    });

    res.json({ success: true, coupon });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({ success: true, isActive: coupon.isActive });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};
const updateCoupon = async (req, res) => {
  try {
    const {
      code,
      discountValue,
      maxDiscount,
      limit,
      expiryDate,
      minimumPurchase,
      description
    } = req.body;

      const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (!expiryDate || isNaN(expiry.getTime()) || expiry < today) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be today or a future date"
      });
    }



    if (!code || !discountValue || !limit || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    const updated = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        code: code.toUpperCase(),
        discountValue: Number(discountValue),
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        limit: Number(limit),
        expiryDate: new Date(expiryDate),
        minimumPurchase: minimumPurchase ? Number(minimumPurchase) : 0,
        description
      },
      {
        new: true,
        runValidators: true   
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found"
      });
    }

    res.json({ success: true, coupon: updated });

  } catch (err) {
    console.log("UPDATE ERROR:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while updating coupon"
    });
  }
};


const deleteCoupon = async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};


const applyCoupon = async (req, res) => {
  try {

    const userId = req.session.user._id;
    const { code } = req.body;

     if (req.session.appliedCoupon) {
      return res.json({
        success: false,
        message: "A coupon is already applied. Remove it first."
      });
    }


    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.json({
        success: false,
        message: "Invalid coupon code"
      });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return res.json({
        success: false,
        message: "Coupon expired"
      });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    let subtotal = 0;

    cart.items.forEach(item => {
      const product = item.productId;

      const regularPrice = Number(product.regularPrice || 0);
      const discount = Number(product.productOffer || 0);

      const price = regularPrice - (regularPrice * discount) / 100;

      subtotal += price * item.quantity;
    });

    if (subtotal < coupon.minimumPurchase) {
      return res.json({
        success: false,
        message: `Minimum purchase ₹${coupon.minimumPurchase} required`
      });
    }

    let discountAmount = 0;

    if (coupon.discountType === "percentage") {

      discountAmount = subtotal * coupon.discountValue / 100;

      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }

    } else {

      discountAmount = coupon.discountValue;

    }

    req.session.appliedCoupon = {
      code: coupon.code,
      discountAmount
    };

    res.json({
      success: true,
      discount: discountAmount,
      message: "Coupon applied successfully"
    });

  } catch (error) {

    console.log("COUPON APPLY ERROR:", error);

    res.json({
      success: false,
      message: "Server error"
    });

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
  getCouponPage,
  addCoupon,
  toggleCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon ,
  removeCoupon
};