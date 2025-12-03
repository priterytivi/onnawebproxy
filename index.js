import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/*", async (req, res) => {
  try {
    // Lấy toàn bộ path sau domain proxy
    const targetUrl = req.originalUrl.slice(1); // bỏ dấu "/"

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return res.status(400).send("URL không hợp lệ");
    }

    const response = await fetch(targetUrl);
    const contentType = response.headers.get("content-type");

    res.set("Content-Type", contentType || "text/plain");

    const body = await response.buffer();
    res.send(body);
  } catch (err) {
    res.status(500).send("Lỗi proxy: " + err.message);
  }
});

app.listen(3000, () => console.log("Proxy đang chạy trên cổng 3000"));
