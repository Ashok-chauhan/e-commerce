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
      SELECT p.id, p.name, p.slug, p.description, p.price, p.discount_percent,
             c.name AS category,
             (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) AS image
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `);
    //console.log(rows);
    const products = rows.map((p) => applyDiscount(p));

    res.render("user/home", {
      layout: "main",
      products,
      meta: {
        title: "Swagly | Trendy Cosmetics and Fashion in India",
        description:
          "Swagly brings affordable, stylish cosmetics and fashion apparel tailored for Indian trends",
        keywords:
          "cosmetics India, affordable makeup, fashion apparels, Indian style, lipstick trends, dresses online, skincare India, Swagly",
        ogTitle: "Swagly – Trendy Cosmetics and Fashion Apparels",
        ogDescription:
          "Affordable makeup and stylish fashion for Indian tastes. Subscribe now for exclusive updates.",
        url: "https://swagly.in",
        image: "https://swagly.in/logo.png",
        type: "website",
        twitterTitle: "Swagly – Trendy Cosmetics and Fashion Apparels",
        twitterDescription: "Swagly. Get beauty + fashion curated for you.",
      },
    });
  } catch (err) {
    logger.error("Product listing error: " + err.message);
    res.status(500).send("Error loading products");
  }
};

exports.productDetails = async (req, res) => {
  //  const id = req.params.id;
  try {
    const { slug } = req.params;

    // const [[item]] = await db.query("SELECT * FROM products WHERE slug = ?", [
    //   slug,
    // ]);

    // console.log(item, slug);
    // return;
    const [[product]] = await db.query(
      `
  SELECT p.*, d.sales_package, d.pack_of, d.brand, d.model, d.brand_color, d.care, d.skin_type, d.finish, d.duration, d.color, d.features, d.self_life, d.highlight, d.waterproof, d.quantity
  FROM products p
  LEFT JOIN product_details d ON p.id = d.product_id
  WHERE p.slug = ?
`,
      [slug]
    );

    const prod = [product].map((p) => applyDiscount(p));
    const [images] = await db.query(
      "SELECT image_path FROM product_images WHERE product_id = ?",
      [product.id]
    );
    product.images = images;
    res.render("user/product-detail", {
      layout: "main",
      product: product,
      meta: {
        title: `${product.name} | Swagly`,
        description: product.description,
        keywords: `${product.name}, swagly, cosmetics`,
        ogTitle: product.name,
        ogDescription: product.description,
        url: `https://swagly.in/product/${product.slug}`,
        image: `https://swagly.in/assets/images/${product.image}`,
        type: "product",
        twitterTitle: product.name,
        twitterDescription: product.description,
      },
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
      SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE order_id = ?
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

exports.deleteCart = async (req, res) => {
  const user_id = req.session.user?.id;
  if (!user_id) return res.redirect("/login");
  const { id } = req.params;
  try {
    if (id) {
      await db.query("DELETE FROM carts WHERE id = ?", [id]);
    }
    res.redirect("/cart");
  } catch (err) {
    console.log(err);
  }
};
