import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

// Records a consultation CTA click and links it to the anonymous lead.
// The browser cannot read `leads`, so lead_id is resolved here from session_id.
// The response never says whether a lead matched: that would be a session oracle.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
