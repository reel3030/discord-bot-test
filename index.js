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

      if (interaction.options.getSubcommand() === "create") {

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
          return interaction.reply({
            content: "❌ 最低報酬は最大報酬以下にしてください。",
            ephemeral: true
          });
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