import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/*", async (req, res) => {
  try {
    const targetUrl = req.originalUrl.substring(1);

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return res.status(400).send("URL không hợp lệ. Ví dụ: /http://domain.com/file.m3u8");
    }

    const response = await fetch(targetUrl);

    // Lấy Content-Type gốc
    let contentType = response.headers.get("content-type");

    // Nếu là m3u8 mà server không trả đúng => ép MIME-Type đúng chuẩn để player chạy được
    if (targetUrl.endsWith(".m3u8")) {
      contentType = "application/vnd.apple.mpegurl";
    }

    res.setHeader("Content-Type", contentType || "application/octet-stream");

    // Stream trực tiếp, không buffer → video không bị tải xuống
    response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy is running on port " + PORT));
