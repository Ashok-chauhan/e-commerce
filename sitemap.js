require("dotenv").config();
const { SitemapStream, streamToPromise } = require("sitemap");
const { createWriteStream } = require("fs");
const db = require("./config/db"); // your DB connection file

(async () => {
  const sitemap = new SitemapStream({ hostname: "https://swagly.in" });

  // Fetch products
  const [products] = await db.query("SELECT slug, created_at FROM products");

  sitemap.write({ url: "/", changefreq: "daily", priority: 1.0 });

  products.forEach((product) => {
    sitemap.write({
      url: `/product/${product.slug}`,
      lastmod: `${product.created_at}`,
      changefreq: "daily",
      priority: 0.7,
    });
  });

  sitemap.end();

  const xmlData = await streamToPromise(sitemap);
  createWriteStream("./public/assets/pages/sitemap.xml").write(xmlData);
  console.log("Sitemap created successfully!");
})();
