"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext"; // <-- IMPORTAÇÃO ADICIONADA

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [loading, setLoading] = useState(true);

  // <-- NOVA CONSTANTE: PEGA O ESTADO DE AUTENTICAÇÃO
  const { isAuthenticated } = useAuth(); 

  // Refs para acesso ao estado mais recente dentro de callbacks
  // Evita dependências de closure stale em useCallback
  const tasksRef = useRef(tasks);
  const evidencesRef = useRef(evidences);
  tasksRef.current = tasks;
  evidencesRef.current = evidences;

  // Carregar dados iniciais (AGORA SÓ RODA SE ESTIVER LOGADO)
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return; // <-- NOVA TRAVA: Não gasta internet se não estiver logado

    setLoading(true);
    try {
      const [taskList, evidenceList] = await Promise.all([
        storage.getTasks(),
        storage.getEvidences(),
      ]);
      setTasks(taskList || []);
      setEvidences(evidenceList || []);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // <-- DEPENDÊNCIA ATUALIZADA

  // <-- NOVO USEEFFECT: ESCUTA A ENTRADA E SAÍDA DE USUÁRIOS
  useEffect(() => {
    if (isAuthenticated) {
      loadData(); // Usuário entrou? Puxa os dados na hora!
    } else {
      // Usuário saiu? Limpa a tela para o próximo não ver rastro.
      setTasks([]);
      setEvidences([]);
      setLoading(false);
    }
  }, [isAuthenticated, loadData]);

  // ── CRUD de Tarefas ──

  const createTask = useCallback(async (taskData) => {
    const newTask = await storage.createTask({
      ...taskData,
      status: "pendente",
      evidence_count: 0,
    });
    if (newTask) {
      setTasks((prev) => [newTask, ...prev]);
    }
    return newTask;
  }, []);

  const updateTask = useCallback(async (id, updates) => {
    const updated = await storage.updateTask(id, updates);
    if (updated) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    }
    return updated;
  }, []);

  const deleteTask = useCallback(async (id) => {
    const success = await storage.deleteTask(id);
    if (success) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
    return success;
  }, []);

  // ── CRUD de Evidências ──

  const addEvidence = useCallback(async (evidenceData) => {
    const newEvidence = await storage.createEvidence(evidenceData);
    if (newEvidence) {
      setEvidences((prev) => [newEvidence, ...prev]);
      // Atualizar contagem de evidências na tarefa usando ref para estado atual
      const task = tasksRef.current.find((t) => t.id === evidenceData.task_id);
      if (task) {
        const newCount = (task.evidence_count || 0) + 1;
        await storage.updateTask(task.id, {
          evidence_count: newCount,
          status: "aguardando_evidencia",
        });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, evidence_count: newCount, status: "aguardando_evidencia" }
              : t
          )
        );
      }
    }
    return newEvidence;
  }, []);

  const approveEvidence = useCallback(async (evidenceId, taskId) => {
    const updated = await storage.updateEvidence(evidenceId, { status: "aprovada" });
    if (updated) {
      setEvidences((prev) => prev.map((e) => (e.id === evidenceId ? { ...e, status: "aprovada" } : e)));
      // Verificar se todas as evidências da tarefa foram aprovadas usando ref
      const taskEvidences = evidencesRef.current.filter((e) => e.task_id === taskId);
      const allApproved = taskEvidences.every((e) => e.id === evidenceId || e.status === "aprovada");
      if (allApproved) {
        await updateTask(taskId, { status: "concluida" });
      }
    }
    return updated;
  }, [updateTask]);

  const rejectEvidence = useCallback(async (evidenceId, taskId, reason) => {
    const updated = await storage.updateEvidence(evidenceId, { status: "rejeitada", rejection_reason: reason });
    if (updated) {
      setEvidences((prev) => prev.map((e) => (e.id === evidenceId ? { ...e, status: "rejeitada", rejection_reason: reason } : e)));
      await updateTask(taskId, { status: "rejeitada" });
    }
    return updated;
  }, [updateTask]);

  const deleteEvidence = useCallback(async (evidenceId, taskId) => {
    const success = await storage.deleteEvidence(evidenceId);
    if (success) {
      setEvidences((prev) => {
        const nextEvidences = prev.filter((e) => e.id !== evidenceId);

        // Update task evidence count and status dynamically
        const task = tasksRef.current.find((t) => t.id === taskId);
        if (task) {
          const taskEvidences = nextEvidences.filter((e) => e.task_id === taskId);
          const count = taskEvidences.length;

          let newStatus = task.status;
          if (count === 0) {
            newStatus = "em_andamento";
          }

          storage.updateTask(task.id, { evidence_count: count, status: newStatus }).then(() => {
            setTasks((prevTasks) =>
              prevTasks.map((t) => (t.id === task.id ? { ...t, evidence_count: count, status: newStatus } : t))
            );
          });
        }

        return nextEvidences;
      });
    }
    return success;
  }, []);

  // Upload de imagem para evidência
  const uploadEvidenceImage = useCallback(async (file, taskId) => {
    return await storage.uploadImage(file, taskId);
  }, []);

  // ── Helpers / Computed ──

  const getTaskById = useCallback((id) => {
    return tasks.find((t) => t.id === id);
  }, [tasks]);

  const getEvidencesByTask = useCallback((taskId) => {
    return evidences.filter((e) => e.task_id === taskId);
  }, [evidences]);

  const stats = {
    total: tasks.length,
    pendentes: tasks.filter((t) => t.status === "pendente").length,
    emAndamento: tasks.filter((t) => t.status === "em_andamento").length,
    aguardando: tasks.filter((t) => t.status === "aguardando_evidencia").length,
    concluidas: tasks.filter((t) => t.status === "concluida").length,
    rejeitadas: tasks.filter((t) => t.status === "rejeitada").length,
    taxaConclusao: tasks.length > 0
      ? Math.round((tasks.filter((t) => t.status === "concluida").length / tasks.length) * 100)
      : 0,
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        evidences,
        loading,
        stats,
        createTask,
        updateTask,
        deleteTask,
        addEvidence,
        approveEvidence,
        rejectEvidence,
        deleteEvidence,
        uploadEvidenceImage,
        getTaskById,
        getEvidencesByTask,
        loadData,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks deve ser usado dentro de TaskProvider");
  return ctx;
}