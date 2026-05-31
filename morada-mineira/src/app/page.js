"use client";

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import { useAuth }             from "@/contexts/AuthContext";
import { COMPANY }             from "@/config/company.config";

export default function LoginPage() {
  const { login, loginWithGoogle, resetPassword, isAuthenticated, loading, error, setError } = useAuth();
  const router = useRouter();

  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode,       setMode]       = useState("login");   // "login" | "reset"
  const [resetSent,  setResetSent]  = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/painel");
  }, [isAuthenticated, router]);

  // limpa erro ao digitar
  useEffect(() => { 
    if (setError) setError(null); 
  }, [email, password, setError]);

  // ── LOGIN ──────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) router.replace("/painel");
  }

  // ── RESET DE SENHA ─────────────────────────────────────────
  async function handleReset(e) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    const result = await resetPassword(email);
    setSubmitting(false);
    if (result.success) setResetSent(true);
    else if (setError) setError(result.error);
  }

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return null;

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo / Marca */}
        <div className="login-logo-wrap">
          <div className="login-logo">
            <span>MM</span>
          </div>
          <h1 className="login-title">{COMPANY.name}</h1>
          <p className="login-subtitle">{COMPANY.description}</p>
        </div>

        {/* ── MODO: RECUPERAR SENHA ── */}
        {mode === "reset" ? (
          <div className="animate-fade">
            {resetSent ? (
              <div className="login-success-box">
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📧</div>
                <p>Link de redefinição enviado para <strong>{email}</strong>.</p>
                <p style={{ fontSize: "0.8rem", marginTop: 8 }}>
                  Verifique sua caixa de entrada (e o spam).
                </p>
                <button
                  className="btn btn-secondary w-full"
                  style={{ marginTop: 16 }}
                  onClick={() => { setMode("login"); setResetSent(false); }}
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="login-form">
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                  Informe seu e-mail para receber o link de redefinição de senha.
                </p>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                {error && <div className="login-error">{error}</div>}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={submitting || !email}
                >
                  {submitting ? "Enviando..." : "Enviar link de redefinição"}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  style={{ marginTop: 8 }}
                  onClick={() => { setMode("login"); if (setError) setError(null); }}
                >
                  ← Voltar
                </button>
              </form>
            )}
          </div>

        ) : (
          /* ── MODO: LOGIN ── */
          <form onSubmit={handleLogin} className="login-form animate-fade">

            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Senha
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    background: "none", border: "none",
                    fontSize: "0.75rem", color: "var(--color-primary)",
                    cursor: "pointer", marginLeft: "auto",
                  }}
                >
                  {showPass ? "Ocultar" : "Mostrar"}
                </button>
              </label>
              <input
                id="password"
                className="input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={6}
              />
            </div>

            {error && (
              <div className="login-error animate-fade">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={submitting || !email || !password}
            >
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner-sm" /> Entrando...
                </span>
              ) : "Entrar"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-color)" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>ou</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-color)" }} />
            </div>

            <button
              type="button"
              className="btn w-full"
              style={{
                backgroundColor: "#fff",
                color: "#333",
                border: "1px solid #ddd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 12
              }}
              onClick={loginWithGoogle}
              disabled={submitting}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
              Entrar com Google
            </button>

            <button
              type="button"
              className="btn btn-ghost w-full"
              style={{ marginTop: 4, fontSize: "0.85rem" }}
              onClick={() => { setMode("reset"); if (setError) setError(null); }}
            >
              Esqueci minha senha
            </button>
            
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)", textAlign: "center", fontSize: "0.85rem" }}>
              Ainda não tem conta?{" "}
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "4px 8px", fontWeight: "600", color: "var(--color-primary)" }}
                onClick={() => router.push("/cadastro")}
              >
                Cadastre-se
              </button>
            </div>

          </form>
        )}

        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 24, textAlign: "center" }}>
          © {new Date().getFullYear()} {COMPANY.name} · Sistema interno
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100dvh", flexDirection: "column", gap: 12,
      background: "var(--bg-primary)",
    }}>
      <div style={{ fontSize: "2.5rem" }}>🏡</div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Carregando...</p>
    </div>
  );
}
