const User = require("../models/userSchema");

const userAuth = async (req, res, next) => {
  try {
    // ⭐ Accept BOTH session login and passport login
    if (!req.session.user && !req.isAuthenticated()) {
      if (req.originalUrl.startsWith("/cart")) {
        return res.status(401).json({ message: "Please login first" });
      }
      return res.redirect("/login");
    }

    // ⭐ Get user id from whichever system logged in
    const userId =
      req.session?.user?._id ||
      req.user?._id;

    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user || user.isBlocked) {
      req.session.destroy(() => {});
      if (req.originalUrl.startsWith("/cart")) {
        return res.status(401).json({ message: "User blocked" });
      }
      return res.redirect("/login");
    }

    // ⭐ Sync both auth systems so rest of app is consistent
    req.user = user;
    req.session.user = user;
    res.locals.user = user;

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


