"use client";

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import { supabase }            from "@/lib/supabase";
import { COMPANY }             from "@/config/company.config";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // O Supabase injeta o token na URL ao acessar o link do e-mail
    // e o cliente do Supabase automaticamente estabelece uma sessão temporária
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/"), 3000);
    }
  }

  if (!validSession) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚠️</div>
          <h2 className="login-title">Link inválido ou expirado</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: "0.85rem" }}>
            Solicite um novo link de redefinição de senha na página inicial.
          </p>
          <button
            className="btn btn-primary w-full"
            style={{ marginTop: 20 }}
            onClick={() => router.push("/")}
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>✅</div>
          <h2 className="login-title">Senha redefinida!</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: "0.85rem" }}>
            Sua nova senha foi salva. Você será redirecionado ao login em instantes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-logo"><span>MM</span></div>
          <h1 className="login-title">{COMPANY.name}</h1>
          <p className="login-subtitle">Redefinir senha</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Nova senha</label>
            <input
              className="input"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar nova senha</label>
            <input
              className="input"
              type="password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={submitting || !password || !confirm}
          >
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="spinner-sm" /> Salvando...
              </span>
            ) : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
