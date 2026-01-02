const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 3;
        const query = {
            isAdmin: false,
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        };

        const userData = await User.find(query)
        .sort({_id:-1})
        .limit(limit)
        .skip((page - 1)*limit)
        .exec();
        const count = await User.countDocuments(query);
        res.render("customer",{
            data:userData,
            totalUsers:count,
            currentPage:page,
            totalPages:Math.ceil(count/limit),
            search,
        });

        }catch(error){
            console.error("Error in customerInfo:",error.message);
            res.status(500).send("Internal  Server Error");
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