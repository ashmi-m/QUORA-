const User=require("../models/userSchema");
const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      if (req.originalUrl.startsWith("/cart")) {
        return res.status(401).json({ message: "Please login first" });
      }
     return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id);

    if (!user || user.isBlocked) {
      req.session.destroy();
      if (req.originalUrl.startsWith("/cart")) {
        return res.status(401).json({ message: "User blocked" });
      }

      return res.redirect("/login");
    }

    req.user = user;
    next();

  } catch (error) {
    console.log("Auth middleware error:", error);
    if (req.originalUrl.startsWith("/cart")) {
      return res.status(500).json({ message: "Auth error" });
    }
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


