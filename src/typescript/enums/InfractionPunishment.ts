import type { PermissionResolvable } from "discord.js";

/**
 * The punishments that can be given to a user for an infraction.
 */
export enum InfractionPunishment {
  Timeout = "timeout",
  Kick = "kick",
  TempBan = "tempban",
  Ban = "ban",
}

// todo: might need to move this as its not an enum:
export const requiredPermissionsMap = new Map<InfractionPunishment, PermissionResolvable>([
  [InfractionPunishment.Ban, "BanMembers"],
  [InfractionPunishment.TempBan, "BanMembers"],
  [InfractionPunishment.Kick, "KickMembers"],
  [InfractionPunishment.Timeout, "ModerateMembers"],
])
