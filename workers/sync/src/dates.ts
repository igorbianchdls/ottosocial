// Days in Brasília: snapshots are labeled with the day the sync ran there, daily numbers with the day before.

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })

/** "2026-11-06" for a moment, in Brasília. */
export const dayOf = (d: Date) => fmt.format(d)
export const today = () => dayOf(new Date())
export const yesterday = () => dayOf(new Date(Date.now() - 86_400_000))
export const daysAgo = (n: number) => dayOf(new Date(Date.now() - n * 86_400_000))
/** Unix seconds at 00:00 of that Brasília day. */
export const startOfDay = (day: string) => Math.floor(new Date(`${day}T00:00:00-03:00`).getTime() / 1000)
