const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const upload = require("../config/multer");
//const isAdmin = require("../middlewares/isAdmin");
function isAdmin(req, res, next) {
  if (req.session.user?.email === "admin@swagly.com") {
    return next();
  }
  //return res.status(403).send("Forbidden");
  return res.redirect("/login");
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

// ORDER MANAGEMENT
router.get("/orders", isAdmin, adminController.allOrders);
router.get("/orderDetails/:order_id", isAdmin, adminController.orderDetails);
router.get("/order_process/:id", isAdmin, adminController.order_process_edit);
router.post("/order_process/:id", isAdmin, adminController.order_process_save);
router.get("/address/:id", isAdmin, adminController.userAddress);
router.get("/address/:id/pdf", isAdmin, adminController.userAddressPDF);
router.get("/productedit/:id", isAdmin, adminController.productedit);
router.post("/productedit", isAdmin, adminController.productUpdate);

router.post(
  "/productimage",
  isAdmin,
  upload.single("image"),
  adminController.productimage
);

router.post("/productdetailsedit", isAdmin, adminController.productDetailsEdit);
module.exports = router;
