

module.exports = (req,res,next)=>{
    res.locals.user = req.user||req.session.user||null;
    next()
}