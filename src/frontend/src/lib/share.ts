// ============================================
// 分享链接服务 — 只读分享（Snapshot 模式）
// ============================================
// 规则：
// 1. 用户分享时，将当前项目 snapshot（项目名+导图数据+布局）存入 shared_links 表
// 2. SharePage 通过 token 直接查询 shared_links，无需登录
// 3. Snapshot 是分享时点的静态快照，后续项目修改不影响已分享的内容
// ============================================

import { supabase } from '@/lib/supabase'

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export interface ShareSnapshot {
  projectName: string
  treeData: Record<string, unknown>
  layout: string
  createdAt: string
}

export interface SharedLink {
  id: string
  project_id: string
  token: string
  snapshot: ShareSnapshot
  created_at: string
  expires_at: string | null
}

/**
 * 为指定项目创建分享链接
 */
export async function createSharedLink(
  projectId: string,
  projectName: string,
  treeData: Record<string, unknown>,
  layout: string
): Promise<string> {
  const userResponse = await supabase.auth.getUser()
  const userId = userResponse.data.user?.id
  if (!userId) throw new Error('请先登录后再分享项目')

  const token = generateToken()
  const snapshot: ShareSnapshot = {
    projectName,
    treeData,
    layout,
    createdAt: new Date().toISOString(),
  }

  const { error } = await supabase.from('shared_links').insert({
    project_id: projectId,
    token,
    snapshot,
    created_by: userId,
  })

  if (error) throw new Error('创建分享链接失败: ' + error.message)
  return token
}

/**
 * 通过 token 获取分享数据（无需登录，公共访问）
 */
export async function getSharedLink(token: string): Promise<SharedLink> {
  const { data, error } = await supabase
    .from('shared_links')
    .select('*')
    .eq('token', token)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('分享链接不存在或已过期')
    }
    throw new Error('获取分享内容失败: ' + error.message)
  }

  // 检查是否已过期
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new Error('分享链接已过期')
  }

  return data as SharedLink
}

/**
 * 删除分享链接
 */
export async function deleteSharedLink(token: string): Promise<void> {
  const { error } = await supabase
    .from('shared_links')
    .delete()
    .eq('token', token)

  if (error) throw new Error('删除分享链接失败: ' + error.message)
}

/**
 * 获取当前用户为某个项目创建的所有分享链接
 */
export async function getProjectSharedLinks(projectId: string): Promise<SharedLink[]> {
  const userResponse = await supabase.auth.getUser()
  const userId = userResponse.data.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('shared_links')
    .select('*')
    .eq('project_id', projectId)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[share] getProjectSharedLinks failed:', error)
    return []
  }
  return (data || []) as SharedLink[]
}

/**
 * 构建完整的分享 URL
 */
export function buildShareUrl(token: string): string {
  const base = window.location.origin
  return `${base}/share/${token}`
}