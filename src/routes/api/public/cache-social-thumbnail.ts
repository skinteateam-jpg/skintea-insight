import { createFileRoute } from '@tanstack/react-router'
import { createHash, timingSafeEqual } from 'crypto'

const BUCKET = 'social-thumbnails'
const MAX_ITEMS = 50
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_HOST_SUFFIXES = ['cdninstagram.com', 'fbcdn.net']

type Item = { id?: unknown; thumbnailUrl?: unknown }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function keyMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

function isAllowedImageUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  )
}

export const Route = createFileRoute('/api/public/cache-social-thumbnail')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const pipelineKey = process.env['SKINTEA_PIPELINE_KEY']
        const providedKey = request.headers.get('x-skintea-pipeline-key')
        if (!pipelineKey || !providedKey || !keyMatches(providedKey, pipelineKey)) {
          return json({ error: 'Unauthorized' }, 401)
        }

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
            if (!isAllowedImageUrl(thumbnailUrl)) {
              errors.push({ id, reason: 'URL not on allowlist' })
              continue
            }

            const res = await fetch(thumbnailUrl)
            if (!res.ok) {
              errors.push({ id, reason: `Fetch failed with status ${res.status}` })
              continue
            }

            const contentType = res.headers.get('content-type') ?? ''
            if (!contentType.toLowerCase().startsWith('image/')) {
              errors.push({ id, reason: 'Response was not an image' })
              continue
            }

            const bytes = new Uint8Array(await res.arrayBuffer())
            if (bytes.byteLength === 0) {
              errors.push({ id, reason: 'Fetched image was empty' })
              continue
            }
            if (bytes.byteLength > MAX_BYTES) {
              errors.push({ id, reason: 'Image too large' })
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

            const { data: updated, error: updateError } = await supabaseAdmin
              .from('social_review_tags')
              .update({ thumbnail_path: path })
              .eq('id', id)
              .eq('platform', 'instagram')
              .select('id')

            if (updateError) {
              errors.push({ id, reason: `Row update failed: ${updateError.message}` })
              continue
            }
            if (!updated || updated.length === 0) {
              errors.push({ id, reason: 'No matching instagram row' })
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
