import express from "express";
import pool from "./db.js";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
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

    await pool.query(`
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  min_reward INTEGER NOT NULL,
  max_reward INTEGER NOT NULL,
  cooldown INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
`);

console.log("jobsテーブルを確認しました");

await pool.query(`
CREATE TABLE IF NOT EXISTS job_messages (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  message TEXT NOT NULL
)
`);

console.log("job_messagesテーブルを確認しました");

await pool.query(`
ALTER TABLE users
ADD COLUMN IF NOT EXISTS job_id INTEGER REFERENCES jobs(id)
`);

await pool.query(`
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_work TIMESTAMP
`);

console.log("usersテーブルを更新しました");


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

       ,
new SlashCommandBuilder()
  .setName("job")
  .setDescription("職業管理")
  .addSubcommand(subcommand =>
    subcommand
      .setName("create")
      .setDescription("職業を作成")
      .addStringOption(option =>
        option
          .setName("name")
          .setDescription("職業名")
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName("min_reward")
          .setDescription("最低報酬")
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName("max_reward")
          .setDescription("最大報酬")
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName("cooldown")
          .setDescription("クールダウン（秒）")
          .setRequired(true)
      )

      .addStringOption(option =>
         option
          .setName("unit")
          .setDescription("クールダウンの単位")
          .setRequired(true)
          .addChoices(
          { name: "秒", value: "seconds" },
          { name: "分", value: "minutes" },
          { name: "時間", value: "hours" },
          { name: "日", value: "days" },
          { name: "年", value: "years" }
    )
)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

await rest.put(
  Routes.applicationGuildCommands(
    client.user.id,
    process.env.GUILD_ID
  ),
  { body: commands }
);

  console.log("Slash command registered.");
  console.log("Bot ready");
  // ←ここにスラッシュコマンド登録処理を追加
});

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "test") {
      await interaction.reply("test");
      return;
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
      return;
    }

    if (interaction.commandName === "job") {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "create") {

        const name = interaction.options.getString("name");
        const minReward = interaction.options.getInteger("min_reward");
        const maxReward = interaction.options.getInteger("max_reward");
        const cooldown = interaction.options.getInteger("cooldown");
        const unit = interaction.options.getString("unit");

        let cooldownSeconds = cooldown;

        switch (unit) {
          case "minutes":
            cooldownSeconds *= 60;
            break;
          case "hours":
            cooldownSeconds *= 60 * 60;
            break;
          case "days":
            cooldownSeconds *= 60 * 60 * 24;
            break;
          case "years":
            cooldownSeconds *= 60 * 60 * 24 * 365;
            break;
        }

        if (minReward > maxReward) {
          await interaction.reply({
            content: "❌ 最低報酬は最大報酬以下にしてください。",
            ephemeral: true
          });
          return;
        }

        await pool.query(
          `INSERT INTO jobs
          (guild_id, name, min_reward, max_reward, cooldown)
          VALUES ($1, $2, $3, $4, $5)`,
          [
            interaction.guild.id,
            name,
            minReward,
            maxReward,
            cooldownSeconds
          ]
        );

        await interaction.reply(`✅ 職業「${name}」を作成しました！`);
        return;
      }
    }

  } catch (err) {
    console.error(err);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ エラーが発生しました。\n\`\`\`${err.message}\`\`\``,
        ephemeral: true
      });
    }
  }
});


client.login(process.env.TOKEN);
