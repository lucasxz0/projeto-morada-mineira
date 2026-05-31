"use client";

import { useState } from "react";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_RECURRENCE } from "@/config/tasks.config";
import { MAINTENANCE_TEMPLATES } from "@/config/maintenance.config";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext"; // <-- Importamos o toast para os avisos
import Modal from "@/components/ui/Modal";

export default function TaskForm({ isOpen, onClose, onSubmit, users = [], editTask = null }) {
  const { user } = useAuth();
  const toast = useToast();
  const isEditing = !!editTask;

  const [formData, setFormData] = useState(
    editTask || {
      title: "",
      description: "",
      category: "geral",
      priority: "media",
      recurrence: "unica",
      assigned_to: "",
      assigned_to_name: "",
      requires_evidence: true,
      due_date: "",
    }
  );

  // Novo estado para controlar se tem ou não prazo final
  const [noDeadline, setNoDeadline] = useState(isEditing ? !editTask?.due_date : false);
  const [showTemplates, setShowTemplates] = useState(false);

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleAssigneeChange(userId) {
    const u = users.find((u) => u.id === userId);
    setFormData((prev) => ({
      ...prev,
      assigned_to: userId,
      assigned_to_name: u?.name || "",
    }));
  }

  function handleTemplateSelect(template) {
    setFormData((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      category: template.category,
      priority: template.priority,
      requires_evidence: template.requires_evidence,
    }));
    setShowTemplates(false);
  }

  function handleSubmit(e) {
    e.preventDefault();

    // --- VALIDAÇÃO RIGOROSA ---
    if (!formData.title.trim()) return toast.warning("O título é obrigatório.");
    if (!formData.description.trim()) return toast.warning("A descrição é obrigatória.");
    if (!formData.assigned_to) return toast.warning("Atribua a tarefa a um funcionário.");
    if (!noDeadline && !formData.due_date) return toast.warning("Defina um prazo ou marque 'Sem prazo final'.");

    // Envia os dados
    onSubmit({
      ...formData,
      due_date: noDeadline ? null : formData.due_date, // Se não tiver prazo, envia null
      created_by: user?.id,
      created_by_name: user?.name,
    });
    
    // Limpa o formulário e fecha
    onClose();
    setFormData({
      title: "", description: "", category: "geral", priority: "media",
      recurrence: "unica", assigned_to: "", assigned_to_name: "",
      requires_evidence: true, due_date: "",
    });
    setNoDeadline(false);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Tarefa" : "Nova Tarefa"}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {isEditing ? "Salvar" : "Criar Tarefa"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Template selector */}
        {!isEditing && (
          <div>
            <button
              type="button"
              className="btn btn-secondary btn-sm w-full"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              📋 {showTemplates ? "Ocultar Templates" : "Usar Template Padrão"}
            </button>
            {showTemplates && (
              <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {MAINTENANCE_TEMPLATES.map((t, i) => {
                  const cat = TASK_CATEGORIES.find((c) => c.id === t.category);
                  return (
                    <button
                      key={i}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: "flex-start", textAlign: "left", padding: "8px 12px" }}
                      onClick={() => handleTemplateSelect(t)}
                    >
                      {cat?.icon} {t.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="input-group">
          <label>Título *</label>
          <input className="input" value={formData.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="Ex: Limpeza do salão" required />
        </div>

        <div className="input-group">
          <label>Descrição *</label>
          <textarea className="textarea" value={formData.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Descreva a tarefa em detalhes..." required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="input-group">
            <label>Categoria *</label>
            <select className="select" value={formData.category} onChange={(e) => handleChange("category", e.target.value)}>
              {TASK_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Prioridade *</label>
            <select className="select" value={formData.priority} onChange={(e) => handleChange("priority", e.target.value)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="input-group">
            <label>Recorrência *</label>
            <select className="select" value={formData.recurrence} onChange={(e) => handleChange("recurrence", e.target.value)}>
              {TASK_RECURRENCE.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* NOVO CAMPO DE PRAZO COM CHECKBOX */}
          <div className="input-group">
            <label>Prazo *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input 
                className="input" 
                type="date" 
                value={formData.due_date || ""} 
                onChange={(e) => handleChange("due_date", e.target.value)} 
                disabled={noDeadline}
                style={{ opacity: noDeadline ? 0.5 : 1 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={noDeadline}
                  onChange={(e) => {
                    setNoDeadline(e.target.checked);
                    if (e.target.checked) handleChange("due_date", "");
                  }}
                  style={{ width: 16, height: 16 }}
                />
                Sem prazo final
              </label>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label>Atribuir para *</label>
          <select className="select" value={formData.assigned_to} onChange={(e) => handleAssigneeChange(e.target.value)} required>
            <option value="">Selecionar funcionário...</option>
            {users.filter((u) => u.role === "funcionario").map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={formData.requires_evidence}
            onChange={(e) => handleChange("requires_evidence", e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          📸 Exige evidência fotográfica
        </label>
      </form>
    </Modal>
  );
}