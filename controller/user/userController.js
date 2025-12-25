const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");

const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");


const Order = require("../../models/orderSchema");


const loadHomepage = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdOn: -1 })
      .limit(8)
      .lean();

    let wishlistIds = [];
    let cartCount = 0;

    if (req.session.user) {
      // Wishlist
      const wishlist = await Wishlist.findOne({ userId: req.session.user._id }).lean();
      if (wishlist && wishlist.items) {
        wishlistIds = wishlist.items.map(item => item.productId.toString());
      }

      // Cart
      const cart = await Cart.findOne({ userId: req.session.user._id }).lean();
      if (cart && cart.items) {
        cartCount = cart.items.length;
      }
    }

    res.render("home", {
      products,
      user: req.session.user || null,
      wishlistIds,
      cartCount
    });

  } catch (error) {
    console.error("Error loading homepage:", error);
    res.redirect("/pageNotFound");
  }
};

const loadlandingpage = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdOn: -1 })
      .limit(8)
      .lean();

    let cart = null;
    let cartCount = 0;
    let wishlistIds = [];

    if (req.session.user) {

      // CART
      cart = await Cart.findOne({ userId: req.session.user._id })
        .populate("items.productId")
        .lean();

      if (cart && cart.items) {
        cartCount = cart.items.length;
      }

      // WISHLIST
      const wishlist = await Wishlist.findOne({
        userId: req.session.user._id
      }).lean();

      if (wishlist && wishlist.items) {
        wishlistIds = wishlist.items.map(item =>
          item.productId.toString()
        );
      }
    }

    res.render("home", {
      products,
      user: req.session.user || null,
      cart,
      cartCount,
      wishlistIds
    });

  } catch (error) {
    console.log("Error in landing page:", error);
    res.redirect("/pageNotFound");
  }
};



const pageNotFound = (req, res) => {
  res.status(404).render("page 404");
};

const loadSignup = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect('/');
    }
    return res.render("signup");
  } catch (error) {
    console.log("Signup page not found", error);
    res.status(500).send("Server error");
  }
};



function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}


async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
      }
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`
    });

    return info.accepted.length > 0;

  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}
const signup = async (req, res) => {
  try {
    // console.log(req.body)
    const { name, email, password, confirmPassword, phone } = req.body;


    if (password !== confirmPassword) {
      return res.render("signup", { message: "Passwords do not match" });

    }


    const findUser = await User.findOne({ email });
    // console.log("uswer is",findUser)
    if (findUser) {
      console.log("user is already exist", findUser)
      return res.render("signup", { message: "User with this email already exists" });

    }


    const otp = generateOtp();

    //  console.log("otp",otp)

    const emailSent = await sendVerificationEmail(email, otp);
    console.log("emailSent", emailSent)
    if (!emailSent) {
      return res.render("signup", { message: "Failed to send OTP. Try again." });
    }


    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };

    console.log("OTP Sent:", otp);


    return res.render("conformOtp");

  } catch (error) {
    console.error("eerror in post signup", error);
    res.render("signup", { message: "Something went wrong. Please try again." });
  }
}






const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10)
    return passwordHash;
  } catch (error) {

  }
}

const conformOtp = async (req, res) => {
  try {
    // const passwordHash=await;
    console.log('accessed backend');


    console.log("req is in confirm otp", req.body)
    const { otp } = req.body;
    console.log('OTP recieved ib backend is ', typeof otp)
    console.log("session otp is ", typeof req.session.userOtp);

    if (otp === req.session.userOtp) {
      console.log("otp verified");

      const user = req.session.userData;
      console.log("user is", user)
      if (!user) {
        return res.status(400).json({ success: false, message: "user session expired please try again" })
      }
      const passwordHash = await securePassword(user.password);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,

      });


      await saveUserData.save();

      console.log("saveUserData is", saveUserData);

      // req.session.user = saveUserData._id;
      req.session.user = {
        _id: saveUserData._id,
        name: saveUserData.name,
        email: saveUserData.email
      };



      delete req.session.userOtp;
      delete req.session.userData;

      return res.status(200).json({ success: true, message: "otp verified successfully" })
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP,Please try again" })
    }

  } catch (error) {
    console.error("Error Verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occured" })

  }
}
const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData || req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email not found in session" })
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);
    console.log(emailSent)
    if (emailSent) {
      console.log("Resent OTP", otp);
      res.status(200).json({ success: true, message: "OTP Resend Successfully" })
    } else {
      res.status(500).json({ success: false, message: "Failed to resend OTP.Please try again" });
    }
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({ success: false, message: "Internal Server Error.Please try again" })
  }
}

const loadLogin = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect('/');
    }
    return res.render("login")
  } catch (error) {
    res.redirect("pageNotFound")
  }
}




const login = async (req, res) => {
  try {
    console.log("req ", req.body);
    const { email, password } = req.body;
    // console.log("email",email)
    const findUser = await User.findOne({ isAdmin: 0, email: email });
    console.log("find user", findUser)
    if (!findUser) {
      return res.render("login", { message: "User not found" })
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by admin" })
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    // console.log("password",passwordMatch)
    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect Password" })
    }

    // req.session.user = findUser;

    // if (req.session.user) {
    //   console.log(req.session.user)
    //   // console.log("redirect is working")
    //   return res.redirect("/")//home page
    // } else {
    //   res.redirect('/login')
    // }

    req.session.user = {
      _id: findUser._id,
      name: findUser.name,
      email: findUser.email
    };

    return res.redirect("/userprofile");


  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed.Please try again later" })
  }
};

const loadForgotPassword = async (req, res) => {
  try {
    res.render("forgotPassword");
  } catch (error) {
    console.log("Error loading forgot password", error);
    res.redirect("/pageNotFound");
  }
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.render("forgotPassword", { message: "User not found" });
    }
    const otp = generateOtp();
    req.session.resetOtp = otp;
    req.session.resetEmail = email;

    console.log("Generated Otp:", otp);

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.render("forgotPassword", { message: "Failed to send OTP. Try again." });
    }

    return res.render("resetOtp", {
      message: "",
      email
    });
  } catch (error) {
    console.error("Error in forgot password", error);
    res.render("forgotPassword", { message: "Something went wrong" });
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (otp === req.session.resetOtp) {
      return res.render("resetPassword", { message: "" });
    }

    res.render("resetOtp", { message: "Invalid OTP. Try again." });
  } catch (error) {
    console.error("Error verifying reset OTP", error);
    res.render("resetOtp", { message: "Something went wrong" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    console.log("req.body:", req.body);

    if (newPassword !== confirmPassword) {
      return res.render("resetPassword", { message: "Passwords do not match" });
    }

    const email = req.session.resetEmail;
    if (!email) {
      return res.redirect("/forgot-password");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { $set: { password: passwordHash } });

    delete req.session.resetOtp;
    delete req.session.resetEmail;

    return res.redirect("/login");
  } catch (error) {
    console.error("Error resetting password", error);
    res.render("resetPassword", { message: "Something went wrong" });
  }
};






const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login")
    })
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound")

  }
};



const loadProfilePage = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id;

    const user = await User.findById(userId).lean();
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.render("profile", { user, orders });
  } catch (error) {
    console.log("Error loading profile:", error);
    res.redirect("/pageNotFound");
  }
};



const updateProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false });
    }

    const { name, phone, gender } = req.body;

    await User.findByIdAndUpdate(req.session.user._id, {
      name,
      phone,
      gender
    });

    req.session.user.name = name;

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: "Update failed" });
  }
};

const loadAddAddressPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    res.render("addAddress");
  } catch (error) {
    console.error("Load add address error:", error);
    res.redirect("/pageNotFound");
  }
};

const loadManageAddressPage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).lean();
    console.log(user.addresses)
    res.render("manageAddress", { user });
  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
};


const addAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, locality, address, city, state, type } = req.body;


    if (!name || !mobile || !pincode || !locality || !address || !city || !state) {
      return res.redirect("/add-address");
    }

    if (!/^\d{10}$/.test(mobile) || !/^\d{6}$/.test(pincode)) {
      return res.redirect("/add-address");
    }

    await User.updateOne(
      { _id: req.session.user },
      {
        $push: {
          addresses: {
            name,
            mobile,
            pincode,
            locality,
            address,
            city,
            state,
            type
          }
        }
      }
    );


    res.redirect("/add-address?saved=true");

  } catch (error) {
    console.log(error);
    res.redirect("/add-address");
  }
};


const loadEditAddressPage = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const user = await User.findById(req.session.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.redirect("/manage-address");
    }

    res.render("editAddress", {
      user,
      address
    });

  } catch (error) {
    console.error("Load edit address error:", error);
    res.redirect("/manage-address");
  }
};

const updateAddress = async (req, res) => {
  try {
    await User.updateOne(
      {
        _id: req.session.user,
        "addresses._id": req.params.id
      },
      {
        $set: {
          "addresses.$.name": req.body.name,
          "addresses.$.mobile": req.body.mobile,
          "addresses.$.pincode": req.body.pincode,
          "addresses.$.locality": req.body.locality,
          "addresses.$.address": req.body.address,
          "addresses.$.city": req.body.city,
          "addresses.$.state": req.body.state,
          "addresses.$.landmark": req.body.landmark,
          "addresses.$.type": req.body.type
        }
      }
    );

    return res.redirect("/manage-address?updated=true");

  } catch (err) {
    console.error(err);
    return res.redirect("/manage-address");
  }
};





const deleteAddress = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ success: false });

    await User.findByIdAndUpdate(
      req.session.user._id,
      { $pull: { addresses: { _id: req.params.id } } }
    );

    res.json({ success: true });

  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ success: false });
  }
};




module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  conformOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  loadForgotPassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  loadlandingpage,
  loadProfilePage,
  updateProfile,
  loadAddAddressPage,
  addAddress,
  loadManageAddressPage,

  loadEditAddressPage,
  updateAddress,
  deleteAddress
};