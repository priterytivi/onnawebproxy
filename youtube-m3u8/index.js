import express from "express";
import { exec } from "child_process";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/youtube/live.m3u8", (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send("Missing channel id");

  const ytUrl = `https://www.youtube.com/@${id}/live`;

  exec(`yt-dlp -f best --print manifest_url ${ytUrl}`, async (err, stdout) => {
    if (err || !stdout) {
      return res.status(404).send("Livestream not found");
    }

    const m3u8Url = stdout.trim();
    const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);

    try {
      const r = await fetch(m3u8Url);
      let text = await r.text();

      // 🔥 rewrite URL tương đối → tuyệt đối
      text = text.replace(
        /^(?!#)(.+)$/gm,
        (line) => {
          if (line.startsWith("http")) return line;
          return baseUrl + line;
        }
      );

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.send(text);

    } catch {
      res.status(500).send("Proxy stream error");
    }
  });
});

app.listen(PORT, () => {
  console.log("Running on " + PORT);
});
