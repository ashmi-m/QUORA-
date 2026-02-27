
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

module.exports = {
  getCouponPage,
  addCoupon,
  toggleCoupon,
  updateCoupon,
  deleteCoupon
};