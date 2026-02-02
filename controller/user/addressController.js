const Address = require("../../models/addressSchema");
const mongoose = require("mongoose");
// const addAddress = async (req, res) => {
//   try {
//     const { name, mobile, pincode, locality, address, city, state, landmark, type } = req.body;
//     const userId =req.session.user._id;


//     let addressDoc = await Address.findOne({ userId });

//     const newAddress = {
//       addressType: type,
//       name,
//       phone: mobile,
//       altPhone: mobile,
//       city,
//       state,
//       landMark: landmark,
//       pincode
//     };

//     if (addressDoc) {

//       addressDoc.addresses.push(newAddress);
//       await addressDoc.save();
//     } else {

//       addressDoc = new Address({
//         userId,
//         addresses: [newAddress]
//       });
//       await addressDoc.save();
//     }

//     res.json({ success: true, addresses: addressDoc.addresses });
//   } catch (error) {
//     console.error(error);
//     res.json({ success: false });
//   }
// };

const addAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, city, state, landmark, type, from } = req.body;
    const userId = req.session.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    let addressDoc = await Address.findOne({ userId });

    const newAddress = {
      addressType: type,
      name,
      phone: mobile,
      city,
      state,
      landMark: landmark,
      pincode
    };

    if (addressDoc) {
      addressDoc.addresses.push(newAddress);
    } else {
      addressDoc = new Address({
        userId,
        addresses: [newAddress]
      });
    }

    await addressDoc.save();

    return res.json({
      success: true,
      from: from === "checkout" ? "checkout" : "profile"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};



const getAddresses = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addressDoc = await Address.findOne({ userId }).lean();

    const addresses = addressDoc?.addresses || [];
    res.json({ success: true, addresses });
  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
};

const addAddressFromProfile = async (req, res) => {
  try {
    const { name, mobile, pincode, city, state, landmark, type } = req.body;
    const userId = req.session.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    let addressDoc = await Address.findOne({ userId });

    const newAddress = {
      addressType: type,
      name,
      phone: mobile,
      city,
       altPhone: mobile,
      state,
      landMark: landmark,
      pincode
    };

    if (addressDoc) {
      addressDoc.addresses.push(newAddress);
    } else {
      addressDoc = new Address({
        userId,
        addresses: [newAddress]
      });
    }

    await addressDoc.save();

    // Always redirect to manage-address
    return res.json({
      success: true,
      redirect: "/manage-address"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  addAddress,
  getAddresses,
  addAddressFromProfile


};

