import { createFileRoute } from '@tanstack/react-router'
import { createHash, timingSafeEqual } from 'crypto'

// Caches the platform CDN thumbnails of creator videos on clinic pages (clinic_videos.relationship = 'creator') into the
// social-thumbnails bucket, because Instagram and TikTok CDN links expire within days. A self-service queue, like
// cache-social-thumbnail: send {}, it finds rows whose thumbnail_url is still a CDN link, stores the image at
// clinic-videos/<id>.<ext> and points thumbnail_url at the public object. The original CDN link stays in
// field_provenance.thumbnail.cdn_url (written at insert). Run from the pipeline with the pipeline key only.

const BUCKET = 'social-thumbnails'
const MAX_ITEMS = 50
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_HOST_SUFFIXES = ['cdninstagram.com', 'fbcdn.net', 'tiktokcdn.com', 'tiktokcdn-us.com']
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic' }

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

export const Route = createFileRoute('/api/public/cache-clinic-video-thumbnail')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const pipelineKey = process.env['SKINTEA_PIPELINE_KEY']
        const providedKey = request.headers.get('x-skintea-pipeline-key')
        if (!pipelineKey || !providedKey || !keyMatches(providedKey, pipelineKey)) {
          return json({ error: 'Unauthorized' }, 401)
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const storageMarker = `/storage/v1/object/public/${BUCKET}/`

        const { data: rows, error: queueError } = await supabaseAdmin
          .from('clinic_videos')
          .select('id, platform, thumbnail_url')
          .eq('relationship', 'creator')
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'like', `%${storageMarker}%`)
          .order('created_at', { ascending: true })
          .limit(MAX_ITEMS)

        if (queueError) {
          return json({ error: `Queue query failed: ${queueError.message}` }, 500)
        }

        const queue = Array.isArray(rows) ? rows : []
        let succeeded = 0
        const errors: { id: string; reason: string }[] = []

        for (const raw of queue) {
          const id = typeof raw?.id === 'string' ? raw.id : ''
          const thumbnailUrl = typeof raw?.thumbnail_url === 'string' ? raw.thumbnail_url : ''
          if (!id || !thumbnailUrl) {
            errors.push({ id: id || '(missing id)', reason: 'Missing id or thumbnail_url' })
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
            const contentType = (res.headers.get('content-type') ?? '').toLowerCase().split(';')[0].trim()
            const ext = EXT[contentType]
            if (!ext) {
              errors.push({ id, reason: `Response was not a supported image (${contentType || 'no content-type'})` })
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

            const path = `clinic-videos/${id}.${ext}`
            const { error: uploadError } = await supabaseAdmin.storage
              .from(BUCKET)
              .upload(path, bytes, { contentType, upsert: true })
            if (uploadError) {
              errors.push({ id, reason: `Upload failed: ${uploadError.message}` })
              continue
            }

            const publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
            const { data: updated, error: updateError } = await supabaseAdmin
              .from('clinic_videos')
              .update({ thumbnail_url: publicUrl })
              .eq('id', id)
              .eq('relationship', 'creator')
              .eq('thumbnail_url', thumbnailUrl)
              .select('id')
            if (updateError) {
              errors.push({ id, reason: `Row update failed: ${updateError.message}` })
              continue
            }
            if (!updated || updated.length === 0) {
              errors.push({ id, reason: 'Row changed or no matching creator row' })
              continue
            }
            succeeded++
          } catch (e) {
            errors.push({ id, reason: e instanceof Error ? e.message : 'Unknown error' })
          }
        }

        const { count: remaining, error: countError } = await supabaseAdmin
          .from('clinic_videos')
          .select('*', { count: 'exact', head: true })
          .eq('relationship', 'creator')
          .not('thumbnail_url', 'is', null)
          .not('thumbnail_url', 'like', `%${storageMarker}%`)

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
