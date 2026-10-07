import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/style.css';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const TENANT_ID = 1;

const ElevenLabTokenPage: React.FC = () => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [agents, setAgents] = useState<Record<string, any[]>>({});
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, any[]>>({});
  const [newTokenName, setNewTokenName] = useState('');
  const [newToken, setNewToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [editingToken, setEditingToken] = useState<any>(null);
  const [editTokenName, setEditTokenName] = useState('');
  const [editTokenValue, setEditTokenValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const [deletingToken, setDeletingToken] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrors({});

      const tokenResponse = await axios.get(`/api/elevenlab-tokens?tenantId=${TENANT_ID}`);
      setTokens(tokenResponse.data);

      const agentsData: Record<string, any[]> = {};
      const phoneNumbersData: Record<string, any[]> = {};
      const errorData: Record<string, string> = {};

      for (const token of tokenResponse.data) {
        try {
          const response = await axios.get(
            `/api/elevenlab-tokens/${token.id}/agents?tenantId=${TENANT_ID}`,
          );
          agentsData[token.id] = response.data.agents || [];
        } catch (error: any) {
          errorData[`agents_${token.id}`] =
            error.response?.status === 404
              ? 'Agents não disponíveis - credencial não encontrada'
              : 'Erro ao carregar agents';
          agentsData[token.id] = [];
        }

        try {
          const response = await axios.get(
            `/api/elevenlab-tokens/${token.id}/phone-numbers?tenantId=${TENANT_ID}`,
          );
          phoneNumbersData[token.id] = response.data || [];
        } catch (error: any) {
          errorData[`phones_${token.id}`] =
            error.response?.status === 404
              ? 'Phone numbers não disponíveis - credencial não encontrada'
              : 'Erro ao carregar phone numbers';
          phoneNumbersData[token.id] = [];
        }
      }

      setAgents(agentsData);
      setPhoneNumbers(phoneNumbersData);
      setErrors(errorData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErrors({ general: 'Erro ao carregar credenciais' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createToken = async () => {
    if (!newTokenName || !newToken) {
      setErrors({ create: 'Preencha o nome e o token.' });
      return;
    }

    try {
      await axios.post('/api/elevenlab-tokens', {
        name: newTokenName,
        token: newToken,
        tenantId: TENANT_ID,
      });
      setNewTokenName('');
      setNewToken('');
      await fetchData();
    } catch (error) {
      console.error('Erro ao criar credencial:', error);
      setErrors({ create: 'Erro ao criar credencial' });
    }
  };

  const openEditModal = (token: any) => {
    setEditingToken(token);
    setEditTokenName(token.name);
    // Secret is intentionally write-only.
    setEditTokenValue('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingToken(null);
    setEditTokenName('');
    setEditTokenValue('');
  };

  const updateToken = async () => {
    if (!editingToken || !editTokenName) return;

    try {
      await axios.put(`/api/elevenlab-tokens/${editingToken.id}`, {
        name: editTokenName,
        ...(editTokenValue.trim() ? { token: editTokenValue.trim() } : {}),
        tenantId: TENANT_ID,
      });
      closeEditModal();
      await fetchData();
    } catch (error) {
      console.error('Erro ao atualizar credencial:', error);
      setErrors({ update: 'Erro ao atualizar credencial' });
    }
  };

  const openDeleteModal = (token: any) => {
    setDeletingToken(token);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingToken(null);
  };

  const deleteToken = async () => {
    if (!deletingToken) return;

    try {
      await axios.delete(
        `/api/elevenlab-tokens/${deletingToken.id}?tenantId=${TENANT_ID}`,
      );
      closeDeleteModal();
      await fetchData();
    } catch (error) {
      console.error('Erro ao deletar credencial:', error);
      setErrors({ delete: 'Erro ao deletar credencial' });
    }
  };

  return (
    <div className="wavoip-page-bg">
      <div className="wavoip-container">
        <h1 className="wavoip-title">Credenciais ElevenLabs</h1>
        {errors.general && <div className="wavoip-error">{errors.general}</div>}
        {errors.create && <div className="wavoip-error">{errors.create}</div>}
        {errors.update && <div className="wavoip-error">{errors.update}</div>}
        {errors.delete && <div className="wavoip-error">{errors.delete}</div>}

        <div className="wavoip-add-bar">
          <input
            type="text"
            value={newTokenName}
            onChange={(event) => setNewTokenName(event.target.value)}
            placeholder="Nome da credencial"
            className="wavoip-input"
          />
          <input
            type="password"
            value={newToken}
            onChange={(event) => setNewToken(event.target.value)}
            placeholder="Token ElevenLabs (write-only)"
            className="wavoip-input"
          />
          <button
            onClick={createToken}
            disabled={loading}
            className="wavoip-btn wavoip-btn-primary"
          >
            Adicionar credencial
          </button>
        </div>

        <p style={{ color: '#b0b0b0' }}>
          Chamadas diretas foram removidas desta tela. O dispatch seguro passa pela fila de
          ligações, com idempotência, policy e feature flags.
        </p>

        {loading && <div className="wavoip-loading">Carregando...</div>}

        <div className="wavoip-table-wrapper">
          <table className="wavoip-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Agents</th>
                <th>Números</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token: any) => (
                <tr key={token.id}>
                  <td>{token.name}</td>
                  <td
                    style={{
                      maxWidth: 220,
                      wordBreak: 'break-all',
                      fontSize: 13,
                      color: '#b0b0b0',
                      padding: '10px 8px',
                    }}
                  >
                    {errors[`agents_${token.id}`] ? (
                      <span className="wavoip-status-warn">
                        {errors[`agents_${token.id}`]}
                      </span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(agents[token.id] || []).map((agent: any) => (
                          <li key={agent.agent_id}>{agent.name}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td
                    style={{
                      maxWidth: 220,
                      wordBreak: 'break-all',
                      fontSize: 13,
                      color: '#b0b0b0',
                      padding: '10px 8px',
                    }}
                  >
                    {errors[`phones_${token.id}`] ? (
                      <span className="wavoip-status-warn">
                        {errors[`phones_${token.id}`]}
                      </span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(phoneNumbers[token.id] || []).map((number: any) => (
                          <li key={number.phone_number_id}>{number.phone_number}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => openEditModal(token)}
                      className="wavoip-btn wavoip-btn-edit"
                      title="Editar"
                    >
                      <EditIcon fontSize="inherit" style={{ fontSize: 16 }} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(token)}
                      className="wavoip-btn wavoip-btn-delete"
                      title="Deletar"
                    >
                      <DeleteIcon fontSize="inherit" style={{ fontSize: 16 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showEditModal && (
          <div className="wavoip-modal-bg">
            <div className="wavoip-modal">
              <h3>Editar credencial</h3>
              <div className="wavoip-modal-field">
                <label>Nome:</label>
                <input
                  type="text"
                  value={editTokenName}
                  onChange={(event) => setEditTokenName(event.target.value)}
                  className="wavoip-input"
                />
              </div>
              <div className="wavoip-modal-field">
                <label>Novo token:</label>
                <input
                  type="password"
                  value={editTokenValue}
                  onChange={(event) => setEditTokenValue(event.target.value)}
                  placeholder="Deixe em branco para manter o segredo atual"
                  className="wavoip-input"
                />
              </div>
              <div className="wavoip-modal-actions">
                <button onClick={closeEditModal} className="wavoip-btn">
                  Cancelar
                </button>
                <button
                  onClick={updateToken}
                  className="wavoip-btn wavoip-btn-primary"
                >
                  <EditIcon
                    fontSize="inherit"
                    style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }}
                  />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="wavoip-modal-bg">
            <div className="wavoip-modal">
              <h3>Confirmar exclusão</h3>
              <p>Tem certeza que deseja deletar a credencial "{deletingToken?.name}"?</p>
              <p className="wavoip-modal-warn">Esta ação não pode ser desfeita.</p>
              <div className="wavoip-modal-actions">
                <button onClick={closeDeleteModal} className="wavoip-btn">
                  Cancelar
                </button>
                <button
                  onClick={deleteToken}
                  className="wavoip-btn wavoip-btn-delete"
                >
                  <DeleteIcon
                    fontSize="inherit"
                    style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }}
                  />
                  Deletar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElevenLabTokenPage;
