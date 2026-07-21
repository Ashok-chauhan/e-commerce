const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const apiController = require("../controllers/apiController");
// Register + Login
router.get("/", apiController.homePage);

router.get("/product/:slug", apiController.productDetails);

router.get("/orders", apiController.viewOrders);

router.get("/register", userController.registerPage);
router.post("/register", userController.registerUser);
router.get("/login", userController.loginPage);
router.post("/login", userController.loginUser);

// Logout
router.get("/logout", userController.logoutUser);

router.post("/cart/add", apiController.addToCart);
router.get("/cart", apiController.viewCart);
router.get("/cart/:id", apiController.deleteCart);

router.post("/cart/plus", apiController.plus);
router.post("/cart/minus", apiController.minus);
router.get("/address/:uid", userController.addressEdit);
router.post("/address", userController.addressSave);
router.get("/paymentsuccess", userController.paymentSuccess);
router.get("/category/:id", apiController.productsByCategory);

// router.post("/checkout", apiController.checkout);

module.exports = router;
