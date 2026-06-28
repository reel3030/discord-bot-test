import express from "express";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

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

client.once("clientReady", async () => {
    console.log("Bot ready");
    const commands = [
    new SlashCommandBuilder()
      .setName("test")
      .setDescription("テストコマンド")
      .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Slash command registered.");
  // ←ここにスラッシュコマンド登録処理を追加
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

if (interaction.commandName === "test") {
  await interaction.reply("test");
}
  // コマンド処理
});


client.login(process.env.TOKEN);
