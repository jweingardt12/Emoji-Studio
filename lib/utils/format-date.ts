/**
 * Lightweight date formatter to replace date-fns.
 * Handles unix timestamps (seconds) and Date objects.
 */
export function formatDate(date: Date | number, formatStr: string): string {
  const d = typeof date === 'number' ? new Date(date * 1000) : date
  if (formatStr === 'MM/dd/yyyy') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  if (formatStr === 'MMM d, yyyy') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (formatStr === 'h:mm a') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toISOString()
}
