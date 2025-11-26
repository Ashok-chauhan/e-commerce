const db = require("../config/db");
const logger = require("../config/logger");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const emailSerevice = require("../modules/email");
const fs = require("fs");
const path = require("path");
//##const { default: orders } = require("razorpay/dist/types/orders");

// Read template
// let htmlTemplate = fs.readFileSync(
//   path.join(__dirname, "../views/email/paymentConfirmation.html"),
//   "utf-8"
// );
let htmlTemplate = fs.readFileSync(
  path.join(__dirname, "../views/email/orderConfirmation.html"),
  "utf-8"
);

async function sendEmail(items, amount, address, order_id) {
  // for (const item of orders) {
  // }
  const orderItems = items
    .map(
      (item) =>
        `<tr><td>${item.name} </td><td> ${item.quantity} × </td><td> ₹${item.price}</td><td>${item.discount_percent}%</td></tr>`
    )
    .join("");
  htmlTemplate = htmlTemplate
    .replace("{{amount}}", amount)
    .replace("{{address}}", address)
    .replace("{{order_id}}", order_id)
    .replace("{{orders}}", orderItems);

  try {
    await emailSerevice.sendEmail({
      to: "ashok@whizti.com",
      subject: "Swagly-Order Confirmation",
      //text: "This is testing of email text",
      html: htmlTemplate,
      attachments: [],
    });
    console.log("Email with attachment sent succcesfully!");
  } catch (error) {
    console.error("Failed to send email: ", error);
  }
}

function applyDiscount(product) {
  if (product.discount_percent > 0) {
    product.discounted_price =
      product.price - (product.price * product.discount_percent) / 100;
  } else {
    product.discounted_price = product.price;
  }
  return product;
}

exports.checkout = async (req, res) => {
  const user_id = req.session.user?.id;
  if (!user_id) return res.redirect("/login");

  try {
    const [items] = await db.query(
      `
      SELECT p.id, p.name, p.price, p.discount_percent, c.quantity 
      FROM carts c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?
    `,
      [user_id]
    );
    const cartProduct = items.map((p) => applyDiscount(p));

    const total = cartProduct.reduce(
      (sum, i) => sum + i.discounted_price * i.quantity,
      0
    );

    const razorpayOrder = await razorpay.orders.create({
      amount: total * 100,
      currency: "INR",
      receipt: "receipt#" + Date.now(),
    });

    const [orderResult] = await db.query(
      "INSERT INTO orders (user_id, total, payment_status, payment_id) VALUES (?, ?, ?, ?)",
      [user_id, total, "pending", razorpayOrder.id]
    );
    // 3️⃣ Get numeric order id from our DB
    const orderId = orderResult.insertId;

    items.forEach(async (item) => {
      await db.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, item.id, item.quantity, item.discounted_price]
      );
      req.session.user.product_id = item.id;
    });

    //### await db.query("DELETE FROM carts WHERE user_id = ?", [user_id]);
    //sending email
    //#####await sendEmail();
    /*
    const [rowOrder] = await db.query(
      `SELECT p.name, p.price, p.discount_percent, p.description, p.image ,c.quantity, c.created_at FROM products as p LEFT JOIN carts as c ON p.id = c.product_id WHERE c.user_id=?;`,
      [user_id]
    );
    console.log("ROW ORDER QUERY");
    console.log(rowOrder);
    await sendEmail();
    await db.query("DELETE FROM carts WHERE user_id = ?", [user_id]);
    */

    // res.send(`<h2>Payment Started</h2><p>Order ID: ${
    //   razorpayOrder.id
    // }</p><p>Amount: ₹${total}</p><script src="https://checkout.razorpay.com/v1/checkout.js"
    //     data-key="${process.env.RAZORPAY_KEY_ID}"
    //     data-amount="${total * 100}"
    //     data-currency="INR"
    //     data-order_id="${razorpayOrder.id}">
    //     </script>`);
    res.json(razorpayOrder); // send order to frontend
  } catch (err) {
    logger.error("Checkout error: " + err.message);
    res.status(500).send("Checkout error");
  }
};

// Verify payment and store in DB
exports.verifyPayment = async (req, res) => {
  //return res.json({"succes":"Done"});
  const user_id = req.session.user?.id;

  try {
    console.log(req.body);
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount,
    } = req.body;

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
    if (generated_signature === razorpay_signature) {
      // ✅ Store payment in DB
      await db.query(
        `INSERT INTO payments ( user_id, order_id, payment_id, signature, amount, currency) 
         VALUES ( ?, ?, ?, ?, ?)`,
        [
          user_id,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          amount,
          "INR",
        ]
      );
      const [rows] = await db.query(
        "UPDATE orders SET payment_status=? WHERE payment_id=?",
        ["success", razorpay_order_id]
      );
      res.send("Payment Verified & Stored ✅");

      // Send email here
      const [rowOrder] = await db.query(
        `SELECT p.name, p.price, p.discount_percent, p.description, p.image ,c.quantity, c.created_at FROM products as p LEFT JOIN carts as c ON p.id = c.product_id WHERE c.user_id=?;`,
        [req.session.user.id]
      );
      console.log("ROW -> ", rowOrder);
      console.log("SESSION -> ", req.session.user);
      const shipingAddress = `<li>${req.session.user.name}</li><li>${req.session.user.address}</li>
      <li>${req.session.user.landmark}</li><li>${req.session.user.locality}</li>
      <li>${req.session.user.city}</li><li>${req.session.user.pincode}</li><li>${req.session.user.state}</li>`;

      await sendEmail(rowOrder, amount, shipingAddress, razorpay_order_id);
      await db.query("DELETE FROM carts WHERE user_id = ?", [
        req.session.user.id,
      ]);
    } else {
      res.status(400).send("Payment Verification Failed ❌");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error verifying payment");
  }
};
