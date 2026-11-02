// The video project: plain data that the timeline edits, the AI edits and Remotion draws.

export const FPS = 30

export type TrackKind = 'texto' | 'legenda' | 'forma' | 'imagem' | 'video' | 'audio'
export type Format = '9:16' | '1:1' | '16:9'
/** Position and size in % of the canvas, from the top-left corner. */
export type Box = { x: number; y: number; w: number; h: number }
export type TextAnim = 'surgir' | 'pop' | 'digitar' | 'nenhuma'
export type CaptionStyle = 'amarela' | 'branca' | 'caixa'

export type ClipProps = {
  fileId?: string
  text?: string
  fontSize?: number
  color?: string
  bg?: string
  weight?: 400 | 600 | 800
  align?: 'left' | 'center' | 'right'
  anim?: TextAnim
  shape?: 'retangulo' | 'circulo'
  radius?: number
  box?: Box
  opacity?: number
  volume?: number
  captionStyle?: CaptionStyle
}

/** Times are in frames. trimStart is where the clip starts inside its media file. */
export type Clip = { id: string; start: number; duration: number; trimStart: number; props: ClipProps }
export type Track = { id: string; kind: TrackKind; clips: Clip[]; muted?: boolean; hidden?: boolean }
export type Project = { id: string; name: string; format: Format; background: string; tracks: Track[]; updatedAt: string }

export const canvasSize: Record<Format, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
}

export const kindLabel: Record<TrackKind, string> = { texto: 'Texto', legenda: 'Legenda', forma: 'Forma', imagem: 'Imagem', video: 'Vídeo', audio: 'Áudio' }
/** Top-to-bottom order of tracks when a new one is created. */
export const kindRank: Record<TrackKind, number> = { texto: 0, legenda: 1, forma: 2, imagem: 3, video: 4, audio: 5 }
export const visualKinds: TrackKind[] = ['texto', 'legenda', 'forma', 'imagem', 'video']
export const mediaKinds: TrackKind[] = ['video', 'audio']

/** Local date and time as YYYY-MM-DDTHH:mm. */
export const localStamp = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
