export const MAX_FILE_SIZE    = 10 * 1024 * 1024                                          // 10 MB
export const MAX_PAGES        = 200
export const MAX_MESSAGE_LEN  = 5000
export const MAX_CHAT_HISTORY = parseInt(process.env.MAX_CHAT_HISTORY ?? '100', 10)

export function validateFileSize(bytes: number): boolean   { return bytes <= MAX_FILE_SIZE }
export function validatePageCount(pages: number): boolean  { return pages <= MAX_PAGES }
export function validateMessageLength(msg: string): boolean { return msg.length <= MAX_MESSAGE_LEN }
