const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const slugify = require("slugify");

exports.dashboard = async (req, res) => {
  let total = 0;
  const [todaysOrders] = await db.query(
    `SELECT * FROM payments WHERE DATE(created_at) = CURDATE() ORDER BY id DESC`
  );

  todaysOrders.forEach((amt) => {
    total += amt.amount;
  });
  res.render("admin/dashboard", { layout: "admin", todaysOrders, total });
};

exports.getCategories = async (req, res) => {
  const [categories] = await db.query("SELECT * FROM categories");
  res.render("admin/categories", { layout: "admin", categories });
};

exports.createCategory = async (req, res) => {
  await db.query("INSERT INTO categories (name) VALUES (?)", [req.body.name]);
  res.redirect("/admin/categories");
};

exports.getProducts = async (req, res) => {
  const [products] = await db.query(`
    SELECT p.*, c.name AS category FROM products p JOIN categories c ON p.category_id = c.id
  `);

  res.render("admin/products", { layout: "admin", products });
};

exports.newProductForm = async (req, res) => {
  const [categories] = await db.query("SELECT * FROM categories");
  res.render("admin/new-product", { layout: "admin", categories });
};

/*
exports.createProduct = async (req, res) => {
  console.log(req.body);

  const { name, description, price, category_id, image } = req.body;
  await db.query(
    "INSERT INTO products (name, description, price, category_id, image) VALUES (?, ?, ?, ?, ?)",
    [name, description, price, category_id, image]
  );
  res.redirect("/admin/products");
};
*/
exports.createProduct_XXXX = async (req, res) => {
  const { name, description, price, category_id } = req.body;
  const image = req.file.filename;

  await db.query(
    "INSERT INTO products (name, description, price, category_id, image) VALUES (?, ?, ?, ?, ?)",
    [name, description, price, category_id, image]
  );

  res.redirect("/admin/products");
};

exports.createProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    discount_percent,
    category_id,
    sales_package,
    pack_of,
    brand,
    model,
    brand_color,
    care,
    skin_type,
    finish,
    duration,
    color,
    features,
    self_life,
    highlight,
    waterproof,
    quantity,
  } = req.body;
  const slug = slugify(name, { lower: true, strict: true });
  try {
    // insert product first
    const [result] = await db.query(
      "INSERT INTO products (name, slug, description, price, discount_percent, category_id, image) VALUES (?, ?, ?, ?, ?,?,? )",
      [
        name,
        slug,
        description,
        price,
        discount_percent || 0,
        category_id,
        req.files[0].filename,
      ]
    );

    const productId = result.insertId;

    await db.query(
      "INSERT INTO product_details (product_id, sales_package, pack_of, brand, model, brand_color, care, skin_type, finish, duration, color, features,self_life, highlight, waterproof, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        productId,
        sales_package,
        pack_of,
        brand,
        model,
        brand_color,
        care,
        skin_type,
        finish,
        duration,
        color,
        features,
        self_life,
        highlight,
        waterproof,
        quantity,
      ]
    );

    // save multiple images
    if (req.files && req.files.length > 0) {
      const imageInserts = req.files.map((file) => [productId, file.filename]);
      await db.query(
        "INSERT INTO product_images (product_id, image_path) VALUES ?",
        [imageInserts]
      );
    }

    res.redirect("/admin/products");
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Server error");
  }
};

exports.allOrders = async (req, res) => {
  const [allOrders] = await db.query("SELECT * FROM payments");
  res.render("admin/allOrders", { layout: "admin", allOrders });
};

exports.orderDetails = async (req, res) => {
  const { order_id } = req.params;

  // Step 1: Get order items
  const [orders] = await db.query(
    `SELECT O.id, O.user_id, order_items.product_id 
     FROM orders O 
     LEFT JOIN order_items ON O.id = order_items.order_id 
     WHERE O.payment_id=?`,
    [order_id]
  );

  // Step 2: Fetch all product details in parallel
  const ordered = await Promise.all(
    orders.map(async (order) => {
      const [product] = await db.query("SELECT * FROM products WHERE id = ?", [
        order.product_id,
      ]);
      return product[0];
    })
  );

  res.render("admin/orderDetails", { layout: "admin", ordered });
};

exports.order_process_edit = async (req, res) => {
  const { id } = req.params;

  const [rows] = await db.query("SELECT * FROM payments WHERE id = ?", [id]);

  const order = rows[0];

  const statusOptions = [
    "ordered",
    "dispatched",
    "delivered",
    "returned",
    "refunded",
  ];

  const options = statusOptions.map((s) => ({
    value: s,
    selected: s === order.order_status ? "selected" : "",
  }));

  res.render("admin/order_process_edit", { order, options });
};
exports.order_process_save = async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  await db.query("UPDATE payments SET order_status = ? WHERE id = ?", [
    order_status,
    id,
  ]);

  // res.redirect("/orderDetails/" + id);
  res.redirect("/admin/orders");
};

exports.userAddress = async (req, res) => {
  const id = req.params.id;
  const [rows] = await db.query(`SELECT * FROM users WHERE id= ?`, [id]);
  res.render("admin/address", { address: rows[0] });
};

exports.userAddressPDF = async (req, res) => {
  const id = req.params.id;

  const [rows] = await db.query(`SELECT * FROM users WHERE id=?`, [id]);
  const user = rows[0];

  if (!user) {
    return res.status(404).send("User not found");
  }

  // Create PDF Document
  const doc = new PDFDocument();

  // Set response headers for download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=address_${user.name}.pdf`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // PDF Content
  doc.fontSize(24).text("Shipping address", { underline: true });
  doc.moveDown();

  doc.fontSize(14).text(`Name: ${user.name}`);
  doc.text(`Address: ${user.address}`);
  doc.text(`Landmark: ${user.landmark}`);
  doc.text(`City: ${user.city}`);
  doc.text(`Pincode: ${user.pincode}`);
  doc.text(`State: ${user.state}`);
  doc.text(`Phone: ${user.phone}`);

  doc.end();
};
