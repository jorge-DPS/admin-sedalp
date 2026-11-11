export function positiveId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

export function fileSize(bytes: number | null): string {
  if (bytes === null) return 'Tamaño no informado'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function municipalDate(value: string | null): string {
  if (!value) return 'Sin fecha'
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(date)
}

export function downloadFilename(header: unknown, fallback: string): string {
  if (typeof header !== 'string') return fallback
  let filename = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1]
  try {
    filename = filename
      ? decodeURIComponent(filename.trim())
      : /filename="([^"]+)"|filename=([^;]+)/i.exec(header)?.slice(1).find(Boolean)?.trim()
  } catch {
    return fallback
  }
  const safe = filename
    ?.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 180)
  return safe && /\.pdf$/i.test(safe) ? safe : fallback
}
