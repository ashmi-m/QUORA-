const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");
const cloudinary = require("../../config/cloudinary"); 
const Wishlist = require("../../models/wishlistSchema");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    res.render("product-add", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Error loading product add page", error);
    res.redirect("/admin/pageerror");
  }
};

const loadShopPage = async(req,res)=>{
  try {
    res.render("shop");
  } catch (error) {
    console.error("Error loading shop page",error);
    res.status(500).send("Server Error");
  }
};



const getProductsData = async (req, res) => {
  try {
   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 10;
   const skip = (page-1)*limit;
   const search = req.query.search?.trim()||"";

   const filter ={};
   if(search){
    filter.productName = {$regex:search,$options:"i"};
   }

   const total = await Product.countDocuments(filter);

   const products = await Product.find(filter)
   .populate("category","name")
   .populate("brand","brandName")
    .sort({ createdAt: -1 })
    
   .skip(skip)
   .limit(limit)
   .lean();


   res.json({
     success: true,
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      total
   });

  } catch (err) {
    console.error("Error fetching products:", err);
    res.json({ success: false, message: "Error fetching products" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.json({ success: false, message: "Error deleting product" });
  }
};

const getProductpage = async (req, res) => {
  try {
    const products = await Product.find()
     const brands = await Brand.find(); 
    console.log("product is",products)
   return res.render("products",{brands,products}); 
  } catch (error) {
    console.log("error  in the get product page",error);
    res.redirect("/admin/pageerror");
  }
};



const mongoose = require("mongoose");

const addProducts = async (req, res) => {
  try {
    console.log("req.body is addProducts", req.body);
    console.log(
      "req.files is",
      req.files && req.files.length
        ? req.files.map((f) => ({
          originalname: f.originalname,
          path: !!f.path,
          buffer: !!f.buffer,
        }))
        : req.files
    );

    const products = req.body;


    const productExists = await Product.findOne({
      productName: products.productName,
    });
    if (productExists) {
      return res.status(400).json({
        ok: false,
        error: "Product already exists, please try with another name",
      });
    }

    const imageUrls = [];
const productImages = [];

if (req.files && req.files.length > 0) {
  for (const file of req.files) {
    if (file.path && file.path.startsWith("http")) {
      productImages.push(file.path);
      continue;
    }

    if (file.path) {
      try {
        const resizedBuffer = await sharp(file.path)
          .resize(440, 440, { fit: "inside" })
          .toBuffer();

        const uploadResponse = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (error) return reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(resizedBuffer);
        });

        productImages.push(uploadResponse.secure_url);
      } catch (error) {
        console.error("Sharp processing failed:", error.message);
      }
    }
  }
 } else {
      return res
        .status(400)
        .json({ ok: false, error: "At least one image is required" });
    } 


    const categoryDoc = await Category.findById(products.category);
    if (!categoryDoc) {
      return res
        .status(400)
        .json({ ok: false, error: "Invalid category selected" });
    }

    const regularPrice = parseFloat(products.regularPrice) || 0;
    // const salePrice = products.salePrice
    //   ? parseFloat(products.salePrice)
    //   : null;
    const quantity = parseInt(products.quantity, 10) || 0;


    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: categoryDoc._id,
      regularPrice,
      createdOn: new Date(),
      quantity,
      size: products.size,
      color: products.color,
      productImage: productImages,
      status: "Available",
    });

    await newProduct.save();

    return res
      .status(201)
      .json({ ok: true, message: "Product added successfully" });
  } catch (error) {
    console.error("Error saving product", error);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};


   const getEditProductPage = async(req,res)=>{
    try{
      console.log("req.params getEditProductPage",req.params)
      const {id}=req.params;
      const product = await Product.findById(id)
      .populate("category", "name")
      .populate("brand", "brandName")
      .lean();

       if (!product) return res.redirect("/admin/products");

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

    res.render("editProduct",{
       product,
      categories,
      brands,
    });

    }catch(err){
      console.error("Error loading edit product page:",err);
      res.redirect("/admin/pageerror");
    }
   };

   const updateProduct = async(req,res)=>{
    try{
      console.log("req.params",req.params)
      const {id}=req.params;
      const updates = req.body;

      let imageUrls =[];
      if(req.files && req.files.length>0){
        for(const file of req.files){
           const resizedBuffer = await sharp(file.buffer)
          .resize(440, 440, { fit: "inside" })
          .toBuffer();

           const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "quora_products" },
            (err, result) => {
              if (err) return reject(err);
              resolve(result);
        }
          );
       stream.end(resizedBuffer);
    });

     imageUrls.push(uploadResult.secure_url);
   }
  }

      const product = await Product.findById(id);
    if (!product) return res.redirect("/admin/products");

    product.productName = updates.productName;
    product.description = updates.description;
    product.regularPrice = parseFloat(updates.regularPrice) || 0;
    product.salePrice = updates.salePrice
      ? parseFloat(updates.salePrice)
      : null;
    product.category = updates.category;
    product.brand = updates.brand;
    product.quantity = parseInt(updates.quantity, 10) || 0;

      if (imageUrls.length > 0) {
      product.productImage = imageUrls;
    }

      await product.save();
     res.redirect("/admin/products?editSuccess=true");
  } catch (err) {
    console.error("Error updating product:", err);
    res.redirect("/admin/pageerror");
  }
};
   const deleteImage =async(req,res)=>{
    try {
      const{ productId, image} = req.body;
      const product = await Product.findById(productId);
      if(!product) return res.json({success:false,message:'Product not found'})

         
    product.productImage = product.productImage.filter((img)=> img !== image);
    console.log(product)
    await product.save();

    res.json({ success: true });
    } catch (error) {
     console.error(error);
    res.json({ success: false });
    }
   }

   const getProductsByBrand = async (req, res) => {
  try {
    const { brandId } = req.params;

    const products = await Product.find({ brand: brandId })
      .populate("category", "name")
      .populate("brand", "brandName")
      .sort({ createdOn: -1 })
      .lean();

    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products by brand:", error);
    res.json({ success: false, message: "Failed to fetch products by brand" });
  }
};


const getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isBlocked: false }).select("brandName _id");
    res.json({ success: true, brands });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ success: false, message: "Failed to fetch brands" });
  }
};

const getProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).lean();
    if (!product) return res.redirect("/shop");

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id }
    }).limit(5).lean();

    let isWishlisted = false;
    if (req.user) {
      const wishlist = await Wishlist.findOne({
        userId: req.user._id,
        "items.productId": productId
      });
      isWishlisted = !!wishlist;
    }
    
    res.render("user/productDetails", {
      product,
      relatedProducts,
      isWishlisted
    });

  } catch (error) {
    console.error("Error loading product details:", error);
    res.redirect("/pageerror");
  }
};


module.exports = {
  getProductAddPage,
  addProducts,
  getProductpage,
   getProductsData, 
  deleteProduct, 
   getEditProductPage,
    updateProduct,
    loadShopPage ,
    deleteImage,
    getProductsByBrand,
     getAllBrands,
     getProductDetails
};
 