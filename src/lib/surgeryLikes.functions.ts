import { createServerFn } from "@tanstack/react-start";

export const togglePublicSurgeryLike = createServerFn({ method: "POST" })
  .inputValidator((data: { postId: string; visitorId: string }) => data)
  .handler(async ({ data }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.postId) || !/^[0-9a-f-]{36}$/i.test(data.visitorId)) {
      throw new Error("Invalid like request");
    }
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const serviceClient = supabaseAdmin as ReturnType<typeof createClient>;
    const { data: result, error } = await serviceClient.rpc("toggle_surgery_like", {
      p_post_id: data.postId,
      p_visitor_id: data.visitorId,
    });
    if (error) throw error;
    const row = Array.isArray(result) ? result[0] : null;
    return { liked: Boolean(row?.liked), likeCount: Number(row?.like_count ?? 0) };
  });