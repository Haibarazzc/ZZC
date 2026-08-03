// Vercel serverless function: /api/track
// Collects visitor analytics and writes one JSON log line per event to the function log.
// IP + user-agent come from request headers; page/referrer/depth/time come from the frontend body.

function parseJSON(s: string): Record<string, unknown> {
  try { return JSON.parse(s) } catch { return {} }
}

export default function handler(req: any, res: any) {
  // 1. Server-derived fields (headers)
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
  const ua = String(req.headers['user-agent'] || '')
  const referer = String(req.headers['referer'] || '')

  // 2. Client-sent fields (body: application/json object, or sendBeacon's text/plain JSON string; query params as fallback)
  const url = new URL(req.url || '/', 'http://localhost')
  const query: Record<string, unknown> = {}
  url.searchParams.forEach((v, k) => { query[k] = v })
  const body = typeof req.body === 'string'
    ? parseJSON(req.body)
    : (req.body && typeof req.body === 'object' ? req.body : {})
  const src = { ...query, ...body }

  const event = {
    t: src.t ? new Date(Number(src.t)).toISOString() : new Date().toISOString(),
    type: String(src.type || 'view'),
    page: String(src.page || ''),
    ref: String(src.ref || ''),
    depth: Number(src.depth) || 0,
    ip,
    ua,
    referer,
  }

  console.log('[track] ' + JSON.stringify(event))
  res.statusCode = 204
  res.end()
}
