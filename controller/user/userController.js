const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const loadHomepage = async(req,res)=>{
  try{
    const products = await Product.find()
    .sort({createdOn:-1})
    .limit(8)
    .lean();
   
    const user = req.session.user;
    res.render("home",{products,user});
  }catch(error){
    console.error("Error loading homepage:",error);
    res.redirect("/pageNotFound");
  }
};

const pageNotFound = (req,res)=>{
  res.status(404).render("page 404");
};

const loadSignup = async (req, res) => {
  try {
    if(req.session.user){
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
};
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

      req.session.user = saveUserData._id;
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
    if(req.session.user){
      return res.redirect('/');
    }
    // if(!req.session.user){
    return res.render("login")
    // }else{
    //   res.redirect("/")
    // }
  } catch (error) {
    res.redirect("pageNotFound")
  }
}

// const loadLogin = async (req, res) => {
//   try {
//     res.render("user/login", { message: "" });   
//   } catch (error) {
//     console.log(error.message);
//   }
// };


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

    req.session.user = findUser;

    if (req.session.user) {
      console.log(req.session.user)
      // console.log("redirect is working")
      return res.redirect("/")//home page
    } else {
      res.redirect('/login')
    }

  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed.Please try again later" })
  }
};

const loadForgotPassword=async(req,res)=>{
  try{
    res.render("forgotPassword");
  }catch(error){
    console.log("Error loading forgot password",error);
    res.redirect("/pageNotFound");
  }
};


const forgotPassword=async(req,res)=>{
  try{
    const {email}=req.body;
    const findUser=await User.findOne({email});
    if(!findUser){
      return res.render("forgotPassword",{message:"User not found"});
    }
      const otp = generateOtp();
    req.session.resetOtp = otp;
    req.session.resetEmail = email;

    console.log("Generated Otp:",otp);

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.render("forgotPassword", { message: "Failed to send OTP. Try again." });
    }

    return res.render("resetOtp",{message:"",
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
      return res.render("resetPassword",{message:""}); 
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
    console.log("req.body:",req.body);

    if (newPassword !== confirmPassword) {
      return res.render("resetPassword", { message: "Passwords do not match" });
    }

    const email = req.session.resetEmail;
    if (!email) {
      return res.redirect("/forgot-password");
    }

    const passwordHash = await bcrypt.hash(newPassword,10);
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
}

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

};