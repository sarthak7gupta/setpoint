import type { MatchRecord } from '../records'
export function validDateRange(from: string, to: string): boolean {
  const valid = (s: string) =>
    !s ||
    (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
      Number.isFinite(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s)
  return valid(from) && valid(to) && (!from || !to || from <= to)
}
export function filterMatchHistory(
  matches: MatchRecord[],
  filters: { search: string; from: string; to: string; status: string },
): MatchRecord[] {
  if (!validDateRange(filters.from, filters.to)) return []
  const search = filters.search.trim().toLocaleLowerCase()
  return matches.filter(
    (m) =>
      (!search ||
        Object.values(m.playerNames).some((name) => name.toLocaleLowerCase().includes(search))) &&
      (!filters.from || m.metadata.date >= filters.from) &&
      (!filters.to || m.metadata.date <= filters.to) &&
      (filters.status === 'all' || m.state.isComplete === (filters.status === 'final')),
  )
}
