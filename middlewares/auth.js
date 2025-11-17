function isAdmin(req, res, next) {
  if (req.session.user?.email === "admin@example.com") {
    return next();
  }
  return res.status(403).send("Forbidden");
}
