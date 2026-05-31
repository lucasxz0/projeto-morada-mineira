"use client";

import { getCategoryById, getPriorityById, getStatusById } from "@/config/tasks.config";
import { formatDateRelative, formatDateShort } from "@/lib/dateUtils";

export default function TaskCard({ task, onClick }) {
  const category = getCategoryById(task.category);
  const priority = getPriorityById(task.priority);
  const status = getStatusById(task.status);

  return (
    <div className="task-card animate-fade" onClick={() => onClick?.(task)}>
      <div className="task-card-header">
        <h3 className="task-card-title">{task.title}</h3>
        <span
          className="badge badge-sm"
          style={{ background: `${status.color}18`, color: status.color }}
        >
          {status.icon} {status.label}
        </span>
      </div>

      {task.description && (
        <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.4 }} className="truncate">
          {task.description}
        </p>
      )}

      <div className="task-card-meta">
        <span className="task-card-meta-item">
          <span style={{ color: category.color }}>{category.icon}</span> {category.label}
        </span>
        <span className="task-card-meta-item">
          <span
            className="badge badge-sm"
            style={{ background: `${priority.color}18`, color: priority.color }}
          >
            {priority.label}
          </span>
        </span>
        {task.assigned_to_name && (
          <span className="task-card-meta-item">👷 {task.assigned_to_name}</span>
        )}
      </div>

      <div className="task-card-footer">
        <span className="task-card-evidence">
          📸 {task.evidence_count || 0} evidência(s)
        </span>
        {/* Mostrando o prazo ou Sem Prazo aqui no footer */}
        <span style={{ fontSize: "0.75rem", color: task.due_date ? "var(--color-danger)" : "var(--text-muted)", fontWeight: task.due_date ? "600" : "normal" }}>
          {task.due_date ? `Prazo: ${formatDateShort(task.due_date)}` : "Sem prazo final"}
        </span>
      </div>
    </div>
  );
}