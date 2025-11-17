const db = require("../config/db");
const logger = require("../config/logger");
const razorpay = require("../config/razorpay");

function applyDiscount(product) {
  if (product.discount_percent > 0) {
    product.discounted_price =
      product.price - (product.price * product.discount_percent) / 100;
  } else {
    product.discounted_price = product.price;
  }
  return product;
}

exports.homePage = async (req, res) => {
  try {
    // const [rows] = await db.query(`
    //   SELECT p.id, p.name, p.description, p.price, p.discount_percent, p.image,  c.name AS category
    //   FROM products p JOIN categories c ON p.category_id = c.id

    // `);

    const [rows] = await db.query(`
      SELECT p.id, p.name, p.description, p.price, p.discount_percent,
             c.name AS category,
             (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) AS image
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `);
    //console.log(rows);
    const products = rows.map((p) => applyDiscount(p));

    res.render("user/home", { layout: "main", products });
  } catch (err) {
    logger.error("Product listing error: " + err.message);
    res.status(500).send("Error loading products");
  }
};

exports.productDetails = async (req, res) => {
  //  const id = req.params.id;
  try {
    const { id } = req.params;
    /*
    const [[product]] = await db.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
*/

    const [[product]] = await db.query(
      `
  SELECT p.*, d.sales_package, d.pack_of, d.brand, d.model, d.brand_color, d.care, d.skin_type, d.finish, d.duration, d.color, d.features, d.self_life, d.highlight, d.waterproof, d.quantity
  FROM products p
  LEFT JOIN product_details d ON p.id = d.product_id
  WHERE p.id = ?
`,
      [id]
    );

    const prod = [product].map((p) => applyDiscount(p));

    const [images] = await db.query(
      "SELECT image_path FROM product_images WHERE product_id = ?",
      [id]
    );

    product.images = images;

    res.render("user/product-detail", {
      layout: "main",
      product: product,

      // product: rows[0],
    });
  } catch (err) {
    logger.error("Product detail error: " + err.message);
    res.status(500).send("Error");
  }
};

exports.viewOrders = async (req, res) => {
  const user_id = req.session.user?.id;
  const [orders] = await db.query(
    "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
    [user_id]
  );
  for (let order of orders) {
    const [items] = await db.query(
      `
      SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE order_id = ?
    `,
      [order.id]
    );
    order.items = items;
  }
  res.render("user/orders", { layout: "main", orders });
};

exports.addToCart = async (req, res) => {
  const { product_id, quantity } = req.body;

  if (req.session.user) {
    const user_id = req.session.user?.id;
    // Logged in: Save in DB
    try {
      const [existing] = await db.query(
        "SELECT * FROM carts WHERE user_id = ? AND product_id = ?",
        [user_id, product_id]
      );
      if (existing.length) {
        await db.query(
          "UPDATE carts SET quantity = quantity + ? WHERE id = ?",
          [quantity, existing[0].id]
        );
      } else {
        await db.query(
          "INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)",
          [user_id, product_id, quantity]
        );
      }

      //    res.redirect("/cart");
    } catch (err) {
      logger.error("Add to cart error: " + err.message);
      res.status(500).send("Cart error");
    }
  } else {
    // Guest: Save in session
    if (!req.session.cart) req.session.cart = [];
    const existing = req.session.cart.find(
      (item) => item.product_id == product_id
    );

    if (existing) {
      existing.quantity += parseInt(quantity);
    } else {
      req.session.cart.push({ product_id, quantity: parseInt(quantity) });
    }
  }

  res.redirect("/cart");
};

exports.viewCart = async (req, res) => {
  const user_id = req.session.user?.id;
  if (!user_id) return res.redirect("/login");

  try {
    const [items] = await db.query(
      `
      SELECT c.id AS cart_id, p.id, p.name, p.price, p.image, p.discount_percent, c.quantity 
      FROM carts c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?
      
    `,
      [user_id]
    );
    const product_item = items.map((p) => applyDiscount(p));

    const total = product_item.reduce(
      (sum, item) => sum + item.discounted_price * item.quantity,
      0
    );

    const [row] = await db.query(`SELECT * FROM users WHERE id = ?`, [user_id]);
    const user = row[0];
    res.render("user/cart", { layout: "main", items, total, user });
  } catch (err) {
    logger.error("Cart view error: " + err.message);
    res.status(500).send("Cart error");
  }
};

///////////////////////////////////

exports.checkout = async (req, res) => {
  const user_id = req.session.user?.id;
  if (!user_id) return res.redirect("/login");

  try {
    const [items] = await db.query(
      `
      SELECT p.id, p.name, p.price, c.quantity 
      FROM carts c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?
    `,
      [user_id]
    );

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

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
        [orderId, item.id, item.quantity, item.price]
      );
    });

    await db.query("DELETE FROM carts WHERE user_id = ?", [user_id]);

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

exports.plus = async (req, res) => {
  const user_id = req.session.user?.id;
  if (!user_id) return res.redirect("/login");
  const { cartid, quantity } = req.body;
  const qty = parseInt(quantity) + 1;
  try {
    await db.query("UPDATE carts SET quantity = ? WHERE id = ?", [qty, cartid]);
    res.redirect("/cart");
  } catch (err) {
    console.log(err);
  }
};

exports.minus = async (req, res) => {
  const user_id = req.session.user?.id;
  if (!user_id) return res.redirect("/login");

  const { cartid, quantity } = req.body;
  const qty = parseInt(quantity) - 1;
  try {
    if (qty >= 1) {
      await db.query("UPDATE carts SET quantity = ? WHERE id = ?", [
        qty,
        cartid,
      ]);
    }
    res.redirect("/cart");
  } catch (err) {
    console.log(err);
  }
};
