import { createFileRoute } from '@tanstack/react-router'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKET = 'social-thumbnails'
const MAX_ITEMS = 50

type Item = { id?: unknown; thumbnailUrl?: unknown }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/public/cache-social-thumbnail')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: corsHeaders }),
      POST: async ({ request }) => {
        let payload: { items?: Item[] }
        try {
          payload = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, 400)
        }

        const items = Array.isArray(payload?.items) ? payload.items : null
        if (!items) return json({ error: "Body must contain an 'items' array" }, 400)
        if (items.length > MAX_ITEMS) {
          return json({ error: `At most ${MAX_ITEMS} items per call` }, 400)
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        let succeeded = 0
        const errors: { id: string; reason: string }[] = []

        for (const raw of items) {
          const id = typeof raw?.id === 'string' ? raw.id : ''
          const thumbnailUrl = typeof raw?.thumbnailUrl === 'string' ? raw.thumbnailUrl : ''

          if (!id || !thumbnailUrl) {
            errors.push({ id: id || '(missing id)', reason: 'Missing id or thumbnailUrl' })
            continue
          }

          try {
            const res = await fetch(thumbnailUrl)
            if (!res.ok) {
              errors.push({ id, reason: `Fetch failed with status ${res.status}` })
              continue
            }

            const contentType = res.headers.get('content-type') ?? 'image/jpeg'
            const bytes = new Uint8Array(await res.arrayBuffer())
            if (bytes.byteLength === 0) {
              errors.push({ id, reason: 'Fetched image was empty' })
              continue
            }

            const path = `instagram/${id}.jpg`
            const { error: uploadError } = await supabaseAdmin.storage
              .from(BUCKET)
              .upload(path, bytes, { contentType, upsert: true })

            if (uploadError) {
              errors.push({ id, reason: `Upload failed: ${uploadError.message}` })
              continue
            }

            const { error: updateError } = await supabaseAdmin
              .from('social_review_tags')
              .update({ thumbnail_path: path })
              .eq('id', id)

            if (updateError) {
              errors.push({ id, reason: `Row update failed: ${updateError.message}` })
              continue
            }

            succeeded++
          } catch (e) {
            errors.push({ id, reason: e instanceof Error ? e.message : 'Unknown error' })
          }
        }

        return json({ succeeded, failed: errors.length, errors })
      },
    },
  },
})
