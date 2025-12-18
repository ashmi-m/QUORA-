

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
      .limit(limit);

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

const addCategory = async(req,res)=>{
  try{
    const { name, description } = req.body;
    if(!name || !description) return res.status(400).json({success:false,error:"All fields required"});

    const existing = await Category.findOne({ name: name.trim() });
    if(existing) return res.status(400).json({success:false,error:"Category name already exists"});

    const newCat = new Category({ name, description, status:true, isListed:true });
    await newCat.save();
    res.status(200).json({success:true,message:"Category added successfully"});
  }catch(err){
    console.error(err);
    res.status(500).json({success:false,error:"Internal server error"});
  }
}



// const deleteCategory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Category.findByIdAndDelete(id);
//     res.json({ message: "Category deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// };

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


module.exports = {
  categoryInfo,
  addCategory,
  geteditCategory,
  postEditCategory,
  getListCategory,
  getUnlistCategory,
 toggleCategoryStatus

};
