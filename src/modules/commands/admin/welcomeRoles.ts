import guildModel from "#utility/schemas/guild.model";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ComponentType,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  SelectMenuDefaultValueType,
} from "discord.js";
import { commandModule } from "neos-handler";

export default commandModule({
  name: "welcomeroles",
  description: "Welcome roles",
  guildOnly: {
    condition: true,
  },
  botPermissions: {
    condition: ["ManageRoles"],
  },
  userPermissions: {
    condition: ["ManageRoles"],
  },
  options: [
    {
      name: "set",
      description: "Set the welcome roles.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "add",
      description:
        "Add a role to the list of roles to be added to new members.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "role",
          description: "The role to add to the list.",
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: "remove",
      description:
        "Remove a role from the list of roles to be added to new members.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "role",
          description: "The role to remove from the list.",
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: "display",
      description: "Displays all of the welcome roles.",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  execute: async (interaction) => {
    // Getting the guild document.
    const guildDoc = await guildModel.findOne({
      id: interaction.guildId,
    });

    // Switching on the subcommand to cover all cases.
    switch (interaction.options.getSubcommand()) {
      case "set": {
        // Replying with the select menu.
        const response = await interaction.reply({
          components: [createRoleSelectMenu(guildDoc?.options.newMemberRoles)],
        });

        // Awaiting a response.
        await response
          .awaitMessageComponent({
            componentType: ComponentType.RoleSelect,
            time: 500_000,
          })
          .then(async (select: RoleSelectMenuInteraction) => {
            // Updating the document.
            if (guildDoc) {
              guildDoc.options.newMemberRoles = select.values;
              await guildDoc.save();
            } else {
              const newGuildDoc = new guildModel({
                id: interaction.guildId,
                options: {
                  newMemberRoles: select.values,
                },
              });

              await newGuildDoc.save();
            }

            // Deferring update and replying by editing original message.
            await select.deferUpdate();

            await response.edit({
              content: `I have set the welcome roles to ${select.values
                .map((r) => `\n- <@&${r}>`)
                .join("")}.`,
              components: [],
              allowedMentions: { parse: [] }, // So we wont @/mention any roles.
            });
          });
        break;
      }
      case "add": {
        const role = interaction.options.getRole("role")!;

        if (
          role.position > interaction.guild!.members.me!.roles.highest.position
        ) {
          return interaction.reply({
            content: `That role is higher than mine and therefor I cannot add it to new members ❌.`,
            ephemeral: true,
          });
        }

        // Updating with the new role.
        if (guildDoc) {
          guildDoc.options.newMemberRoles.push(role.id);
        } else {
          const newGuildDoc = new guildModel({
            id: interaction.guildId,
            options: {
              newMemberRoles: [role.id],
            },
          });

          await newGuildDoc.save();
        }

        // Replying.
        await interaction.reply({
          content: `I have added ${role} to the list of welcome roles.`,
          allowedMentions: { parse: [] }, // So we wont @/mention the role.
        });
        break;
      }
      case "remove": {
        const role = interaction.options.getRole("role")!;

        // Getting he document.
        const guildDoc = await guildModel.findOne({
          id: interaction.guildId,
        });

        if (!guildDoc || !guildDoc.options.newMemberRoles.includes(role.id)) {
          return interaction.reply({
            content: `The role ${role} is not in the list of welcome roles ❌.`,
            ephemeral: true,
          });
        }

        // Updating with the new role.
        guildDoc.options.newMemberRoles =
          guildDoc.options.newMemberRoles.filter((r) => r !== role.id);

        // Saving.
        await guildDoc.save();

        // Replying.
        await interaction.reply({
          content: `I have removed ${role} from the list of welcome roles.`,
          allowedMentions: { parse: [] }, // So we wont @/mention the role.
        });
        break;
      }
      case "display": {
        if (!guildDoc || guildDoc.options.newMemberRoles.length === 0) {
          return interaction.reply({
            content: `There are no welcome roles set ❌.`,
            ephemeral: true,
          });
        }

        // Replying.
        await interaction.reply({
          content: `The current welcome roles are: ${guildDoc.options.newMemberRoles
            .map((r) => `\n- <@&${r}>`)
            .join("")}.`,
          allowedMentions: { parse: [] }, // So we wont @/mention any roles.
        });
        break;
      }
    }
  },
});

function createRoleSelectMenu(currentRoleIds?: string[]) {
  return new ActionRowBuilder<RoleSelectMenuBuilder>({
    components: [
      new RoleSelectMenuBuilder({
        customId: "welcomeroles:set",
        placeholder: "Roles for new members.",
        max_values: 20,
        default_values: currentRoleIds?.map((id) => ({
          id,
          type: SelectMenuDefaultValueType.Role,
        })),
      }),
    ],
  });
}
