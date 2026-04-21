// Next.js API Route for auth
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ilrreynuygmxarptaymn.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscnJleW51eWdteGFycHRheW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMjE4MDAsImV4cCI6MjA2MjY5NzgwMH0.KkQX4JN4e1WmK4xkOgZo4eWkJxT5W-V9oXRGzpvKmHU";
const ADMIN_SECRET = "ramon123";

async function sf(method: string, path: string, body?: unknown) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function genCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function calcExpiresAt(plan: string, existing?: string | null): Date {
  const now = new Date();
  const base = existing && new Date(existing) > now ? new Date(existing) : now;
  if (plan === "monthly") base.setMonth(base.getMonth() + 1);
  else if (plan === "quarterly") base.setMonth(base.getMonth() + 3);
  else if (plan === "yearly") base.setFullYear(base.getFullYear() + 1);
  return base;
}

export async function POST(request: Request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Content-Type": "application/json",
  };

  try {
    const body = await request.json() as { action: string; [k: string]: unknown };

    if (body.action === "admin_generate") {
      const { secret, count, plan } = body as unknown as { secret: string; count?: number; plan?: string };
      if (secret !== ADMIN_SECRET) return new Response(JSON.stringify({ error: "无权" }), { status: 403, headers: corsHeaders });
      const n = Math.min(Math.max(count || 1, 1), 20);
      const validPlan = ["monthly","quarterly","yearly"].includes(plan ?? "") ? plan! : "yearly";
      const planNames: Record<string, string> = { monthly: "月度", quarterly: "季度", yearly: "年度" };
      const codes: string[] = [];
      for (let i = 0; i < n; i++) {
        const code = genCode(8);
        await sf("POST", "invite_codes", { code, plan: validPlan, plan_name: planNames[validPlan] });
        codes.push(code);
      }
      return new Response(JSON.stringify({ success: true, plan: planNames[validPlan], codes }), { status: 200, headers: corsHeaders });
    }

    if (body.action === "admin_list") {
      const { secret } = body as unknown as { secret: string };
      if (secret !== ADMIN_SECRET) return new Response(JSON.stringify({ error: "无权" }), { status: 403, headers: corsHeaders });
      const codes = await sf("GET", "invite_codes?order=created_at.desc&limit=50");
      return new Response(JSON.stringify({ success: true, codes }), { status: 200, headers: corsHeaders });
    }

    if (body.action === "admin_generate_plan_keys") {
      const { secret, plan, count } = body as unknown as { secret: string; plan: string; count?: number };
      if (secret !== ADMIN_SECRET) return new Response(JSON.stringify({ error: "无权" }), { status: 403, headers: corsHeaders });
      if (!["monthly","quarterly","yearly"].includes(plan)) return new Response(JSON.stringify({ error: "无效的会员类型" }), { status: 400, headers: corsHeaders });
      const n = Math.min(Math.max(count || 1, 1), 20);
      const planNames: Record<string, string> = { monthly: "月卡", quarterly: "季卡", yearly: "年卡" };
      const keys: string[] = [];
      for (let i = 0; i < n; i++) {
        const keyCode = `${plan.toUpperCase().slice(0,3)}-${genCode(12)}`;
        await sf("POST", "plan_keys", { plan, key_code: keyCode });
        keys.push(keyCode);
      }
      return new Response(JSON.stringify({ success: true, plan: planNames[plan], keys }), { status: 200, headers: corsHeaders });
    }

    if (body.action === "admin_list_plan_keys") {
      const { secret } = body as unknown as { secret: string };
      if (secret !== ADMIN_SECRET) return new Response(JSON.stringify({ error: "无权" }), { status: 403, headers: corsHeaders });
      const keys = await sf("GET", "plan_keys?order=created_at.desc&limit=50");
      return new Response(JSON.stringify({ success: true, keys }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "未知操作" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
