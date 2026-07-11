import dotenv from "dotenv";
dotenv.config();

import express from "express";
import {
  Client,
  GatewayIntentBits
} from "discord.js";

const app = express();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("clientReady", async () => {

  console.log(`Bot ready: ${client.user.tag}`);




  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.members.fetch();

  const threeDays = 1000 * 60 * 60 * 24 * 3;

  for (const member of guild.members.cache.values()) {

    try {

      if (member.user.bot) continue;

      if (!member.joinedAt) continue;

      if (Date.now() - member.joinedAt.getTime() < threeDays) {
        continue;
      }

      if (member.roles.cache.has(process.env.TARGET_ROLE_ID)) {
        continue;
      }

      try {
        await member.send(
          "3日以内に認証ロールが付与されなかったため、サーバーから退出となりました。\n dsc.gg/reel-server こちらから再参加が可能です。"
        );
      } catch {
        console.log(`${member.user.tag} にDMを送信できませんでした。`);
      }

      await member.kick(
        "3日以内に認証ロールが付与されなかったため botによりkickされました。"
      );

      console.log(`${member.user.tag} をKickしました。`);

    } catch (err) {
      console.error(`${member.user.tag} の処理中にエラー:`, err);
    }

  }

});

client.on("guildMemberAdd", async member => {

  console.log(`${member.user.tag} が参加しました`);

  const threeDays = 1000 * 60 * 60 * 24 * 3;

  setTimeout(async () => {

    try {

      const freshMember = await member.guild.members.fetch(member.id);

      if (freshMember.roles.cache.has(process.env.TARGET_ROLE_ID)) {
        return;
      }

      try {
        await freshMember.send(
          "3日以内に認証ロールが付与されなかったため、サーバーから退出となりました。"
        );
      } catch {
        console.log(`${freshMember.user.tag} にDMを送信できませんでした。`);
      }

      await freshMember.kick(
        "3日以内に認証ロールが付与されなかったため"
      );

      console.log(`${freshMember.user.tag} をKickしました。`);

    } catch (err) {
      console.error(`${member.user.tag} の確認中にエラー:`, err);
    }

  }, threeDays);

});

client.login(process.env.TOKEN);

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server started on port ${PORT}`);
});
