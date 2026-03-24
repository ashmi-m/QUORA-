const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Wishlist = require("../../models/wishlistSchema");

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
const loadShopPage = async (req, res) => {
  try {
    const {
      category,
      brand,
      sort,
      priceRange,
      search,
      page = 1,
    } = req.query;

   
    let query = { isBlocked: false };
    const limit = 12;
    const currentPage  = parseInt(req.query.page) || 1;
    const skip = (currentPage - 1) * limit;

    //category
    let selectedCategory  = [];
    if (category) {
      const categoryArray = Array.isArray(category)
        ? category
        : [category];

      selectedCategory  = categoryArray.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (selectedCategory.length) {
        query.category = { $in: selectedCategory };
      }
    }

    //brand
    let selectedBrand = [];
    if (brand) {
      const brandArray = Array.isArray(brand) ? brand : [brand];

      selectedBrand = brandArray.filter(id => mongoose.Types.ObjectId.isValid(id));

      if (selectedBrand.length) {
        query.brand = { $in: selectedBrand };
      }
    }

    //search
    const searchQuery = search?.trim() || "";
    if (searchQuery) {
      query.productName = { $regex: searchQuery, $options: "i" ,};
    }

    //price rage
    let selectedPriceRange = priceRange || "";

    if (selectedPriceRange === "under500"){
         query.regularPrice = { $lt: 500 };
    }else if (selectedPriceRange === "500-1000"){
        query.regularPrice = { $gte: 500, $lte: 1000 };
    }else if (selectedPriceRange === "1000-5000") {
      query.regularPrice = { $gte: 1000, $lte: 5000 };
    }else if (selectedPriceRange === "5000-15000"){
      query.regularPrice = { $gte: 5000, $lte: 15000 };
    }else if (selectedPriceRange === "above15000") {
      query.regularPrice = { $gt: 15000 };
    }

    let sortQuery = { createdAt: -1 };

    if (sort === "low-high") {
      sortQuery = { regularPrice: 1 };
    } else if (sort === "high-low") {
      sortQuery = { regularPrice: -1 };
    } else if (sort === "a-z") {
      sortQuery = { productName: 1 };
    } else if (sort === "z-a") {
      sortQuery = { productName: -1 };
    }


    const [products, totalProducts, categories, brands] = await Promise.all([
      Product.find(query)
        .populate({ path: "category", select: "categoryOffer categoryName" })
        .populate("brand")
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      Category.find({ isListed: true }).lean(),
      Brand.find({ isBlocked: false }).lean(),
    ]);

products.forEach(applyOffer);

// if (sort  === "low-high") {
//       products.sort((a, b) => {
//         (a.salePrice ?? a.regularPrice) -
//         (b.salePrice ?? b.regularPrice)
//       });
//     } else if (sort === "high-low") {
//       products.sort((a, b) => {
//           (b.salePrice ?? b.regularPrice) -
//           (a.salePrice ?? a.regularPrice)
//       });
//     }
    
    //whislist
    if (req.user) {
      const wishlist = await Wishlist.findOne({ userId: req.user._id }).lean();

      const wishlistedIds = wishlist ? wishlist.items.map(i => i.productId.toString()) : [];
      
      products.forEach((product) => {
        product.isWishlisted = wishlistedIds.includes(product._id.toString());
      });
    } else {
      products.forEach(p => (p.isWishlisted = false));
    }
    const totalPages = Math.ceil(totalProducts / limit);
    return res.render("shop", {
      products,
      categories,
      brands,
      selectedCategory,
      selectedBrand,
      sortOption : sort || "",
      priceRange : selectedPriceRange,
      searchQuery,
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
     applyOffer(product);

   const categoryOffer = product.category?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const effectiveOffer = Math.max(productOffer, categoryOffer);

  product.effectiveOffer = effectiveOffer;
    product.salePrice = effectiveOffer > 0
      ? Math.round(product.regularPrice - (product.regularPrice * effectiveOffer / 100))
      : null;
    const categoryId = product.category?._id || product.category;

    const relatedProducts = await Product.find({
      _id: { $ne: productId },
      category: product.category?._id,
      isBlocked: false,
    }).limit(4).lean();

       relatedProducts.forEach(rp => {
      const catOffer = rp.category?.categoryOffer || 0;
      const prodOffer = rp.productOffer || 0;
      const effOffer = Math.max(prodOffer, catOffer);
      rp.effectiveOffer = effOffer;
      rp.salePrice = effOffer > 0
        ? Math.round(rp.regularPrice - (rp.regularPrice * effOffer / 100))
        : null;
    });


    console.log("Related Products Found:", relatedProducts.length);
    let isWishlisted = false;
    if (req.user) {
      const wishlist = await Wishlist.findOne({
        userId: req.user._id,
        "items.productId": productId,
      });
      isWishlisted = !!wishlist;
    }
    res.render("productdetails", { product, relatedProducts, isWishlisted });
  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
}



module.exports = {
  loadShopPage,
  loadProductDetails,

}
