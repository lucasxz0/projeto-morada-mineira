// =============================================
// ABSTRAÇÃO DE ARMAZENAMENTO
// =============================================
// Funciona com localStorage como fallback
// e Supabase quando configurado.
// Tabela de usuários/perfis é 'profiles'
// =============================================

import { supabase, isSupabaseConfigured } from "./supabase";

// ── LOCAL STORAGE HELPERS ──

function getFromLocal(key) {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setToLocal(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage cheio ou indisponível:", e);
  }
}

// ── SUPABASE STORAGE ──

async function getFromSupabase(table, query = {}) {
  if (!supabase) return null;
  try {
    let q = supabase.from(table).select("*");
    if (query.eq) {
      for (const [col, val] of Object.entries(query.eq)) {
        q = q.eq(col, val);
      }
    }
    if (query.order) {
      q = q.order(query.order.column, { ascending: query.order.ascending ?? false });
    }
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch (e) {
    console.error("Erro Supabase:", e);
    return null;
  }
}

async function insertToSupabase(table, data) {
  if (!supabase) return null;
  try {
    const { data: result, error } = await supabase.from(table).insert(data).select();
    if (error) throw error;
    return result?.[0] || null;
  } catch (e) {
    console.error("Erro ao inserir:", e);
    return null;
  }
}

async function updateInSupabase(table, id, data) {
  if (!supabase) return null;
  try {
    const { data: result, error } = await supabase.from(table).update(data).eq("id", id).select();
    if (error) throw error;
    return result?.[0] || null;
  } catch (e) {
    console.error("Erro ao atualizar:", e);
    return null;
  }
}

async function deleteFromSupabase(table, id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Erro ao deletar:", e);
    return false;
  }
}

// ── Upload de arquivo para Supabase Storage ──

async function uploadFileToSupabase(bucket, path, file) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (e) {
    console.error("Erro ao fazer upload:", e);
    return null;
  }
}

// ── INTERFACE UNIFICADA ──

export const storage = {
  isSupabaseConfigured,

  // Tasks
  async getTasks(filters = {}) {
    if (isSupabaseConfigured) {
      return await getFromSupabase("tasks_with_users", { order: { column: "created_at" } });
    }
    return getFromLocal("morada_tasks") || [];
  },

  async createTask(task) {
    if (isSupabaseConfigured) {
      return await insertToSupabase("tasks", task);
    }
    const tasks = getFromLocal("morada_tasks") || [];
    const newTask = { ...task, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    tasks.unshift(newTask);
    setToLocal("morada_tasks", tasks);
    return newTask;
  },

  async updateTask(id, updates) {
    if (isSupabaseConfigured) {
      return await updateInSupabase("tasks", id, { ...updates, updated_at: new Date().toISOString() });
    }
    const tasks = getFromLocal("morada_tasks") || [];
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    tasks[idx] = { ...tasks[idx], ...updates, updated_at: new Date().toISOString() };
    setToLocal("morada_tasks", tasks);
    return tasks[idx];
  },

  async deleteTask(id) {
    if (isSupabaseConfigured) {
      return await deleteFromSupabase("tasks", id);
    }
    const tasks = getFromLocal("morada_tasks") || [];
    setToLocal("morada_tasks", tasks.filter((t) => t.id !== id));
    return true;
  },

  // Evidence
  async getEvidences(taskId = null) {
    if (isSupabaseConfigured) {
      const query = taskId ? { eq: { task_id: taskId } } : {};
      query.order = { column: "created_at" };
      return await getFromSupabase("evidences", query);
    }
    const all = getFromLocal("morada_evidences") || [];
    return taskId ? all.filter((e) => e.task_id === taskId) : all;
  },

  async createEvidence(evidence) {
    if (isSupabaseConfigured) {
      return await insertToSupabase("evidences", evidence);
    }
    const evidences = getFromLocal("morada_evidences") || [];
    const newEvidence = { ...evidence, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    evidences.unshift(newEvidence);
    setToLocal("morada_evidences", evidences);
    return newEvidence;
  },

  async updateEvidence(id, updates) {
    if (isSupabaseConfigured) {
      return await updateInSupabase("evidences", id, updates);
    }
    const evidences = getFromLocal("morada_evidences") || [];
    const idx = evidences.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    evidences[idx] = { ...evidences[idx], ...updates };
    setToLocal("morada_evidences", evidences);
    return evidences[idx];
  },

  async deleteEvidence(id) {
    if (isSupabaseConfigured) {
      return await deleteFromSupabase("evidences", id);
    }
    const evidences = getFromLocal("morada_evidences") || [];
    setToLocal("morada_evidences", evidences.filter((e) => e.id !== id));
    return true;
  },

  // Upload de imagem
  async uploadImage(file, taskId) {
    if (isSupabaseConfigured) {
      const ext = file.name?.split(".").pop() || "jpg";
      const path = `evidences/${taskId}/${Date.now()}.${ext}`;
      return await uploadFileToSupabase("evidencias", path, file);
    }
    // Fallback: converter para base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  },

  // Users (profiles)
  async getUsers() {
    if (isSupabaseConfigured) {
      return await getFromSupabase("profiles");
    }
    const localUsers = getFromLocal("morada_profiles");
    if (localUsers && Array.isArray(localUsers) && localUsers.length > 0) {
      return localUsers;
    }
    return [
      { id: "gerente-1", name: "Gerente", role: "gerente", avatar_emoji: "👔" },
      { id: "func-1", name: "João Silva", role: "funcionario", avatar_emoji: "👷" },
      { id: "func-2", name: "Maria Santos", role: "funcionario", avatar_emoji: "👷" },
    ];
  },

  async updateUser(id, updates) {
    if (isSupabaseConfigured) {
      return await updateInSupabase("profiles", id, updates);
    }
    const localUsers = await this.getUsers();
    const idx = localUsers.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    localUsers[idx] = { ...localUsers[idx], ...updates };
    setToLocal("morada_profiles", localUsers);
    return localUsers[idx];
  },
};
