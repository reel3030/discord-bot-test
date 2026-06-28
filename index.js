import express from "express";
import { Client, GatewayIntentBits } from "discord.js";

const app = express();

// Renderがアクセスする用
app.get("/", (req, res) => {
  res.send("Bot is running");
});

// Cloudflare WorkerがPingする用
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Renderが指定するポートで待ち受け
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server started on port ${PORT}`);
});

// Discord Bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log("Bot ready");
});

client.login(process.env.TOKEN);
