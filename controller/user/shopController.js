const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Wishlist = require("../../models/wishlistSchema");


const loadShopPage = async (req, res) => {
  try {

    const categoriesParam = req.query.category || [];
    const brandsParam = req.query.brand || [];
    const sortOption = req.query.sort || "";
     const priceRange = req.query.priceRange || "";
        const searchQuery = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
       const skip = (page - 1) * limit;

       let query = {isBlocked:false};
       let selectedCategories = [];

    if (categoriesParam.length) {
      const categoryArray = Array.isArray(categoriesParam)
        ? categoriesParam
        : [categoriesParam];

      selectedCategories = categoryArray.filter(id =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (selectedCategories.length) {
        query.category = { $in: selectedCategories };
      }
    }

 let selectedBrands = [];
 
    if (brandsParam.length) {
      const brandArray = Array.isArray(brandsParam)
        ? brandsParam
        : [brandsParam];

      selectedBrands = brandArray.filter(id =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (selectedBrands.length) {
        query.brand = { $in: selectedBrands };
      }
    }
    if (searchQuery && searchQuery.trim().length > 0) {
  query.productName = {
    $regex: searchQuery.trim(),
    $options: "i"
  };
}

if (priceRange === "under500") {
      query.regularPrice = { $lt: 500 };
    } else if (priceRange === "500-1000") {
      query.regularPrice = { $gte: 500, $lte: 1000 };
    } else if (priceRange === "1000-5000") {
      query.regularPrice = { $gte: 1000, $lte: 5000 };
    } else if (priceRange === "5000-15000") {
      query.regularPrice = { $gte: 5000, $lte: 15000 };
    } else if (priceRange === "above15000") {
      query.regularPrice = { $gt: 15000 };
    }

  let sortQuery = {};
    if (sortOption === "low-high") {
      sortQuery.regularPrice = 1;
    } else if (sortOption === "high-low") {
      sortQuery.regularPrice = -1;
    } else if (sortOption === "a-z") {
      sortQuery.productName = 1;
    } else if (sortOption === "z-a") {
      sortQuery.productName = -1;
    }

    console.log("Query:", query);
    console.log("Sort:", sortQuery);
   console.log("Category ID:", selectedCategories);
console.log("Brand ID:", selectedBrands);
     const [products, totalProducts, categories, brands] = await Promise.all([
      Product.find(query)
        .populate("category")
        .populate("brand")
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      // Category.find().lean(),
      // Brand.find().lean(),
      Category.find({ isListed: true }).lean(),
      Brand.find({ isBlocked: false }).lean(),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);
    console.log("Products found:", products.length);
    console.log("Total Products:", totalProducts);

    res.render("shop", {
      products,
      categories,
      brands,
      selectedCategory: selectedCategories,
      selectedBrand: selectedBrands,
      sortOption: sortOption,
      priceRange: priceRange,
      searchQuery: searchQuery,
      totalPages,
      currentPage: page,
 
    });
  } catch (error) {
    console.error("Error loading shop page", error);
    res.status(500).send("Internal Server Error");
  }
};


const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId)
    .populate("category")
    .populate("brand")
    .lean();
    if (!product) {
      return res.redirect("/pageNotFound");
    }
     const categoryId = product.category?._id || product.category;

    const relatedProducts = await Product.find({
      _id: { $ne: productId },
      category: product.category?._id,
       isBlocked: false,
    }).limit(4).lean();
     console.log("Related Products Found:", relatedProducts.length);
    let isWishlisted = false;
    if (req.user) {
      const wishlist = await Wishlist.findOne({
        userId: req.user._id,
        "items.productId": productId,
      });
      isWishlisted = !!wishlist;
    }
    res.render("productDetails", { product, relatedProducts,isWishlisted });
  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
}



module.exports = {
  loadShopPage,
  loadProductDetails,
  
}
