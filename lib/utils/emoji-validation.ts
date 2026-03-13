/** Validate emoji name: alphanumeric, hyphens, underscores, 1-100 chars */
const EMOJI_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

export function isValidEmojiName(name: string): boolean {
  return typeof name === 'string' && name.length >= 1 && name.length <= 100 && EMOJI_NAME_PATTERN.test(name)
}
