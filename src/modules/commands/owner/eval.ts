import { commandModule } from "neos-handler";
import ownerOnly from "src/plugins/ownerOnly";
import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord.js";

export default commandModule({
  name: "eval",
  description: "Evaluates JavaScript code 🧪.",
  type: ApplicationCommandType.ChatInput,
  userPermissions: {
    condition: ["Administrator"],
  },
  plugins: [ownerOnly()],
  options: [
    {
      name: "code",
      description: "The code to evaluate.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  execute: async (interaction) => {
    const code = interaction.options.getString("code")!;
    try {
      const result = eval(code);
      await interaction.reply(`\`\`\`js\n${result}\`\`\``);
    } catch (e) {
      await interaction.reply(`\`\`\`js\n${e}\`\`\``);
    }
  },
});
