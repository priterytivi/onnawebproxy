import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// Proxy tất cả đường dẫn
app.get("/*", async (req, res) => {
  try {
    // Lấy URL gốc từ path (bỏ dấu "/")
    const targetUrl = req.originalUrl.substring(1);

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return res.status(400).send("URL không hợp lệ. Ví dụ: /http://saygex69tv.com");
    }

    const response = await fetch(targetUrl);

    // Lấy content type để trả về đúng định dạng
    const contentType = response.headers.get("content-type");
    if (contentType) res.set("Content-Type", contentType);

    // Lấy nội dung gốc
    const buffer = await response.buffer();
    res.send(buffer);

  } catch (error) {
    res.status(500).send("Proxy error: " + error.message);
  }
});

// Render yêu cầu phải dùng PORT từ env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy is running on port " + PORT));
