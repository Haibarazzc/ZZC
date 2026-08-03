// Vercel serverless function: /api/track
// Collects visitor analytics and writes one JSON log line per event to the function log.
// IP + user-agent come from request headers; page/referrer/depth/vid come from the frontend body.

function parseJSON(s: string): Record<string, unknown> {
  try { return JSON.parse(s) } catch { return {} }
}
function str(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max)
}
function num(v: unknown, lo: number, hi: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : lo
}

export default function handler(req: any, res: any) {
  // Server-derived fields (headers) — Vercel guarantees the real client IP first
  const ip = str(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '', 64).split(',')[0].trim()
  const ua = str(req.headers['user-agent'], 512)
  const referer = str(req.headers['referer'], 2048)

  // Client-sent fields (body: application/json object, or sendBeacon's text/plain JSON string; query params as fallback)
  const url = new URL(req.url || '/', 'http://localhost')
  const query: Record<string, unknown> = {}
  url.searchParams.forEach((v, k) => { query[k] = v })
  const body = typeof req.body === 'string'
    ? parseJSON(req.body)
    : (req.body && typeof req.body === 'object' ? req.body : {})
  const src = { ...query, ...body }

  const event = {
    t: new Date().toISOString(), // server receipt time is authoritative (client clock is forgeable)
    type: str(src.type, 32) || 'view',
    vid: str(src.vid, 64),
    page: str(src.page, 512),
    ref: str(src.ref, 2048),
    depth: num(src.depth, 0, 100),
    ip,
    ua,
    referer,
  }

  console.log('[track] ' + JSON.stringify(event))
  res.statusCode = 204
  res.end()
}
