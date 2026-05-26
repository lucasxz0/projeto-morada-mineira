"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/contexts/TaskContext";
import { useToast } from "@/contexts/ToastContext";
import { getCategoryById, getPriorityById, getStatusById, TASK_STATUSES } from "@/config/tasks.config";
import { formatDateFull, formatDateRelative } from "@/lib/dateUtils";
import PhotoCapture from "@/components/evidence/PhotoCapture";
import Lightbox from "@/components/ui/Lightbox";
import Modal from "@/components/ui/Modal";
import { deleteButtonStyle } from "@/lib/uiConstants";

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isGerente } = useAuth();
  
  // Adicionamos o uploadEvidenceImage aqui na desestruturação
  const { 
    getTaskById, 
    getEvidencesByTask, 
    updateTask, 
    deleteTask, 
    addEvidence, 
    approveEvidence, 
    rejectEvidence, 
    deleteEvidence,
    uploadEvidenceImage 
  } = useTasks();
  
  const toast = useToast();

  const [showCapture, setShowCapture] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const task = getTaskById(id);
  const taskEvidences = getEvidencesByTask(id);

  if (!task) {
    return (
      <div className="empty-state animate-fade">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-text">Tarefa não encontrada</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/tarefas")}>
          Voltar para Tarefas
        </button>
      </div>
    );
  }

  const category = getCategoryById(task.category);
  const priority = getPriorityById(task.priority);
  const status = getStatusById(task.status);

  async function handleStatusChange(newStatus) {
    await updateTask(task.id, { status: newStatus });
    toast.success(`Status atualizado para "${getStatusById(newStatus).label}"`);
  }

  async function handleDelete() {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      await deleteTask(task.id);
      toast.success("Tarefa excluída");
      router.push("/tarefas");
    }
  }

  // --- FUNÇÃO ATUALIZADA PARA ENVIAR PRO STORAGE ---
  async function handleEvidenceCapture(evidenceData) {
    // 1. Extraímos o arquivo real (file) do resto dos dados
    const { file, ...restData } = evidenceData;

    toast.info("Enviando foto para o servidor...");
    
    // 2. Faz o upload da foto para o bucket "evidencias" no Supabase
    const uploadedUrl = await uploadEvidenceImage(file, task.id);

    if (!uploadedUrl) {
      toast.error("Erro ao enviar a imagem. Tente novamente.");
      return;
    }

    // 3. Salva no banco de dados usando a URL pública do Storage
    const result = await addEvidence({ 
      ...restData, 
      image_url: uploadedUrl,
      storage_path: uploadedUrl,
      captured_by: user?.id 
    });

    if (result) {
      toast.success("Evidência enviada com sucesso!");
      setShowCapture(false);
    }
  }

  async function handleApprove(evId) {
    await approveEvidence(evId, task.id);
    toast.success("Evidência aprovada!");
  }

  async function handleReject() {
    if (!rejectModal) return;
    await rejectEvidence(rejectModal, task.id, rejectReason);
    toast.warning("Evidência rejeitada. Tarefa devolvida.");
    setRejectModal(null);
    setRejectReason("");
  }

  async function handleDeleteEv(ev, closeLightbox = false) {
    if (!confirm("Tem certeza que deseja apagar esta evidência?")) return;
    try {
      await deleteEvidence(ev.id, task.id);
      if (closeLightbox) setLightboxImg(null);
      toast.success("Evidência apagada");
    } catch (err) {
      console.error("Erro ao apagar evidência:", err);
      toast.error("Ocorreu um erro ao apagar a evidência.");
    }
  }

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => router.push("/tarefas")}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.2rem" }}>{task.title}</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <span className="badge" style={{ background: `${status.color}18`, color: status.color }}>
              {status.icon} {status.label}
            </span>
            <span className="badge" style={{ background: `${priority.color}18`, color: priority.color }}>
              {priority.label}
            </span>
            <span className="badge" style={{ background: `${category.color}18`, color: category.color }}>
              {category.icon} {category.label}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="detail-section">
        <h3 className="detail-section-title">📋 Informações</h3>
        {task.description && (
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
            {task.description}
          </p>
        )}
        <div className="detail-info-grid">
          <div className="detail-info-item">
            <div className="detail-info-label">Criada por</div>
            <div className="detail-info-value">{task.created_by_name || "—"}</div>
          </div>
          <div className="detail-info-item">
            <div className="detail-info-label">Atribuída para</div>
            <div className="detail-info-value">{task.assigned_to_name || "Não atribuída"}</div>
          </div>
          <div className="detail-info-item">
            <div className="detail-info-label">Criada em</div>
            <div className="detail-info-value">{formatDateFull(task.created_at)}</div>
          </div>
          <div className="detail-info-item">
            <div className="detail-info-label">Prazo</div>
            <div className="detail-info-value">{task.due_date || "Sem prazo"}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="detail-section">
        <h3 className="detail-section-title">⚡ Ações</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Funcionário pode mudar status */}
          {!isGerente && task.status === "pendente" && (
            <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange("em_andamento")}>
              🔄 Iniciar Tarefa
            </button>
          )}
          {/* Permite enviar evidências não só em andamento, mas também se já estiver aguardando aprovação ou rejeitada */}
          {["em_andamento", "aguardando_evidencia", "rejeitada"].includes(task.status) && (
            <button className="btn btn-success btn-sm" onClick={() => setShowCapture(true)}>
              📸 Enviar Evidência
            </button>
          )}
          {!isGerente && task.status === "rejeitada" && (
            <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange("em_andamento")}>
              🔄 Refazer Tarefa
            </button>
          )}

          {/* Gerente pode gerenciar */}
          {isGerente && (
            <>
              <select
                className="select"
                style={{ width: "auto", padding: "6px 12px", fontSize: "0.85rem" }}
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                ))}
              </select>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑️ Excluir</button>
            </>
          )}
        </div>
      </div>

      {/* Photo Capture */}
      {showCapture && (
        <div className="detail-section animate-slide">
          <h3 className="detail-section-title">📸 Capturar Evidência</h3>
          <PhotoCapture onCapture={handleEvidenceCapture} taskId={task.id} />
        </div>
      )}

      {/* Evidências */}
      <div className="detail-section">
        <h3 className="detail-section-title">📸 Evidências ({taskEvidences.length})</h3>

        {taskEvidences.length > 0 ? (
          <div className="evidence-grid">
            {taskEvidences.map((ev) => (
              <div key={ev.id} className="evidence-card" onClick={() => setLightboxImg(ev)}>
                <img src={ev.image_url} alt={ev.description || "Evidência"} />
                
                {isGerente && (
                  <button 
                    style={deleteButtonStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEv(ev);
                    }}
                  >
                    🗑️
                  </button>
                )}

                <span className={`evidence-status ${ev.status || "pendente"}`}>
                  {ev.status === "aprovada" ? "✅ Aprovada" : ev.status === "rejeitada" ? "❌ Rejeitada" : "⏳ Pendente"}
                </span>
                <div className="evidence-card-overlay">
                  <div>{ev.description || "Sem descrição"}</div>
                  <div style={{ fontSize: "0.65rem", opacity: 0.8 }}>{formatDateRelative(ev.captured_at || ev.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="empty-state-icon">📷</div>
            <div className="empty-state-text">Nenhuma evidência enviada</div>
          </div>
        )}

        {/* Approve/Reject buttons for gerente */}
        {isGerente && taskEvidences.filter((e) => e.status === "pendente").length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Aprovar/Rejeitar evidências pendentes:</h4>
            {taskEvidences.filter((e) => e.status === "pendente").map((ev) => (
              <div key={ev.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
                <img src={ev.image_url} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: "cover" }} />
                <div style={{ flex: 1, fontSize: "0.85rem" }}>{ev.description || "Sem descrição"}</div>
                <button className="btn btn-success btn-sm" onClick={() => handleApprove(ev.id)}>✅</button>
                <button className="btn btn-danger btn-sm" onClick={() => setRejectModal(ev.id)}>❌</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        isOpen={!!lightboxImg}
        onClose={() => setLightboxImg(null)}
        src={lightboxImg?.image_url}
        alt={lightboxImg?.description}
        info={
          lightboxImg && (
            <div>
              <div style={{ fontWeight: 600 }}>{lightboxImg.description || "Sem descrição"}</div>
              <div style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: 4 }}>
                {lightboxImg.captured_by} • {formatDateFull(lightboxImg.captured_at || lightboxImg.created_at)}
              </div>
              {lightboxImg.rejection_reason && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(198,40,40,0.2)", borderRadius: 8, fontSize: "0.85rem" }}>
                  ❌ Motivo: {lightboxImg.rejection_reason}
                </div>
              )}
              {isGerente && (
                <button 
                  className="btn btn-danger btn-sm" 
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEv(lightboxImg, true);
                  }}
                >
                  🗑️ Apagar Evidência Definitivamente
                </button>
              )}
            </div>
          )
        }
      />

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectReason(""); }}
        title="Rejeitar Evidência"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setRejectModal(null); setRejectReason(""); }}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleReject}>Rejeitar</button>
          </>
        }
      >
        <div className="input-group">
          <label>Motivo da rejeição</label>
          <textarea
            className="textarea"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explique por que a evidência foi rejeitada..."
          />
        </div>
      </Modal>
    </div>
  );
}