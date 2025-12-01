const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const productController = require("../controllers/productController");
// Register + Login
router.get("/", productController.homePage);

router.get("/product/:slug", productController.productDetails);

router.get("/orders", productController.viewOrders);

router.get("/register", userController.registerPage);
router.post("/register", userController.registerUser);
router.get("/login", userController.loginPage);
router.post("/login", userController.loginUser);

// Logout
router.get("/logout", userController.logoutUser);

router.post("/cart/add", productController.addToCart);
router.get("/cart", productController.viewCart);
router.get("/cart/:id", productController.deleteCart);

router.post("/cart/plus", productController.plus);
router.post("/cart/minus", productController.minus);
router.get("/address/:uid", userController.addressEdit);
router.post("/address", userController.addressSave);

// router.post("/checkout", productController.checkout);

module.exports = router;
