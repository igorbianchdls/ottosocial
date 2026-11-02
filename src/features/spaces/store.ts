// Spaces, folders and files with trash, favorites and recents. Kept in this browser until Supabase (phase 2).
import { files as seedFiles, folders as seedFolders, spaces as seedSpaces, type FileKind, type Folder, type MediaFile, type Space } from './data'
import { deleteBlob, putBlob, copyBlob } from './blobs'

export type DFile = MediaFile & { trashedAt?: string; favorite?: boolean; uploaded?: boolean; mime?: string; openedAt?: string; updatedAt?: string }
export type DFolder = Folder & { trashedAt?: string; favorite?: boolean; openedAt?: string }
export type Drive = { spaces: Space[]; folders: DFolder[]; files: DFile[] }
export type Item = { type: 'folder'; folder: DFolder } | { type: 'file'; file: DFile }

const KEY = 'ottosocial-drive-v1'
const seed: Drive = { spaces: seedSpaces, folders: seedFolders, files: seedFiles }
let state: Drive = seed
let loaded = false
const listeners = new Set<() => void>()

function ensure() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try { const raw = localStorage.getItem(KEY); if (raw) state = JSON.parse(raw) } catch { /* keeps the seed */ }
}
function commit(next: Drive) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage full or blocked */ }
  listeners.forEach(l => l())
}
export const subscribeDrive = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export const getDrive = () => { ensure(); return state }
export const seedDrive = () => seed

const now = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const today = () => now().slice(0, 10)
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

// ---------- selectors ----------

export const itemKey = (i: Item) => i.type === 'folder' ? `d:${i.folder.id}` : `f:${i.file.id}`

/** Ancestors from the root down to (and including) the folder. */
export function folderPath(d: Drive, folderId: string | null): DFolder[] {
  const out: DFolder[] = []
  let f = d.folders.find(x => x.id === folderId)
  while (f) { out.unshift(f); f = d.folders.find(x => x.id === f!.parentId) }
  return out
}

/** Trashed itself or inside a trashed folder. */
export const folderGone = (d: Drive, folderId: string | null) => folderPath(d, folderId).some(f => f.trashedAt)
export const fileGone = (d: Drive, f: DFile) => !!f.trashedAt || folderGone(d, f.folderId)

export const childFolders = (d: Drive, spaceId: string, parentId: string | null) =>
  d.folders.filter(f => f.spaceId === spaceId && f.parentId === parentId && !f.trashedAt)
export const childFiles = (d: Drive, spaceId: string, folderId: string | null) =>
  d.files.filter(f => f.spaceId === spaceId && f.folderId === folderId && !f.trashedAt)

/** Every folder id under `folderId`, including itself. */
export function descendants(d: Drive, folderId: string): string[] {
  const out = [folderId]
  for (let i = 0; i < out.length; i++) out.push(...d.folders.filter(f => f.parentId === out[i]).map(f => f.id))
  return out
}

export const liveFiles = (d: Drive) => d.files.filter(f => !fileGone(d, f))
export const liveFolders = (d: Drive) => d.folders.filter(f => !folderGone(d, f.id))
export function folderStats(d: Drive, folderId: string) {
  const ids = new Set(descendants(d, folderId))
  const list = d.files.filter(f => f.folderId && ids.has(f.folderId) && !f.trashedAt)
  return { files: list.length, folders: ids.size - 1, size: list.reduce((v, f) => v + f.size, 0) }
}
export function spaceStats(d: Drive, spaceId: string) {
  const list = liveFiles(d).filter(f => f.spaceId === spaceId)
  return { files: list.length, folders: liveFolders(d).filter(f => f.spaceId === spaceId).length, size: list.reduce((v, f) => v + f.size, 0) }
}
/** Folder name with its path, for pickers: "Reels publicados / Série ChatGPT". */
export const folderLabel = (d: Drive, folderId: string | null) => folderPath(d, folderId).map(f => f.name).join(' / ')

export function kindOf(mime: string, name: string): FileKind {
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(name)) return 'video'
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return 'image'
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/i.test(name)) return 'audio'
  return 'text'
}

// ---------- actions ----------

const touchFolders = (d: Drive, ids: (string | null)[]) => d.folders.map(f => ids.includes(f.id) ? { ...f, updatedAt: today() } : f)

export function createSpace(name: string) {
  const d = getDrive(), id = uid('s')
  commit({ ...d, spaces: [...d.spaces, { id, name }] })
  return id
}
export const renameSpace = (id: string, name: string) => { const d = getDrive(); commit({ ...d, spaces: d.spaces.map(s => s.id === id ? { ...s, name } : s) }) }
/** Only empty spaces can be deleted; everything else goes through the trash. */
export function deleteSpace(id: string) {
  const d = getDrive()
  if (d.folders.some(f => f.spaceId === id) || d.files.some(f => f.spaceId === id)) return false
  commit({ ...d, spaces: d.spaces.filter(s => s.id !== id) })
  return true
}

export function createFolder(spaceId: string, parentId: string | null, name: string) {
  const d = getDrive(), id = uid('d')
  const folder: DFolder = { id, spaceId, parentId, name, description: '', tags: [], createdAt: today(), updatedAt: today() }
  commit({ ...d, folders: [...touchFolders(d, [parentId]), folder] })
  return id
}

export function rename(item: Item, name: string) {
  const d = getDrive()
  if (item.type === 'folder') commit({ ...d, folders: d.folders.map(f => f.id === item.folder.id ? { ...f, name, updatedAt: today() } : f) })
  else commit({ ...d, files: d.files.map(f => f.id === item.file.id ? { ...f, name, updatedAt: now() } : f) })
}

/** Moves items into a space root or folder. A folder can't go inside itself or its children. */
export function moveItems(items: Item[], spaceId: string, folderId: string | null) {
  const d = getDrive()
  const blocked = new Set(items.flatMap(i => i.type === 'folder' ? descendants(d, i.folder.id) : []))
  if (folderId && blocked.has(folderId)) return false
  const folderIds = new Set(items.filter(i => i.type === 'folder').map(i => (i as { folder: DFolder }).folder.id))
  const fileIds = new Set(items.filter(i => i.type === 'file').map(i => (i as { file: DFile }).file.id))
  // Moving a folder to another space carries its whole subtree and files along.
  const subtree = new Set([...folderIds].flatMap(id => descendants(d, id)))
  commit({
    ...d,
    folders: touchFolders(d, [folderId]).map(f => folderIds.has(f.id) ? { ...f, spaceId, parentId: folderId, updatedAt: today() } : subtree.has(f.id) ? { ...f, spaceId } : f),
    files: d.files.map(f => fileIds.has(f.id) ? { ...f, spaceId, folderId, updatedAt: now() } : f.folderId && subtree.has(f.folderId) ? { ...f, spaceId } : f),
  })
  return true
}

export function duplicateFiles(ids: string[]) {
  const d = getDrive()
  const copies = d.files.filter(f => ids.includes(f.id)).map(f => {
    const id = uid('f'), dot = f.name.lastIndexOf('.')
    const name = dot > 0 ? `${f.name.slice(0, dot)} (cópia)${f.name.slice(dot)}` : `${f.name} (cópia)`
    if (f.uploaded) void copyBlob(f.id, id)
    return { ...f, id, name, favorite: false, createdAt: today(), updatedAt: now(), openedAt: undefined }
  })
  commit({ ...d, files: [...d.files, ...copies] })
  return copies.map(c => c.id)
}

export function trashItems(items: Item[]) {
  const d = getDrive(), at = now()
  const fo = new Set(items.flatMap(i => i.type === 'folder' ? [i.folder.id] : [])), fi = new Set(items.flatMap(i => i.type === 'file' ? [i.file.id] : []))
  commit({ ...d, folders: d.folders.map(f => fo.has(f.id) ? { ...f, trashedAt: at } : f), files: d.files.map(f => fi.has(f.id) ? { ...f, trashedAt: at } : f) })
}

export function restoreItems(items: Item[]) {
  const d = getDrive()
  const fo = new Set(items.flatMap(i => i.type === 'folder' ? [i.folder.id] : [])), fi = new Set(items.flatMap(i => i.type === 'file' ? [i.file.id] : []))
  commit({ ...d, folders: d.folders.map(f => fo.has(f.id) ? { ...f, trashedAt: undefined } : f), files: d.files.map(f => fi.has(f.id) ? { ...f, trashedAt: undefined } : f) })
}

/** Removes for good, including subfolders, their files and stored uploads. */
export function deleteForever(items: Item[]) {
  const d = getDrive()
  const folderIds = new Set(items.flatMap(i => i.type === 'folder' ? descendants(d, i.folder.id) : []))
  const fileIds = new Set(items.flatMap(i => i.type === 'file' ? [i.file.id] : []))
  const gone = d.files.filter(f => fileIds.has(f.id) || (f.folderId && folderIds.has(f.folderId)))
  gone.filter(f => f.uploaded).forEach(f => void deleteBlob(f.id))
  const goneIds = new Set(gone.map(f => f.id))
  commit({ ...d, folders: d.folders.filter(f => !folderIds.has(f.id)), files: d.files.filter(f => !goneIds.has(f.id)) })
}

/** Top-level trashed items: a trashed folder shows once, not each file inside it. */
export function trashed(d: Drive): Item[] {
  const folders = d.folders.filter(f => f.trashedAt && !folderPath(d, f.parentId).some(p => p.trashedAt))
  const files = d.files.filter(f => f.trashedAt && !folderGone(d, f.folderId))
  return [...folders.map(folder => ({ type: 'folder' as const, folder })), ...files.map(file => ({ type: 'file' as const, file }))]
}
export const emptyTrash = () => deleteForever(trashed(getDrive()))

export function setFavorite(items: Item[], favorite: boolean) {
  const d = getDrive()
  const fo = new Set(items.flatMap(i => i.type === 'folder' ? [i.folder.id] : [])), fi = new Set(items.flatMap(i => i.type === 'file' ? [i.file.id] : []))
  commit({ ...d, folders: d.folders.map(f => fo.has(f.id) ? { ...f, favorite } : f), files: d.files.map(f => fi.has(f.id) ? { ...f, favorite } : f) })
}

export function markOpened(item: Item) {
  const d = getDrive(), at = now()
  if (item.type === 'folder') commit({ ...d, folders: d.folders.map(f => f.id === item.folder.id ? { ...f, openedAt: at } : f) })
  else commit({ ...d, files: d.files.map(f => f.id === item.file.id ? { ...f, openedAt: at } : f) })
}

export const isFavorite = (i: Item) => i.type === 'folder' ? !!i.folder.favorite : !!i.file.favorite

// ---------- uploads ----------

const tones = ['sand', 'blue', 'rose', 'green', 'violet', 'amber']

/** Reads duration and size of a video, audio or image in the browser. */
function readMeta(file: File, kind: FileKind): Promise<{ duration?: number; width: number; height: number }> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const done = (m: { duration?: number; width: number; height: number }) => { URL.revokeObjectURL(url); resolve(m) }
    if (kind === 'image') {
      const img = new Image()
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => done({ width: 0, height: 0 })
      img.src = url
    } else if (kind === 'video' || kind === 'audio') {
      const el = document.createElement(kind)
      el.preload = 'metadata'
      el.onloadedmetadata = () => done({ duration: Math.round(el.duration), width: (el as HTMLVideoElement).videoWidth ?? 0, height: (el as HTMLVideoElement).videoHeight ?? 0 })
      el.onerror = () => done({ width: 0, height: 0 })
      el.src = url
    } else done({ width: 0, height: 0 })
  })
}

/**
 * Adds files from the computer. With folder uploads (webkitRelativePath), recreates the subfolders.
 * The bytes go to IndexedDB so previews survive a reload.
 */
export async function uploadFiles(list: File[], spaceId: string, folderId: string | null): Promise<string[]> {
  const ids: string[] = []
  const folderFor = new Map<string, string | null>([['', folderId]])
  const ensureFolder = (path: string): string | null => {
    if (folderFor.has(path)) return folderFor.get(path)!
    const cut = path.lastIndexOf('/')
    const parent = ensureFolder(cut < 0 ? '' : path.slice(0, cut))
    const name = cut < 0 ? path : path.slice(cut + 1)
    const existing = childFolders(getDrive(), spaceId, parent).find(f => f.name === name)
    const id = existing?.id ?? createFolder(spaceId, parent, name)
    folderFor.set(path, id)
    return id
  }
  for (const file of list) {
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? ''
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
    const target = ensureFolder(dir)
    const kind = kindOf(file.type, file.name)
    const meta = await readMeta(file, kind)
    const id = uid('f')
    await putBlob(id, file)
    const d = getDrive()
    const entry: DFile = { id, spaceId, folderId: target, name: file.name, kind, size: file.size, duration: meta.duration, width: meta.width, height: meta.height, createdAt: today(), updatedAt: now(), tone: tones[d.files.length % tones.length], uploaded: true, mime: file.type }
    commit({ ...d, folders: touchFolders(d, [target]), files: [...d.files, entry] })
    ids.push(id)
  }
  return ids
}
