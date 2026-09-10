import { createFileRoute } from '@tanstack/react-router'
import { createHash, timingSafeEqual } from 'crypto'

const BUCKET = 'social-thumbnails'
const MAX_ITEMS = 50
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_HOST_SUFFIXES = ['cdninstagram.com', 'fbcdn.net']

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

        let requestedLimit: number | undefined
        try {
          const body = await request.json()
          if (body && typeof body === 'object' && 'limit' in body) {
            requestedLimit = Number((body as { limit?: unknown }).limit)
          }
        } catch {
          // Body is optional; default to MAX_ITEMS on empty/invalid JSON.
        }

        const limit =
          typeof requestedLimit === 'number' && Number.isFinite(requestedLimit)
            ? Math.max(1, Math.min(MAX_ITEMS, Math.floor(requestedLimit)))
            : MAX_ITEMS


        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        const { data: rows, error: queueError } = await supabaseAdmin
          .from('social_review_tags')
          .select('id, source_thumbnail_url')
          .eq('platform', 'instagram')
          .not('source_thumbnail_url', 'is', null)
          .is('thumbnail_path', null)
          .order('created_at', { ascending: true })
          .limit(limit)

        if (queueError) {
          return json({ error: `Queue query failed: ${queueError.message}` }, 500)
        }

        const queue = Array.isArray(rows) ? rows : []
        let succeeded = 0
        const errors: { id: string; reason: string }[] = []

        for (const raw of queue) {
          const id = typeof raw?.id === 'string' ? raw.id : ''
          const thumbnailUrl = typeof raw?.source_thumbnail_url === 'string' ? raw.source_thumbnail_url : ''

          if (!id || !thumbnailUrl) {
            errors.push({ id: id || '(missing id)', reason: 'Missing id or source_thumbnail_url' })
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

        const { count: remaining, error: countError } = await supabaseAdmin
          .from('social_review_tags')
          .select('*', { count: 'exact', head: true })
          .eq('platform', 'instagram')
          .not('source_thumbnail_url', 'is', null)
          .is('thumbnail_path', null)

        return json({
          succeeded,
          failed: errors.length,
          remaining: countError ? null : (remaining ?? null),
          errors,
        })
      },
    },
  },
})
