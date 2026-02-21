

module.exports = (req,res,next)=>{
    if (req.user && !req.session.user) {
    req.session.user = req.user;   
  }

    res.locals.user = req.session.user || null;
    next()
}