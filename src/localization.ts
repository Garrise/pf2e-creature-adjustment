/**
 * Localization helper for Foundry VTT.
 */

export function localize(key: string): string {
  return game?.i18n?.localize(key) ?? key;
}

export function format(key: string, data: Record<string, unknown>): string {
  return game?.i18n?.format(key, data) ?? key;
}
