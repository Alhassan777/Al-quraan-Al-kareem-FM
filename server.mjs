import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3001;

// Radio stream URL
const RADIO_STREAM_URL = "https://n10.radiojar.com/8s5u5tpdtwzuv.mp3";

app.get("/proxyStream", async (req, res) => {
  try {
    console.log(`Proxying radio stream from: ${RADIO_STREAM_URL}`);

    const response = await fetch(RADIO_STREAM_URL);

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", response.headers.get("Content-Type") || "audio/mpeg");

    response.body.pipe(res);
  } catch (error) {
    console.error("Error proxying stream:", error);
    res.status(500).send("Unable to fetch radio stream.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
