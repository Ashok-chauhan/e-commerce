const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/", paymentController.checkout);
router.post("/verify", paymentController.verifyPayment);
router.post("/refund", paymentController.refund);
router.post("/cancelled", paymentController.cancelled);

//router.get("/success", paymentController.success);

module.exports = router;
