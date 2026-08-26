import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Hosts that should serve the public marketing landing page at "/"
// instead of the competition SPA. The app itself lives on app.<domain>.
const MARKETING_HOSTS = new Set([
  "testmyreadingspeed.com",
  "www.testmyreadingspeed.com",
]);

function isMarketingHost(host: string): boolean {
  const h = (host || "").toLowerCase().split(":")[0];
  return MARKETING_HOSTS.has(h);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const landingPath = path.resolve(distPath, "landing.html");
  const hasLanding = fs.existsSync(landingPath);

  // Both apex and www serve the landing; the page's <link rel="canonical">
  // points search engines at the bare apex. (No server-side www->apex
  // redirect, so a GoDaddy apex-forward can't create a redirect loop.)

  // robots.txt — real file (previously fell through to the SPA shell)
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    if (isMarketingHost(req.headers.host || "")) {
      res.send(
        "User-agent: *\nAllow: /\nSitemap: https://www.testmyreadingspeed.com/sitemap.xml\n",
      );
    } else {
      res.send("User-agent: *\nAllow: /\n");
    }
  });

  // sitemap.xml — real file for the marketing domain
  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml");
    res.send(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "  <url>\n" +
        "    <loc>https://www.testmyreadingspeed.com/</loc>\n" +
        "    <changefreq>weekly</changefreq>\n" +
        "    <priority>1.0</priority>\n" +
        "  </url>\n" +
        "</urlset>\n",
    );
  });

  // Marketing landing page at the apex root.
  app.get("/", (req, res, next) => {
    if (hasLanding && isMarketingHost(req.headers.host || "")) {
      return res.sendFile(landingPath);
    }
    next();
  });

  app.use(express.static(distPath));

  // fall through to index.html (SPA) if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
