const User = require("../../models/userSchema");
const razorpay = require("../../config/razorpay");
const crypto = require("crypto");

const loadWallet = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();

    if (!user) return res.redirect("/login");

    res.render("wallet", {
      user,
      walletBalance: {
        wallet: user.wallet || 0,
        total: user.wallet || 0
      },
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      activePage: "wallet"
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};


const createWalletOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    let { amount } = req.body;

    amount = Number(amount);

    if (!amount || amount < 1) {
      return res.json({ success: false, message: "Enter valid amount" });
    }

    if (amount > 50000) {
      return res.json({ success: false, message: "Max limit ₹50,000 per add" });
    }

    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: "wallet_" + Date.now()
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Failed to create payment order" });
  }
};
const addMoneyToWallet = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.json({ success: false, message: "Payment verification failed" });
    }
    const creditAmount = Number(amount) / 100; 

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { wallet: creditAmount },
        $push: {
          walletTransactions: {
            type: "credit",
            amount: creditAmount,
            paymentMethod: "Online",
            reason: "Added money to wallet",
            date: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({ success: true, newBalance: updatedUser.wallet });

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Server error" });
  }
};
const creditWallet = async (userId, amount, reason, orderId = null) => {
  await User.findByIdAndUpdate(userId, {
    $inc: { wallet: amount },
    $push: {
      walletTransactions: {
        type: "credit",
        amount,
        orderId,
        paymentMethod: "Refund",
        reason,
        date: new Date()
      }
    }
  });
};
const debitWallet = async (userId, amount, reason, orderId = null) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, wallet: { $gte: amount } },
    {
      $inc: { wallet: -amount },
      $push: {
        walletTransactions: {
          type: "debit",
          amount,
          orderId,
          paymentMethod: "Wallet",
          reason,
          date: new Date()
        }
      }
    },
    { new: true }
  );

  if (!user) {
    throw new Error("Insufficient wallet balance");
  }
};

module.exports = {
  loadWallet,
  createWalletOrder,
  addMoneyToWallet,
  creditWallet,
  debitWallet
};