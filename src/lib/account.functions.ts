import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getHomeAccountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    // profiles.name is not client-readable (Names rule, 2026-09-17): the user's own name comes from their auth record.
    const meta = ((claims as any)?.user_metadata ?? {}) as Record<string, unknown>;
    const ownName = (meta.name ?? meta.full_name ?? null) as string | null;
    const [profileResult, quizResult, savedResult] = await Promise.all([
      supabase.from("profiles").select("skin_type").eq("user_id", userId).maybeSingle(),
      supabase.from("quiz_responses").select("derived_skin_type,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("saved_products").select("created_at,products(id,name,brand,image_url)").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (quizResult.error) throw quizResult.error;
    if (savedResult.error) throw savedResult.error;
    return {
      userId,
      profile: profileResult.data ? { ...profileResult.data, name: ownName } : (ownName ? { name: ownName, skin_type: null } : null),
      quiz: quizResult.data,
      savedProducts: (savedResult.data ?? []).flatMap((row: any) => row.products ? [{ ...row.products, savedAt: row.created_at }] : []),
    };
  });

export const claimQuizResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { shareSlug: string; sessionId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: claimed, error } = await (context.supabase as any).rpc("claim_quiz_response", { p_share_slug: data.shareSlug, p_session_id: data.sessionId });
    if (error) throw error;
    return { claimed: Boolean(claimed) };
  });
