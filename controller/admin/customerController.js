const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {

        let search = "";
        if (req.query.search) {
            search = req.query.search;

        }
        let page = 1;
        if (req.query.page) {
            page = req.query.page
        }
        const limit = 3
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*" } },
                { email: { $regex: ".*" + search + ".*" } },
            ],

        })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*" } },
                { email: { $regex: ".*" + search + ".*" } },
            ],

        });

        res.render("customer", {
            data: userData,
            totalUsers: count,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            search,
        });
    } catch (error) {
        console.error("Error in customerInfo:", error.message);
        res.status(500).send("Internal Server Error");

    }

};

const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        console.log("id is", id)
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        return res.status(200).json({ success: true });

    } catch (error) {
        console.log("error in customer blocked", error);
        return res.status(500).json({ success: false });

    }
};

const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        console.log("id is in customer unblocked", id)
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });

        return res.status(200).json({ success: true });


    } catch (error) {
        return res.status(500).json({ success: false });
    }
};

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
};