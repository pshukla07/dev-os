import { MAX_FILE_SIZE } from './tokenLimiter'

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx'])
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.js', '.mjs', '.cjs', '.php', '.zip',
  '.sh', '.bat', '.cmd', '.py', '.rb', '.ps1',
])
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function validateFileUpload(file: File): FileValidationResult {
  const name = file.name.toLowerCase()
  const dotIndex = name.lastIndexOf('.')
  const ext = dotIndex >= 0 ? name.slice(dotIndex) : ''

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: 'File type is not allowed.' }
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: 'Only PDF and DOCX files are accepted.' }
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: 'File MIME type does not match the allowed types.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds the 10 MB size limit.' }
  }

  return { valid: true }
}

export {
  UploadQuerySchema,
  ProcessSchema,
  EditTermSchema,
  ChatSchema,
  FeedbackSchema,
} from '@/lib/validators/contractSchemas'
