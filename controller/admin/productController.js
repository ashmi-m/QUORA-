const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 👉 GET Add Product Page
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
const addProducts = async (req, res) => {
  try {
    console.log("req.body is", req.body);
    console.log("req.files is", req.files && req.files.length ? req.files.map(f => ({ originalname: f.originalname, path: f.path ? true : false, buffer: f.buffer ? true : false })) : req.files);

    const products = req.body;

    // check existing
    const productExists = await Product.findOne({ productName: products.productName });
    if (productExists) {
      return res.status(400).json({ ok: false, error: "Product already exists, please try with another name" });
    }

    // images
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // handle memoryStorage (buffer present)
        if (file.buffer) {
          // resize buffer with sharp then upload via upload_stream
          const resizedBuffer = await sharp(file.buffer)
            .resize(440, 440, { fit: "inside" })
            .toBuffer();

          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: "quora_products" }, (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
            stream.end(resizedBuffer);
          });

          imageUrls.push(uploadResult.secure_url);
        }
        // handle diskStorage (file.path present)
        else if (file.path) {
          const processedPath = path.join("uploads", `${Date.now()}-${file.originalname}`);
          await sharp(file.path).resize(440, 440, { fit: "inside" }).toFile(processedPath);

          const result = await cloudinary.uploader.upload(processedPath, { folder: "quora_products" });
          imageUrls.push(result.secure_url);

          // safe cleanup
          try { fs.unlinkSync(file.path); } catch (e) { console.warn('could not unlink temp file', e.message); }
          try { fs.unlinkSync(processedPath); } catch (e) { console.warn('could not unlink processed file', e.message); }
        } else {
          return res.status(400).json({ ok: false, error: "Uploaded file format not supported by server" });
        }
      }
    } else {
      return res.status(400).json({ ok: false, error: "At least one image is required" });
    }

    // validate category
    const categoryDoc = await Category.findById(products.category);
    if (!categoryDoc) {
      return res.status(400).json({ ok: false, error: "Invalid category selected" });
    }

    // convert numeric fields
    const regularPrice = parseFloat(products.regularPrice) || 0;
    const salePrice = products.salePrice ? parseFloat(products.salePrice) : null;
    const quantity = parseInt(products.quantity, 10) || 0;

    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: categoryDoc._id,
      regularPrice,
      salePrice,
      createdOn: new Date(),
      quantity,
      size: products.size,
      color: products.color,
      productImage: imageUrls,
      status: "Available",
    });

    await newProduct.save();

    // return JSON so client-side fetch can parse it cleanly
    return res.status(201).json({ ok: true, message: "Product added successfully" });
  } catch (error) {
    console.error("Error saving product", error);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

 
module.exports = {
  getProductAddPage,
  addProducts,
};
