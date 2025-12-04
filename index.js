import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import url from "url";

const app = express();
app.use(cors());

// Fake UA để server không chặn
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";

app.get("/*", async (req, res) => {
  try {
    const targetUrl = req.originalUrl.substring(1);

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return res.status(400).send("Đây là công cụ Web Proxy được lập ra bởi ONNA Network, để có thể truy cập website trên đây, vui lòng hãy để link website như này "https://onnanetwork.xyz/https://ditmebonspamcommentsaodon.com");
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        "Referer": targetUrl,
        "Origin": "*"
      }
    });

    let contentType = response.headers.get("content-type") || "";

    // Nếu là M3U8 → cần xử lý rewrite
    if (targetUrl.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
      res.setHeader("Content-Type", contentType);

      let text = await response.text();

      // Rewrite tất cả .ts thành dạng proxy
      const base = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      text = text.replace(/(.*\.ts)/g, (match) => {
        const fullTs = url.resolve(base, match);
        return "/" + fullTs;
      });

      return res.send(text);
    }

    // Nếu là file TS → stream trực tiếp
    if (targetUrl.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
      return response.body.pipe(res);
    }

    // Các loại file khác
    res.setHeader("Content-Type", contentType);
    return response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Proxy Error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on port " + PORT));
