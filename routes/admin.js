const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const upload = require("../config/multer");
//const isAdmin = require("../middlewares/isAdmin");
function isAdmin(req, res, next) {
  if (req.session.user?.email === "admin@swagly.com") {
    return next();
  }
  return res.status(403).send("Forbidden");
}

router.get("/dashboard", isAdmin, adminController.dashboard);

// Category
router.get("/categories", isAdmin, adminController.getCategories);
router.post("/categories", isAdmin, adminController.createCategory);

// Product
router.get("/products", isAdmin, adminController.getProducts);
router.get("/products/new", isAdmin, adminController.newProductForm);
// router.post("/products", isAdmin, adminController.createProduct);
router.post(
  "/products",
  isAdmin,
  // upload.single("image"),
  upload.array("images", 5),
  adminController.createProduct
);

module.exports = router;
