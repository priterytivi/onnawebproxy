const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());

app.get("/*", async (req, res) => {
  try {
    const targetUrl = req.originalUrl.substring(1);

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return res.status(400).send("URL không hợp lệ.");
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // Nếu là file M3U8 → đặt MIME đúng để player chạy
    if (targetUrl.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      const text = await response.text();
      return res.send(text);
    }

    // Nếu là file TS → stream
    if (targetUrl.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
      return response.body.pipe(res);
    }

    // File bình thường khác
    res.setHeader("Content-Type", contentType);
    return response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on port " + PORT));
