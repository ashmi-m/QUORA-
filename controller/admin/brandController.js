const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");


const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const brandData = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);

    res.render("brands", {
      data: brandData,
      currentPage: page,
      limit,
      totalPages,
      totalBrands,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pageerror");
  }
};

const addBrand = async (req, res) => {
  try {
    const { brandName } = req.body;
    if (!brandName || !req.file) {
      return res.status(400).json({
        success:false,
        error:"Brand name and logo are required"
      });
    }

    const imagePath = req.file.path; // Cloudinary URL or local path

    const newBrand = new Brand({
      brandName,
      brandImage: imagePath,
      isBlocked: false,
    });

    await newBrand.save();
    res.status(200).json({ success: true, message: "Brand added successfully", brand: newBrand });
  } catch (error) {
    console.error("Error adding brand:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// const deleteBrand = async (req, res) => {
//   try {
//     console.log("deletebrand",req.params.id)
//     await Brand.findByIdAndDelete(req.params.id);

//     return res.json({ success: true, message: "Brand deleted successfully" });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, error: "Failed to delete brand" });
//   }
// };
const unblockBrand = async (req, res) => {
  try {
    console.log('UNBLOCK request received - id:', req.params.id);
    await Brand.findByIdAndUpdate(req.params.id, { isBlocked: false });
    return res.json({ success: true, message: "Brand unblocked successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to unblock brand" });
  }
};

const blockBrand = async (req, res) => {
  try {
    console.log('BLOCK request received - id:', req.params.id, 'by user:', req.session?.admin || req.user);
    await Brand.findByIdAndUpdate(req.params.id, { isBlocked: true });
    return res.json({ success: true, message: "Brand blocked successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to block brand" });
  }
};





module.exports = {
  getBrandPage,
  addBrand,
  blockBrand,
  unblockBrand,
};
