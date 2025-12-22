const User = require("../../models/userSchema"); 

exports.addAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, locality, address, city, state, landmark, type } = req.body;

    await User.findByIdAndUpdate(req.session.user._id, {
      $push: { addresses: { name, mobile, pincode, locality, address, city, state, landmark, type } }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).lean();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
};

