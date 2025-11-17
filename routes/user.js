const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const productController = require("../controllers/productController");
// Register + Login
router.get("/", productController.homePage);
router.get("/product/:id", productController.productDetails);

router.get("/orders", productController.viewOrders);

router.get("/register", userController.registerPage);
router.post("/register", userController.registerUser);
router.get("/login", userController.loginPage);
router.post("/login", userController.loginUser);

// Logout
router.get("/logout", userController.logoutUser);

router.post("/cart/add", productController.addToCart);
router.get("/cart", productController.viewCart);
router.post("/cart/plus", productController.plus);
router.post("/cart/minus", productController.minus);

// router.post("/checkout", productController.checkout);

module.exports = router;
