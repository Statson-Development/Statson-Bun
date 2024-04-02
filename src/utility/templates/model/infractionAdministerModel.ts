import {
  ModalBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextInputBuilder,
  type ModalActionRowComponentBuilder,
} from "discord.js";

export default new ModalBuilder({
  title: "New Infraction",
  custom_id: "infraction_administer",
  components: [
    new ActionRowBuilder<ModalActionRowComponentBuilder>({
      components: [
        new TextInputBuilder({
          custom_id: "reason",
          label: "Reason",
          placeholder: "The mischief leading to this sanction 📜.",
          max_length: 35,
          min_length: 3,
          required: true,
          style: TextInputStyle.Short,
        }),
      ],
    }),
    new ActionRowBuilder<ModalActionRowComponentBuilder>({
      components: [
        new TextInputBuilder({
          custom_id: "mod-notes",
          label: "Mod Notes",
          placeholder: "Private mod notes on the user's antics 📝.",
          max_length: 1024,
          required: false,
          style: TextInputStyle.Paragraph,
        }),
      ],
    }),
    new ActionRowBuilder<ModalActionRowComponentBuilder>({
      components: [
        new TextInputBuilder({
          custom_id: "public-notes",
          label: "Public Notes",
          placeholder: "Public notes that the user can view 📝.",
          max_length: 1024,
          required: false,
          style: TextInputStyle.Paragraph,
        }),
      ],
    }),
  ],
});
