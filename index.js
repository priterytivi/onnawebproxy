// index.js (CommonJS - deploy ổn định trên Render)
const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const url = require("url");

const app = express();
app.use(cors());

// Mặc định sẽ thêm http:// nếu user không cung cấp scheme
const DEFAULT_SCHEME = "http://";

// Fake UA để tránh server từ chối
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";

app.get("/*", async (req, res) => {
  try {
    // lấy phần path sau domain proxy, bao gồm cả query string
    let targetPath = req.originalUrl.substring(1); // bỏ dấu "/"

    if (!targetPath) {
      return res.status(400).send("Vui lòng cung cấp URL để proxy, ví dụ: /http://example.com/playlist.m3u8");
    }

    // Nếu không có scheme thì thêm DEFAULT_SCHEME
    let targetUrl = targetPath.match(/^https?:\/\//i) ? targetPath : DEFAULT_SCHEME + targetPath;

    // Chuẩn hóa (tránh // lỗi)
    try {
      // tạo URL để xác nhận hợp lệ
      targetUrl = new URL(targetUrl).toString();
    } catch (e) {
      return res.status(400).send("URL không hợp lệ (sau khi thêm scheme vẫn không hợp lệ).");
    }

    // Gọi tới server gốc với header giả
    const parsed = new URL(targetUrl);
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Referer": parsed.origin,
      },
      // timeout có thể thêm nếu cần
    });

    if (!response.ok) {
      // truyền mã lỗi gốc (404/403/...)
      return res.status(response.status).send(`Upstream error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    // Nếu là M3U8 -> trả text và ép content-type, đồng thời rewrite đơn giản (nếu cần)
    if (targetUrl.endsWith(".m3u8")) {
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

      let text = await response.text();

      // Tùy chọn: rewrite relative .ts URLs thành đi qua proxy (nên bật nếu .m3u8 chứa đường dẫn relative)
      // Ví dụ: "segment1.ts" -> "/http://domain/..../segment1.ts"
      // Ta xác định base để resolve các URL relative
      const base = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      // Thay mọi đường dẫn .ts (relative hoặc absolute không có scheme)
      text = text.replace(/(^|[\r\n])([^\r\n#][^\r\n]*\.ts\b[^\r\n]*)/g, (m, p1, p2) => {
        // p2 có thể là relative path hoặc absolute url
        let resolved;
        try {
          // nếu p2 bắt đầu bằng http -> giữ nguyên
          if (/^https?:\/\//i.test(p2)) {
            resolved = p2;
          } else {
            // resolve relative
            resolved = new URL(p2, base).toString();
          }
        } catch (e) {
          resolved = new URL(p2, base).toString();
        }
        // trả về proxy path (thêm scheme vào url đã resolve)
        return `${p1}${"/" + resolved}`;
      });

      return res.send(text);
    }

    // Nếu là TS segment -> stream với content-type video/mp2t
    if (targetUrl.endsWith(".ts")) {
      res.setHeader("Content-Type", "video/mp2t");
      return response.body.pipe(res);
    }

    // Các loại khác -> truyền nguyên header content-type và stream
    if (contentType) res.setHeader("Content-Type", contentType);
    return response.body.pipe(res);

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy internal error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on port " + PORT));
