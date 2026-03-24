

const Category = require("../../models/categorySchema");
const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

      const query = search
      ? { name: { $regex: search, $options: "i" } } 
      : {};
    const categoryData = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const totalCategories = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
      search: search 
    });
  } catch (error) {
    console.error("Category Info Error:", error);
    res.redirect("/admin/pageerror");
  }
};
const addCategory = async (req, res) => {
  try {
    let { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ success: false, error: "All fields required" });
    }

    name = name.trim();

    
    const existing = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Category name already exists"
      });
    }

    const newCat = new Category({
      name: name.toLowerCase(),
      description,
      status: true,
      isListed: true
    });

    await newCat.save();

    res.status(200).json({
      success: true,
      message: "Category added successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const geteditCategory = async (req, res) => {
  try {

    const categoryId = req.params.id
    const category = await Category.findById(categoryId)

    return res.render("editCategory", { category })
  } catch (error) {
    console.log("error in geteditcategory", error)
    res.redirect("/admin/pageerror");
  }
}
const postEditCategory = async (req, res) => {
  try {
    let { id, name, description } = req.body;

    name = name.trim().toLowerCase();

 const existing = await Category.findOne({
  name: { $regex: `^${name}$`, $options: "i" },
  _id: { $ne: id }
});

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Category already exists"
      });
    }

    await Category.findByIdAndUpdate(id, { name, description });
    res.status(200).json({ success: true, message: "Category updated successfully" });
    

} catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ success: false, error: "Internal server error" });  
  }
};
const getListCategory=async(req,res)=>{
  try {
    let id=req.query.id;
    await Category.updateOne({_id:id},{$set:{isListed:true}});
    res.redirect("/admin/categories");
  } catch (error) {
    res.redirect("admin/pageerror");
  }
}
const getUnlistCategory=async(req,res)=>{
  try {
    let id=req.query.id;
    await Category.updateOne({_id:id},{$set:{isListed:false}});
    res.redirect("/admin/categories");
  } catch (error) {
    res.redirect("admin/pageerror");
  }
}
const toggleCategoryStatus = async(req,res)=>{
  try{
    const { status } = req.body;
    await Category.findByIdAndUpdate(req.params.id,{ status });
    res.status(200).json({success:true,message:"Status updated"});
  }catch(err){
    console.error(err);
    res.status(500).json({success:false,error:"Failed to update status"});
  }
}
const addCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const percentage = Number(req.body.percentage);
    if (isNaN(percentage) || percentage < 1 || percentage > 99) {
      return res.status(400).json({
        success: false,
        error: "Enter a valid percentage between 1 and 99",
      });
    }
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    await Category.findByIdAndUpdate(categoryId, {
      categoryOffer: Math.round(percentage),
    });

    res.status(200).json({ success: true, message: "Category offer added successfully" });
  } catch (err) {
    console.error("addCategoryOffer error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
const removeCategoryOffer = async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { categoryOffer: 0 });
    res.status(200).json({ success: true, message: "Category offer removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  geteditCategory,
  postEditCategory,
  getListCategory,
  getUnlistCategory,
 toggleCategoryStatus,
 addCategoryOffer,
 removeCategoryOffer

};
