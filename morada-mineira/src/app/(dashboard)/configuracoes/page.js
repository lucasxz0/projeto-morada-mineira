"use client";

import { useAuth } from "@/contexts/AuthContext";
import { COMPANY } from "@/config/company.config";

export default function ConfiguracoesPage() {
  const { isGerente, users, updateUser } = useAuth();

  if (!isGerente) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-text">Acesso Restrito</div>
        <div className="empty-state-sub">Apenas gerentes podem acessar as configurações.</div>
      </div>
    );
  }

  async function handleRoleChange(id, newRole) {
    if (confirm("Mudar o papel deste usuário?")) {
      await updateUser(id, { role: newRole });
      alert("Papel do usuário atualizado com sucesso!");
    }
  }

  return (
    <div className="animate-fade">
      <div className="header">
        <div className="header-title">
          <h1>Configurações</h1>
          <p>Gerencie o sistema e os usuários</p>
        </div>
      </div>

      <div className="detail-section">
        <h2 className="detail-section-title">🏢 Empresa</h2>
        <div className="card">
          <div className="config-list">
            <div className="config-item">
              <div>
                <strong>Nome</strong>
                <p className="text-muted text-sm">{COMPANY.name}</p>
              </div>
            </div>
            <div className="config-item">
              <div>
                <strong>Slogan</strong>
                <p className="text-muted text-sm">{COMPANY.slogan}</p>
              </div>
            </div>
            <div className="config-item">
              <div>
                <strong>Descrição</strong>
                <p className="text-muted text-sm">{COMPANY.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h2 className="detail-section-title">👥 Usuários ({users.length})</h2>
        <div className="card">
          <div className="config-list">
            {users.map(u => (
              <div key={u.id} className="config-item">
                <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                  <span style={{ fontSize: "1.5rem" }}>{u.avatar_emoji}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{u.name}</strong>
                  </div>
                  <select 
                    className="select" 
                    style={{ width: "auto", padding: "6px 10px", fontSize: "0.85rem" }} 
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    <option value="gerente">Gerente</option>
                    <option value="funcionario">Funcionário</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
