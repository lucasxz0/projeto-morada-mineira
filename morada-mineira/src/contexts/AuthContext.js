"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // profile do banco
  const [session, setSession] = useState(null);   // sessão do Supabase Auth
  const [users, setUsers]     = useState([]);     // lista de profiles (gerente usa)
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Carrega profile completo do banco ─────────────────────
  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) { setUser(null); return; }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (e) {
      console.error("Erro ao carregar profile:", e);
      setUser(null);
    }
  }, []);

  // ── Carrega lista de usuários (para o gerente atribuir tarefas) ──
  const loadUsers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, role, avatar_emoji, shift, active")
        .eq("active", true)
        .order("name");
      setUsers(data || []);
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    }
  }, []);

  // ── Inicialização: escuta mudanças de sessão ───────────────
  useEffect(() => {
    // Pega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    // Escuta eventos de login/logout/token-refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        await loadProfile(session?.user ?? null);
        if (session?.user) await loadUsers();
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile, loadUsers]);

  useEffect(() => {
    if (user) loadUsers();
  }, [user, loadUsers]);

  // ── CADASTRO PÚBLICO (Sign Up) ──────────────────────────
  const signUp = useCallback(async (name, email, password) => {
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name,
            role: "funcionario", // Default public signups to 'funcionario'
            avatar_emoji: "👷"
          }
        }
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (e) {
      const msg = mapAuthError(e.message);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── LOGIN COM GOOGLE (OAuth) ─────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/painel`,
        }
      });
      if (error) throw error;
      // O redirecionamento acontece automaticamente
    } catch (e) {
      const msg = mapAuthError(e.message);
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  }, []);

  // ── LOGIN com email e senha ────────────────────────────────
  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (e) {
      const msg = mapAuthError(e.message);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── LOGOUT ────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUsers([]);
  }, []);

  // ── CADASTRAR FUNCIONÁRIO (apenas gerente usa) ─────────────
  // Usa Supabase Admin via API Route para não logar o novo user
  const registerEmployee = useCallback(async ({ name, email, password, role, shift, avatar_emoji }) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, shift, avatar_emoji }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao cadastrar");
      await loadUsers(); // atualiza lista
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    }
  }, [loadUsers]);

  // ── ALTERAR SENHA (usuário atual) ─────────────────────────
  const changePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // ── RESETAR SENHA POR EMAIL ────────────────────────────────
  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // ── ATUALIZAR PERFIL ───────────────────────────────────────
  const updateProfile = useCallback(async (updates) => {
    if (!user) return { success: false };
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setUser(data);
    return { success: true };
  }, [user]);

  // ── ATUALIZAR QUALQUER USUÁRIO (gerente) ──────────────────
  const updateUser = useCallback(async (userId, updates) => {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);
    if (error) return { success: false, error: error.message };
    await loadUsers(); // atualiza lista global
    return { success: true };
  }, [loadUsers]);

  // ── DESATIVAR FUNCIONÁRIO (gerente) ───────────────────────
  const deactivateUser = useCallback(async (userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({ active: false })
      .eq("id", userId);
    if (error) return { success: false, error: error.message };
    await loadUsers();
    return { success: true };
  }, [loadUsers]);

  // ── Helpers de role ───────────────────────────────────────
  const isGerente    = user?.role === "gerente";
  const isFuncionario = user?.role === "funcionario";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        users,
        loading,
        error,
        setError,
        login,
        loginWithGoogle,
        signUp,
        logout,
        registerEmployee,
        changePassword,
        resetPassword,
        updateProfile,
        updateUser,
        deactivateUser,
        isGerente,
        isFuncionario,
        isAuthenticated: !!session && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

// ── Traduz erros do Supabase Auth para pt-BR ─────────────────
function mapAuthError(msg) {
  if (!msg) return "Erro desconhecido. Tente novamente.";
  if (msg.includes("Invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed"))
    return "Confirme seu e-mail antes de entrar.";
  if (msg.includes("User already registered"))
    return "Este e-mail já está cadastrado.";
  if (msg.includes("Password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("Unable to validate email"))
    return "E-mail inválido.";
  if (msg.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  return msg;
}
