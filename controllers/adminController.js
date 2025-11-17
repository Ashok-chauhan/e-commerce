const db = require("../config/db");

exports.dashboard = (req, res) =>
  res.render("admin/dashboard", { layout: "admin" });

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

  try {
    // insert product first
    const [result] = await db.query(
      "INSERT INTO products (name, description, price, discount_percent, category_id, image) VALUES (?, ?, ?, ?, ?,? )",
      [
        name,
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
