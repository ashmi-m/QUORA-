
const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageerror=async(req,res)=>{
   res.render("pageerror");
}

const loadLogin = (req, res) => {
    
       
    
     return res.render("adminlogin", { message: null });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect("/admin/dashboard");  
            } else {
                return res.redirect("/admin/login");  
            }
        } else {
            return res.redirect("/admin/login");  
        }
    } catch (error) {
        console.log("login error", error);
        return res.redirect("/pageerror");
    }
};

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
           return res.render("dashboard"); 
        } catch (error) {
            console.log("error in loaddashborad function",error);
            
            res.redirect("/pageerror");
        }
    } else {
        res.redirect("/admin/login");  
    }
}

const logout=async(req,res)=>{
try {
    req.session.destroy(err=>{
        if(err){
            console.log("Error destroying session",err);
            return res.redirect("/pageerror")
        }
        res.redirect("/admin/login")
    })
} catch (error) {
    console.log("unexpected error during logout",error);
    res.redirect("/pageerror")
}
}
module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
};
