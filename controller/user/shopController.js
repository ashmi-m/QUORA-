
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const env = require("dotenv").config();

const bcrypt = require("bcrypt");

const loadShopPage = async(req,res)=>{
    try{
        let page = parseInt(req.query.page)||1;
       let limit = 8;
       let skip =(page-1)*limit;

       const category = req.query.category;

       let query = {};
       if(category){
        query.category = category
       }

       const totalProducts = await Product.countDocuments(query);
       const products = await Product.find(query)
       .populate("category")
       .skip(skip)
       .limit(limit)
       .lean();
     
        const totalPages = Math.ceil(totalProducts / limit);
     const categories = await Category.find().lean();

    return res.render("shop", {
      products,
     categories,
      selectedCategory: category,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error loading shop page", error);
    res.status(500).send("Server Error");
  }
};

  

const loadProductDetails = async(req,res)=>{
    try{
        const productId = req.params.id;
        const product = await Product.findById(productId).lean();
        if(!product){
            return res.redirect("/pageNotFound");
        }

        const relatedProducts = await Product.find({
            _id:{$ne: productId},
            category:product.category
        }).limit(4).lean();

        res.render("productDetails",{product,relatedProducts});
    }catch(error){
        console.error(error);
        res.redirect("/pageNotFound");
    }
}


module.exports ={
    loadShopPage,
    loadProductDetails,
}









