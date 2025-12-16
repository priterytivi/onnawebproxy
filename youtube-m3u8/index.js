import express from "express";
import { exec } from "child_process";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/youtube/live.m3u8", (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send("Missing channel id");

  const ytUrl = `https://www.youtube.com/@${id}/live`;

  exec(
    `yt-dlp -f best --print manifest_url ${ytUrl}`,
    async (err, stdout) => {
      if (err || !stdout) {
        return res.status(404).send("Livestream not found");
      }

      try {
        const m3u8Url = stdout.trim();
        const r = await fetch(m3u8Url);
        res.setHeader(
          "Content-Type",
          "application/vnd.apple.mpegurl"
        );
        r.body.pipe(res);
      } catch (e) {
        res.status(500).send("Stream error");
      }
    }
  );
});

app.get("/", (_, res) => {
  res.send("YouTube Live m3u8 API running");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
