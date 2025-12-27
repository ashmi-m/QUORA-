const Address = require("../../models/addressSchema"); 
const mongoose = require("mongoose");

exports.addAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, locality, address, city, state, landmark, type } = req.body;
    const userId =req.session.user._id;

   
    let addressDoc = await Address.findOne({ userId });

    const newAddress = {
      addressType: type,
      name,
      phone: mobile,
      altPhone: mobile,
      city,
      state,
      landMark: landmark,
      pincode
    };

    if (addressDoc) {
     
      addressDoc.addresses.push(newAddress);
      await addressDoc.save();
    } else {
    
      addressDoc = new Address({
        userId,
        addresses: [newAddress]
      });
      await addressDoc.save();
    }

    res.json({ success: true, addresses: addressDoc.addresses });
  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
};

exports.getAddresses = async (req, res) => {
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

