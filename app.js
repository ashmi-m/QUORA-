
const express = require('express');
const session = require("express-session");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const passport = require("./config/passport");
const db = require("./config/db");
const userRouter = require("./routes/userRoute");
const adminRouter=require('./routes/adminRouter');
const setUser = require("./middlewares/setUser");

db()

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));

// app.use((req, res, next) => {
//     res.set("Cache-Control", "no-store");
//     next();
// });
app.use((req, res, next) => {
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0"
    });
    next();
});

app.use(passport.initialize());
app.use(passport.session());

app.use((req,res,next)=>{
    res.locals.user=req.user;
    next();
});

app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, "public")));

app.use(setUser);
app.use("/", userRouter);
app.use("/admin",adminRouter);

// app.use((err,req,res,next)=>{
//     console.error('Error:',err);
//     res.status(500).send('Something went wrongygvuygv hg !');
// });

app.use((req,res)=>{
    res.status(404).send('Page not found');
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    
})

module.exports = app;

