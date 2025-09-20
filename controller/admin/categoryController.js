

const Category = require("../../models/categorySchema");


const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    // console.log("category data is",categoryData)
    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories
    });
  } catch (error) {
    console.error("Category Info Error:", error);
    res.redirect("/admin/pageerror");
  }
};


const addCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();

    return res.json({ message: "Category added successfully" });
  } catch (error) {
    console.error("Add Category Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
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

// const editCategory = async(req,res)=>{
//   try {
//     const {id,name, description } = req.body;
//     await Category.findByIdAndUpdate(req.params.id, { name, description });
//     res.render("editCategory");
//   } catch (err) {
//   res.render

//     res.status(500).send("Error updating category");
// }
// };

const postEditCategory = async (req, res) => {
  try {
    const { id, name, description } = req.body;
    await Category.findByIdAndUpdate(id, { name, description });
    res.redirect("/admin/categories");
  } catch (error) {
    console.error("Error updating category:", error);
    res.redirect("/admin/categories");
  }
};
const getListCategory=async(req,res)=>{
  try {
    let id=req.query.id;
    await Category.updateOne({_id:id},{$set:{isListed:false}});
    res.redirect("/admin/categories");
  } catch (error) {
    res.redirect("admin/pageerror");
  }
}
const getUnlistCategory=async(req,res)=>{
  try {
    let id=req.query.id;
    await Category.updateOne({_id:id},{$set:{isListed:true}});
    res.redirect("/admin/categories");
  } catch (error) {
    res.redirect("admin/pageerror");
  }
}



module.exports = {
  categoryInfo,
  addCategory,
  deleteCategory,
  geteditCategory,
  postEditCategory,
  getListCategory,
  getUnlistCategory


};
