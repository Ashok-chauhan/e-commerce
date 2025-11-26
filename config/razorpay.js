const Razorpay = require("razorpay");
//olde key
// "rzp_test_RBFQoTqZtQDG8Q"
//New
// api key : rzp_test_RkIME8WBVEpo9W
// api secret: SRJe8JLfjsUf5G8mzqhR3XEa
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = instance;
