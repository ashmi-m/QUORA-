const User = require("../../models/userSchema");


// ================= LOAD WALLET PAGE =================
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
      activePage: "wallet"
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};


// ================= ADD MONEY =================
const addMoneyToWallet = async (req, res) => {
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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { wallet: amount },
        $push: {
          walletTransactions: {
            type: "credit",
            amount,
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
    res.json({ success: false });
  }
};


// ================= CREDIT (REFUND) =================
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


// ================= DEBIT (ORDER PAYMENT) =================
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
  addMoneyToWallet,
  creditWallet,
  debitWallet
};