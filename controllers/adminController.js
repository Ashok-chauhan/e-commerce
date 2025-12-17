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
    total += parseFloat(amt.amount);
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

exports.productedit = async (req, res) => {
  try {
    const id = req.params.id;

    const [categories] = await db.query("SELECT * FROM categories");
    const [product] = await db.query(`SELECT * FROM products WHERE id=?`, [id]);
    const [product_details] = await db.query(
      `SELECT * FROM product_details WHERE product_id=?`,
      [id]
    );

    const [productImages] = await db.query(
      `SELECT * FROM product_images WHERE product_id=?`,
      [id]
    );

    const [swatches] = await db.query(
      `SELECT * FROM swatch WHERE product_id = ?`,
      [id]
    );

    const product_images = productImages.map((sw) => {
      const image = swatches.find((img) => img.product_image === sw.image_path);
      return {
        ...sw,
        swatch: image || null, // if no match, set null
      };
    });

    res.render("admin/product_edit", {
      layout: "admin",
      categories,
      product: product[0],
      details: product_details[0],
      product_images,
    });
  } catch (err) {
    console.log("Error loading edit form : ", err);
  }
};

exports.productUpdate = async (req, res) => {
  try {
    const {
      id,
      name,
      meta_title,
      description,
      price,
      category_id,
      discount_percent,
    } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    await db.query(
      "UPDATE products SET name=? , meta_title=?, slug=?, description=?, price=?, category_id=?, discount_percent=? WHERE id= ?",
      [
        name,
        meta_title,
        slug,
        description,
        price,
        category_id,
        discount_percent,
        id,
      ]
    );
    res.redirect(`/admin/productedit/${id}`);
  } catch (err) {
    console.log("Update error : ", err);
  }
};

exports.productDetailsEdit = async (req, res) => {
  try {
    const {
      id,
      product_id,
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
    await db.query(
      `
    UPDATE product_details SET pack_of=?, brand=?, model=?, brand_color=?, care=?, skin_type=?, finish=?, duration=?, color=?, features=?,
    self_life=?, highlight=?, waterproof=?, quantity=? WHERE id=?
    `,
      [
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
        id,
      ]
    );
    res.redirect(`/admin/productedit/${product_id}`);
  } catch (err) {
    console.log("Details update Error : ", err);
  }
};

exports.productimage = async (req, res) => {
  const { product_id } = req.body;
  /*
  const [old] = await db.query(
    "SELECT image_path FROM product_images WHERE id = ?",
    [id]
  );
  if (old.length > 0) {
    fs.unlink(`public/assets/images/${old[0].image_path}`, (err) => {
      if (err) console.log("File delete error: ", err);
    });
  }

  if (req.file) {
    await db.query(
      `UPDATE product_images 
     SET image_path = ? 
     WHERE id = ?`,
      [req.file.filename, id]
    );
  }
*/
  if (req.file) {
    await db.query(
      `INSERT INTO product_images (product_id, image_path) VALUES (?, ? )`,
      [product_id, req.file.filename]
    );
  }
  res.redirect(`/admin/productedit/${product_id}`);
};

exports.swatch = async (req, res) => {
  const { product_id, product_image, swatch_name, swatch_id } = req.body;

  if (swatch_id) {
    await db.query(
      `UPDATE swatch set product_image=?, picture=?, name=? WHERE id=?`,
      [product_image, req.file.filename, swatch_name, swatch_id]
    );
  } else {
    if (req.file) {
      await db.query(
        `INSERT INTO swatch (product_id, product_image, picture, name) VALUES (?, ?, ?, ?)`,
        [product_id, product_image, req.file.filename, swatch_name]
      );
    }
  }
  res.redirect(`/admin/productedit/${product_id}`);
};

exports.createProduct = async (req, res) => {
  const {
    name,
    meta_title,
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
      "INSERT INTO products (name, meta_title, slug, description, price, discount_percent, category_id, image) VALUES (?, ?, ?, ?, ?,?,?,? )",
      [
        name,
        meta_title,
        slug,
        description,
        price,
        discount_percent || 0,
        category_id,
        req.file.filename,
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
    /** *******************************
    if (req.files && req.files.length > 0) {
      const imageInserts = req.files.map((file) => [productId, file.filename]);
      await db.query(
        "INSERT INTO product_images (product_id, image_path) VALUES ?",
        [imageInserts]
      );
    }
*/
    res.redirect("/admin/products");
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Server error");
  }
};

exports.allOrders = async (req, res) => {
  const [allOrders] = await db.query("SELECT * FROM payments ORDER BY id DESC");
  res.render("admin/allOrders", { layout: "admin", allOrders });
};

exports.orderDetails = async (req, res) => {
  const { order_id } = req.params;

  // Step 1: Get order items
  const [orders] = await db.query(
    `SELECT O.id, O.user_id, 
          order_items.product_id, 
          order_items.swatch_name, 
          order_items.swatch_picture 
   FROM orders O 
   LEFT JOIN order_items ON O.id = order_items.order_id 
   WHERE O.payment_id=?`,
    [order_id]
  );

  // Step 2: Merge swatch fields into product object
  const ordered = await Promise.all(
    orders.map(async (order) => {
      const [product] = await db.query("SELECT * FROM products WHERE id = ?", [
        order.product_id,
      ]);

      return {
        ...product[0], // product details
        swatch_name: order.swatch_name,
        swatch_picture: order.swatch_picture,
      };
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
    "processing",
    "dispatched",
    "delivered",
    "returned",
    "refunded",
    "cancelled",
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
