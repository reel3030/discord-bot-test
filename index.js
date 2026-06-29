import express from "express";
import pool from "./db.js";
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
   try {
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL接続成功:", result.rows[0]);
  } catch (err) {
    console.error("PostgreSQL接続失敗:", err);
  }
  
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      balance BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("usersテーブルを確認しました");

    console.log("Bot ready");
    const commands = [
    new SlashCommandBuilder()
      .setName("test")
      .setDescription("テストコマンド")
      .toJSON()
      ,
    new SlashCommandBuilder()
      .setName("balance")
      .setDescription("所持金を確認します")
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
   if (interaction.commandName === "balance") {

   await pool.query(
      `INSERT INTO users (id)
       VALUES ($1)
       ON CONFLICT (id) DO NOTHING`,
      [interaction.user.id]
   );

   const result = await pool.query(
     `SELECT balance FROM users WHERE id = $1`,
     [interaction.user.id]
    );

   const balance = result.rows[0].balance;

   await interaction.reply(`💰 あなたの所持金は **${balance}円** です！`);
  }

  // コマンド処理
});


client.login(process.env.TOKEN);
