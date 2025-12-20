const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Client-ID public của Twitch
const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

// Cache token trong RAM
const tokenCache = {};
const CACHE_TIME = 60 * 1000; // 60 giây (an toàn)

// Hàm lấy token Twitch (có cache)
async function getTwitchToken(channel) {
  const cached = tokenCache[channel];

  // Nếu token còn hạn → dùng lại
  if (cached && cached.expire > Date.now()) {
    return cached.token;
  }

  // Gọi Twitch GQL lấy token mới
  const response = await axios.post(
    "https://gql.twitch.tv/gql",
    [
      {
        operationName: "PlaybackAccessToken",
        variables: {
          isLive: true,
          login: channel,
          playerType: "site"
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "0828119ded94e82b08e60e5bafad7b224d85a6e6f4f9b6b5d1a21a5e2b4f9e0a"
          }
        }
      }
    ],
    {
      headers: {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json"
      }
    }
  );

  const token =
    response.data?.[0]?.data?.streamPlaybackAccessToken;

  if (!token) return null;

  // Cache token
  tokenCache[channel] = {
    token,
    expire: Date.now() + CACHE_TIME
  };

  return token;
}

// API GET m3u8
app.get("/twitch/get.m3u8", async (req, res) => {
  const channel = req.query.id;

  if (!channel) {
    return res.status(400).send("Missing channel id");
  }

  try {
    const token = await getTwitchToken(channel);

    if (!token) {
      return res.status(404).send("Channel offline or not found");
    }

    // Link m3u8 gốc của Twitch
    const m3u8Url =
      `https://usher.ttvnw.net/api/channel/hls/${channel}.m3u8` +
      `?sig=${token.signature}` +
      `&token=${encodeURIComponent(token.value)}` +
      `&allow_source=true` +
      `&allow_audio_only=true`;

    // Redirect sang link m3u8
    res.redirect(302, m3u8Url);

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal server error");
  }
});

// Trang test
app.get("/", (req, res) => {
  res.send("Twitch m3u8 proxy is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
