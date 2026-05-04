"use client";

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import { useAuth }             from "@/contexts/AuthContext";
import { COMPANY }             from "@/config/company.config";

export default function CadastroPage() {
  const { signUp, loginWithGoogle, isAuthenticated, loading, error, setError } = useAuth();
  const router = useRouter();

  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.push("/painel");
  }, [isAuthenticated, router]);

  // Limpa erro ao digitar
  useEffect(() => { 
    if (setError) setError(null); 
  }, [name, email, password, setError]);

  async function handleSignUp(e) {
    e.preventDefault();
    if (!name || !email || !password) return;
    
    if (password.length < 6) {
      if (setError) setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    const result = await signUp(name, email, password);
    setSubmitting(false);
    
    if (result.success) {
      setSuccess(true);
      // Alguns provedores exigem confirmação de email. Se auto logar:
      // setTimeout(() => router.push("/painel"), 2000);
    }
  }

  if (loading) return null; // Or a LoadingScreen component
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
          <p className="login-subtitle">Crie sua conta na plataforma</p>
        </div>

        {success ? (
          <div className="animate-fade">
            <div className="login-success-box">
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🎉</div>
              <p>Conta criada com sucesso para <strong>{email}</strong>!</p>
              <p style={{ fontSize: "0.8rem", marginTop: 8 }}>
                Dependendo da configuração do sistema, você pode precisar confirmar seu e-mail ou já pode fazer login.
              </p>
              <button
                className="btn btn-primary w-full"
                style={{ marginTop: 16 }}
                onClick={() => router.push("/")}
              >
                Ir para o Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="login-form animate-fade">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Nome Completo</label>
              <input
                id="name"
                className="input"
                type="text"
                placeholder="Ex: João da Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
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
              disabled={submitting || !name || !email || !password}
            >
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner-sm" /> Criando conta...
                </span>
              ) : "Criar Conta"}
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
              Cadastrar com Google
            </button>

            <div style={{ marginTop: 16, textAlign: "center", fontSize: "0.85rem" }}>
              Já tem uma conta?{" "}
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "4px 8px", fontWeight: "600" }}
                onClick={() => router.push("/")}
              >
                Fazer login
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
