// Frontend visitor tracker.
// Sends a "view" event on load and "depth" events as the visitor scrolls,
// to /api/track (Vercel function) which writes them to the server log.

const ENDPOINT = '/api/track'

function send(payload: Record<string, unknown>) {
  const json = JSON.stringify({ ...payload, t: Date.now() })
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(ENDPOINT, new Blob([json], { type: 'application/json' }))) return
    }
  } catch { /* fall through to fetch */ }
  try {
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }).catch(() => {})
  } catch { /* offline / unsupported: drop silently */ }
}

const THRESHOLDS = [25, 50, 75, 90, 100]

let started = false

export function initTracker() {
  if (started) return // StrictMode dev double-mount guard
  started = true

  const page = location.pathname + location.search
  const ref = document.referrer || ''
  let maxDepth = 0
  const fired = new Set<number>()

  const fireDepth = (th: number) => {
    if (!fired.has(th)) {
      fired.add(th)
      send({ type: 'depth', depth: th, page, ref })
    }
  }
  const measure = () => {
    const h = document.documentElement
    const max = h.scrollHeight - h.clientHeight
    const pct = max > 0 ? Math.round(((h.scrollTop + h.clientHeight) / h.scrollHeight) * 100) : 100
    if (pct > maxDepth) {
      maxDepth = pct
      THRESHOLDS.forEach((t) => { if (t <= maxDepth) fireDepth(t) })
    }
  }
  let sentExit = false
  const onExit = () => {
    if (sentExit) return
    sentExit = true
    send({ type: 'depth', depth: maxDepth, page, ref })
  }
  const onVis = () => {
    if (document.visibilityState === 'hidden') onExit()
    else sentExit = false // user came back; allow a fresh final-depth on next exit
  }

  send({ type: 'view', page, ref })
  addEventListener('scroll', measure, { passive: true })
  addEventListener('resize', measure)
  addEventListener('pagehide', onExit)
  document.addEventListener('visibilitychange', onVis)
  measure()
}
