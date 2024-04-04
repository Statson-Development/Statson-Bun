import { ActionRowBuilder, ButtonBuilder, type MessageActionRowComponent } from "discord.js";

/**
 * Disables all buttons on a row.
 */
export default function disableButtonRow(row: MessageActionRowComponent[]) {
    return new ActionRowBuilder<ButtonBuilder>().setComponents(
        row.map((c: any) => new ButtonBuilder(c.data).setDisabled())
    )
}
