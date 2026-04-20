import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hashPassword(password: string, salt?: Uint8Array): { salt: Uint8Array; hashHex: string } {
  const saltBytes = salt ?? crypto.getRandomValues(new Uint8Array(16));
  // Sync-like PBKDF2 using async
  return { salt: saltBytes, hashHex: "" }; // placeholder - real impl below
}

async function pbkdf2Hash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2Verify(password: string, saltHex: string, storedHash: string): Promise<boolean> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const hash = await pbkdf2Hash(password, salt);
  return hash === storedHash;
}

function saltToHex(salt: Uint8Array): string {
  return Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    if (action === "signup") {
      const { username, password, inviteCode } = body;
      if (!username || !password || !inviteCode) {
        return json({ error: "缺少参数" }, 400);
      }
      if (username.length < 2) return json({ error: "用户名至少2个字符" }, 400);
      if (password.length < 6) return json({ error: "密码至少6个字符" }, 400);

      // Verify invite code hasn't been used
      const { data: codeData } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("code", inviteCode.toUpperCase())
        .single();

      if (!codeData || codeData.used_by) {
        return json({ error: "邀请码无效或已被使用" }, 400);
      }

      // Check user doesn't already exist
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();

      if (existing) {
        return json({ error: "用户名已存在" }, 400);
      }

      // Hash password
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hashHex = await pbkdf2Hash(password, salt);
      const passwordHash = `${saltToHex(salt)}:${hashHex}`;

      // Create user with 1-year membership
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          username,
          password_hash: passwordHash,
          member_expires_at: expiresAt.toISOString(),
          invite_code: inviteCode.toUpperCase(),
        })
        .select()
        .single();

      if (error || !newUser) {
        return json({ error: "注册失败，请重试" }, 500);
      }

      // Mark invite code as used
      await supabase
        .from("invite_codes")
        .update({ used_by: newUser.id, used_at: new Date().toISOString() })
        .eq("code", inviteCode.toUpperCase());

      // Create default daily plan
      await supabase.from("daily_plan").insert({
        user_id: newUser.id,
        daily_count: 50,
      });

      return json({ success: true, userId: newUser.id, username });
    }

    if (action === "login") {
      const { username, password } = body;
      if (!username || !password) return json({ error: "缺少参数" }, 400);

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (!user || !user.password_hash) {
        return json({ error: "用户名或密码错误" }, 401);
      }

      const [saltHex, storedHash] = user.password_hash.split(":");
      const valid = await pbkdf2Verify(password, saltHex, storedHash);
      if (!valid) {
        return json({ error: "用户名或密码错误" }, 401);
      }

      const isMember = user.member_expires_at
        ? new Date(user.member_expires_at) > new Date()
        : false;

      const memberExpiresAt = user.member_expires_at ?? null;

      return json({ success: true, userId: user.id, username: user.username, isMember, memberExpiresAt });
    }

    if (action === "change_password") {
      const { userId, oldPassword, newPassword } = body;
      if (!userId || !oldPassword || !newPassword) return json({ error: "缺少参数" }, 400);
      if (newPassword.length < 6) return json({ error: "新密码至少6个字符" }, 400);

      const { data: user } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", userId)
        .single();

      if (!user || !user.password_hash) {
        return json({ error: "用户不存在" }, 404);
      }

      const [saltHex, storedHash] = user.password_hash.split(":");
      const valid = await pbkdf2Verify(oldPassword, saltHex, storedHash);
      if (!valid) {
        return json({ error: "原密码错误" }, 401);
      }

      const newSalt = crypto.getRandomValues(new Uint8Array(16));
      const newHashHex = await pbkdf2Hash(newPassword, newSalt);
      const newPasswordHash = `${saltToHex(newSalt)}:${newHashHex}`;

      await supabase.from("users").update({ password_hash: newPasswordHash }).eq("id", userId);
      return json({ success: true });
    }

    if (action === "check_invite") {
      const { code } = body;
      if (!code) return json({ error: "缺少参数" }, 400);
      const { data: codeData } = await supabase
        .from("invite_codes")
        .select("used_by")
        .eq("code", code.toUpperCase())
        .single();
      if (!codeData) return json({ valid: false, error: "邀请码不存在" });
      if (codeData.used_by) return json({ valid: false, error: "邀请码已被使用" });
      return json({ valid: true });
    }

    return json({ error: "未知操作" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
