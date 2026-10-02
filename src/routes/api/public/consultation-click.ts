import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

// Records a consultation CTA click and links it to the anonymous lead.
// The browser cannot read `leads`, so lead_id is resolved here from session_id.
// The response never says whether a lead matched: that would be a session oracle.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Rate limit (2026-10-02, pre-publish): this endpoint writes with the service role and is public, so a script could
// flood consultation_clicks. Two layers, neither stores anything about the visitor:
// 1. per client IP, in this server instance's memory only (the IP is never written or logged): 20 requests a minute;
// 2. the same lead and clinic within 60 seconds is recorded once (a double tap is one click).
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const hits = new Map<string, { start: number; count: number }>()

function rateLimited(request: Request): boolean {
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!ip) return false
  const now = Date.now()
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k)
  const entry = hits.get(ip)
  if (!entry || now - entry.start > WINDOW_MS) { hits.set(ip, { start: now, count: 1 }); return false }
  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/public/consultation-click')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (rateLimited(request)) return json({ error: 'Too many requests' }, 429)
        let body: { clinic_id?: unknown; session_id?: unknown }
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON' }, 400)
        }

        const clinicId = body?.clinic_id
        if (typeof clinicId !== 'string' || !UUID.test(clinicId)) {
          return json({ error: 'Invalid clinic_id' }, 400)
        }

        // Tables added after the last types generation.
        const db = supabaseAdmin as any

        let userId: string | null = null
        const auth = request.headers.get('authorization')
        if (auth?.startsWith('Bearer ')) {
          const { data } = await supabaseAdmin.auth.getUser(auth.slice(7))
          userId = data?.user?.id ?? null
        }

        let leadId: string | null = null
        const sessionId = body?.session_id
        if (typeof sessionId === 'string' && UUID.test(sessionId)) {
          const { data } = await db.from('leads').select('id').eq('session_id', sessionId).maybeSingle()
          leadId = data?.id ?? null
          if (!leadId) {
            // Server log only; the response never reveals whether a session matched.
            console.error('[consultation-click] no lead for the given session_id; click stored without lead_id', { clinic_id: clinicId })
          }
        }

        if (leadId) {
          const since = new Date(Date.now() - WINDOW_MS).toISOString()
          const { count } = await db
            .from('consultation_clicks')
            .select('id', { count: 'exact', head: true })
            .eq('lead_id', leadId)
            .eq('clinic_id', clinicId)
            .gte('clicked_at', since)
          if ((count ?? 0) > 0) return json({ ok: true })
        }

        const { error } = await db
          .from('consultation_clicks')
          .insert({ clinic_id: clinicId, user_id: userId, lead_id: leadId })
        if (error) return json({ error: 'Insert failed' }, 500)

        return json({ ok: true })
      },
    },
  },
})
