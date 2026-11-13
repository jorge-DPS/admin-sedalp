export function municipalToday(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join('-')
}
export function authorityDateErrors(
  start: string,
  end: string,
  current: boolean,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  if (start && end && end < start)
    errors.term_end = ['El fin del mandato no puede preceder a su inicio.']
  const today = municipalToday()
  if (current && ((start && start > today) || (end && end < today)))
    errors.is_current = ['El período informado no corresponde a una autoridad actual.']
  return errors
}
