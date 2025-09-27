
const Product = require("../../models/productSchema");
const env = require("dotenv").config();

const bcrypt = require("bcrypt");


const loadShopPage = async(req,res)=>{
    try {
 const products = await Product.find()
 console.log("product is",products)
       return res.render("shop",{products});
    } catch (error) {
        console.error("Error loading shop page",error);
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
    loadProductDetails
}









