import { createClient }     from "@supabase/supabase-js";
import { NextResponse }     from "next/server";

// Supabase Admin client — usa a Service Role Key (não exposta ao browser)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,   // ← variável PRIVADA (sem NEXT_PUBLIC_)
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request) {
  try {
    // ── 1. Verifica autenticação do solicitante ──────────────
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Valida o token do gerente
    const { data: { user: requester }, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !requester) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Verifica se é gerente
    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, name")
      .eq("id", requester.id)
      .single();

    if (requesterProfile?.role !== "gerente") {
      return NextResponse.json(
        { error: "Apenas gerentes podem cadastrar funcionários" },
        { status: 403 }
      );
    }

    // ── 2. Valida body da requisição ──────────────────────────
    const { name, email, password, role, shift, avatar_emoji } =
      await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    const validRoles = ["gerente", "funcionario"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: "Role inválida" }, { status: 400 });
    }

    // ── 3. Cria o usuário no Supabase Auth ────────────────────
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email:          email.trim().toLowerCase(),
        password,
        email_confirm:  true,           // confirma e-mail automaticamente
        user_metadata: {
          name,
          role:         role || "funcionario",
          avatar_emoji: avatar_emoji || "👷",
        },
      });

    if (createError) {
      if (createError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Este e-mail já está cadastrado" },
          { status: 409 }
        );
      }
      throw createError;
    }

    // ── 4. Atualiza o profile com dados extras ────────────────
    await supabaseAdmin
      .from("profiles")
      .update({
        name,
        role:         role || "funcionario",
        shift:        shift || "integral",
        avatar_emoji: avatar_emoji || "👷",
      })
      .eq("id", newUser.user.id);

    // ── 5. Log de auditoria ───────────────────────────────────
    await supabaseAdmin.from("activity_logs").insert({
      actor_id:    requester.id,
      actor_name:  requesterProfile.name || "Gerente",
      action:      "user.created",
      entity_type: "profile",
      entity_id:   newUser.user.id,
      metadata:    { name, email, role: role || "funcionario" },
    });

    return NextResponse.json(
      { success: true, userId: newUser.user.id },
      { status: 201 }
    );

  } catch (error) {
    console.error("[register] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}
