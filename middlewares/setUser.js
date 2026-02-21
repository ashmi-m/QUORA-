

module.exports = (req,res,next)=>{
    if (req.user && !req.session.user) {
    req.session.user = req.user;   // sync google login → session
  }

    res.locals.user = req.session.user || null;
    next()
}