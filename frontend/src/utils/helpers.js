/**
 * Format bytes to human-readable size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

/**
 * Format seconds to mm:ss or hh:mm:ss
 */
export const formatDuration = (seconds) => {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Format date to readable string
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

/**
 * Get sensitivity badge class based on result
 */
export const getSensitivityClass = (result) => {
  const map = {
    safe: 'badge-safe',
    flagged: 'badge-flagged',
    unknown: 'badge-pending',
  }
  return map[result] || 'badge-pending'
}

/**
 * Get status badge class
 */
export const getStatusClass = (status) => {
  const map = {
    pending: 'badge-pending',
    processing: 'badge-processing',
    completed: 'badge-safe',
    failed: 'badge-failed',
  }
  return map[status] || 'badge-pending'
}

/**
 * Truncate text
 */
export const truncate = (str, max = 60) => {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/**
 * Get initials from name
 */
export const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
