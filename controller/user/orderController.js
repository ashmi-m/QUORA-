
const placeOrder = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const newOrder = new Order({
      user: req.session.user._id,
      items: [],
      totalAmount: 999,
      status: "Placed"
    });

    await newOrder.save();
    res.redirect("/userprofile");

  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
};

// CANCEL ORDER
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    await Order.findByIdAndUpdate(orderId, {
      status: "Cancelled"
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  placeOrder,
  cancelOrder   
};
