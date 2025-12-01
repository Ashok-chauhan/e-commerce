const bcrypt = require("bcrypt");
const db = require("../config/db");
const logger = require("../config/logger");

exports.registerPage = (req, res) => {
  res.render("user/register", { layout: "main" });
};

exports.loginPage = (req, res) => {
  res.render("user/login", { layout: "main" });
};

exports.registerUser = async (req, res) => {
  const {
    name,
    email,
    password,
    mobile,
    pincode,
    locality,
    address,
    city,
    state,
    landmark,
    phone,
  } = req.body;

  try {
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length) {
      req.flash("error", "Email already registered");
      return res.redirect("/register");
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (name, email, password, mobile, pincode, locality, address, city,state, landmark, phone) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [
        name,
        email,
        hashed,
        mobile,
        pincode,
        locality,
        address,
        city,
        state,
        landmark,
        phone,
      ]
    );
    logger.info(`New user registred: ${email}`);
    res.redirect("/login");
  } catch (err) {
    logger.error("Register Error: " + err.message);
    res.status(500).send("Something went wrong");
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!rows.length) return res.redirect("/login");

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.redirect("/login");

    req.session.user = rows[0];
    // 🔹 Merge session cart into DB
    if (req.session.cart && req.session.cart.length > 0) {
      for (let item of req.session.cart) {
        await db.query(
          "INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)",
          [rows[0].id, item.product_id, item.quantity]
        );
      }
      // Clear session cart after merging
      req.session.cart = [];
    }

    logger.info(`User logged in: ${email}`);
    if (req.session.user.role == "admin") {
      res.redirect("/admin/dashboard");
    } else {
      res.redirect("/");
    }
  } catch (err) {
    logger.error("Login Error: " + err.message);
    res.status(500).send("Something went wrong");
  }
};

exports.logoutUser = (req, res) => {
  logger.info(`User looged out: ${req.session.user?.email}`);
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

exports.addressEdit = async (req, res) => {
  try {
    const id = req.params.uid;
    const [rows] = await db.query(`SELECT * FROM users WHERE id=?`, [id]);
    res.render("user/addressEdit", { address: rows[0] });
  } catch (err) {
    res.status(500).send("Something went wrong");
  }
};

exports.addressSave = async (req, res) => {
  try {
    const { id, address, locality, landmark, city, pincode, state, phone } =
      req.body;
    await db.query(
      `UPDATE users set address=? , locality=?, landmark=?, city=?, pincode=?, state=?, phone=? WHERE id=?`,
      [address, locality, landmark, city, pincode, state, phone, id]
    );
    //res.send("done.");
    res.render("user/addressEditSuccess");
  } catch (err) {
    res.status(500).send("Something went wrong" + err);
  }
};
