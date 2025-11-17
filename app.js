require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const morgan = require("morgan");
const logger = require("./config/logger");
const db = require("./config/db");
const app = express();
const PORT = process.env.PORT || 3000;

// Logging
//app.use(morgan("combined", { stream: logger.stream }));

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// View Engine
const { engine } = require("express-handlebars");
app.engine(
  "hbs",
  engine({
    extname: ".hbs",
    helpers: {
      multiply: (a, b) => a * b,
    },
  })
);

////////////////////////////////////////////////////////

////////////////////////////////////////////////////////
app.set("view engine", "hbs");
app.set("views", "./views");

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(
  session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

// app.use((req, res, next) => {
//   res.locals.cartCount = req.session.cart ? req.session.cart.length : "";
//   next();
// });

app.use(async (req, res, next) => {
  if (req.session.user) {
    const [rows] = await db.query(
      "SELECT SUM(quantity) as total FROM carts WHERE user_id = ?",
      [req.session.user.id]
    );
    res.locals.cartCount = rows[0].total || 0;
  } else {
    res.locals.cartCount = req.session.cart
      ? req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
      : "";
  }
  next();
});

// Routes
app.use("/", require("./routes/user"));
app.use("/checkout", require("./routes/payment"));
app.use("/admin", require("./routes/admin"));

// Error Handling
//#app.use(require("./middlewares/errorHandler"));

app.listen(PORT, () => {
  //logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});
