const User=require("../models/userSchema");




// const userAuth = async (req, res, next) => {
//     try {
      
//         if (!req.isAuthenticated()) {
//             return res.redirect("/login");
//         }

      
//         const user = await User.findById(req.user._id);

//         if (!user || user.isBlocked) {
//             return res.redirect("/login");
//         }

//         next();
//     } catch (error) {
//         console.log("Auth middleware error:", error);
//         return res.redirect("/login");
//     }
// };

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id);

    if (!user || user.isBlocked) {
      req.session.destroy();
      return res.redirect("/login");
    }

    next();
  } catch (error) {
    console.log("Auth middleware error:", error);
    return res.redirect("/login");
  }
};


const adminAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        
        return next();
    } else {
        
        return res.redirect("/admin/login");
    }
};

const preventAuthPages = (req, res, next) => {
    if (req.session.user|| req.isAuthenticated()) {
        return res.redirect("/");   
    }
    next();
};


module.exports = {
    userAuth,
    adminAuth,
       preventAuthPages
};


