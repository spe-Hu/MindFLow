import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { AttachmentItem } from '@/lib/db'

const BUCKET = 'mindflow-attachments'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

function validateFile(file: File): { ok: boolean; error?: string } {
  if (file.size > MAX_SIZE) {
    return { ok: false, error: `文件大小超过 ${MAX_SIZE / 1024 / 1024}MB 限制` }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: `不支持的文件类型: ${file.type}` }
  }
  return { ok: true }
}

function makePath(userId: string, taskId: string, file: File): string {
  const id = crypto.randomUUID()
  const ext = file.name.split('.').pop() || ''
  const safeName = ext ? `${id}.${ext}` : id
  return `${userId}/${taskId}/${safeName}`
}

/**
 * Upload a file attachment to Supabase Storage.
 * Returns the AttachmentItem on success, throws on failure.
 */
export async function uploadAttachment(
  taskId: string,
  file: File
): Promise<AttachmentItem> {
  const userId = getUserId()
  if (!userId) throw new Error('用户未登录，无法上传附件')
  if (!navigator.onLine) throw new Error('当前处于离线状态，无法上传附件')

  const validation = validateFile(file)
  if (!validation.ok) throw new Error(validation.error)

  const path = makePath(userId, taskId, file)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })

  if (uploadError) {
    throw new Error(`上传失败: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return {
    id: path.split('/').pop()!,
    name: file.name,
    size: file.size,
    type: file.type,
    url: urlData.publicUrl,
    path,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Delete an attachment from Supabase Storage.
 */
export async function deleteAttachment(path: string): Promise<void> {
  const userId = getUserId()
  if (!userId) throw new Error('用户未登录')
  if (!navigator.onLine) throw new Error('当前处于离线状态')

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    throw new Error(`删除失败: ${error.message}`)
  }
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Check if a file type is an image.
 */
export function isImage(type: string): boolean {
  return type.startsWith('image/')
}
