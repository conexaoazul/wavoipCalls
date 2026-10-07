import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/style.css';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';

const ElevenLabTokenPage: React.FC = () => {
  const [tokens, setTokens] = useState([]);
  const [agents, setAgents] = useState<Record<string, any[]>>({});
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, any[]>>({});
  const [newTokenName, setNewTokenName] = useState('');
  const [newToken, setNewToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Estados para edição
  const [editingToken, setEditingToken] = useState<any>(null);
  const [editTokenName, setEditTokenName] = useState('');
  const [editTokenValue, setEditTokenValue] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Estados para exclusão
  const [deletingToken, setDeletingToken] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Estados para fazer chamada
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [callData, setCallData] = useState({
    agentId: '',
    agentPhoneNumberId: '',
    toNumber: '',
    conversationInitiationClientData: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrors({});
      
      const tokenResponse = await axios.get('/api/elevenlab-tokens');
      setTokens(tokenResponse.data);

      const agentsData: Record<string, any[]> = {};
      const phoneNumbersData: Record<string, any[]> = {};
      const errorData: Record<string, string> = {};
      
      for (const token of tokenResponse.data) {
        try {
          const response = await axios.get(`/api/elevenlab-tokens/${token.id}/agents?tenantId=1`);
          agentsData[token.id] = response.data.agents || [];
        } catch (error: any) {
          if (error.response?.status === 404) {
            errorData[`agents_${token.id}`] = 'Agents não disponíveis - Token não existe';
          } else {
            errorData[`agents_${token.id}`] = 'Erro ao carregar agents';
          }
          agentsData[token.id] = [];
        }

        try {
          const phoneResponse = await axios.get(`/api/elevenlab-tokens/${token.id}/phone-numbers?tenantId=1`);
          phoneNumbersData[token.id] = phoneResponse.data || [];
        } catch (error: any) {
          if (error.response?.status === 404) {
            errorData[`phones_${token.id}`] = 'Phone numbers não disponíveis - Token não existe';
          } else {
            errorData[`phones_${token.id}`] = 'Erro ao carregar phone numbers';
          }
          phoneNumbersData[token.id] = [];
        }
      }
      
      setAgents(agentsData);
      setPhoneNumbers(phoneNumbersData);
      setErrors(errorData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setErrors({ general: 'Erro ao carregar tokens' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createToken = async () => {
    if (!newTokenName || !newToken) {
      setErrors({ create: 'Preencha o nome do Token e o Token.' });
      return;
    }
    try {
      await axios.post('/api/elevenlab-tokens', { name: newTokenName, token: newToken, tenantId: 1 });
      setNewTokenName('');
      setNewToken('');
      fetchData();
    } catch (error) {
      console.error('Erro ao criar token:', error);
      setErrors({ create: 'Erro ao criar token' });
    }
  };

  const openEditModal = (token: any) => {
    setEditingToken(token);
    setEditTokenName(token.name);
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
    if (editingToken && editTokenName) {
      try {
        await axios.put(`/api/elevenlab-tokens/${editingToken.id}`, {
          name: editTokenName,
          ...(editTokenValue.trim() ? { token: editTokenValue.trim() } : {}),
          tenantId: 1
        });
        closeEditModal();
        fetchData();
      } catch (error) {
        console.error('Erro ao atualizar token:', error);
        setErrors({ update: 'Erro ao atualizar token' });
      }
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
    if (deletingToken) {
      try {
        await axios.delete(`/api/elevenlab-tokens/${deletingToken.id}?tenantId=1`);
        closeDeleteModal();
        fetchData();
      } catch (error) {
        console.error('Erro ao deletar token:', error);
        setErrors({ delete: 'Erro ao deletar token' });
      }
    }
  };

  const openCallModal = (token: any) => {
    setSelectedToken(token);
    setCallData({
      agentId: '',
      agentPhoneNumberId: '',
      toNumber: '',
      conversationInitiationClientData: ''
    });
    setShowCallModal(true);
  };

  const closeCallModal = () => {
    setShowCallModal(false);
    setSelectedToken(null);
    setCallData({
      agentId: '',
      agentPhoneNumberId: '',
      toNumber: '',
      conversationInitiationClientData: ''
    });
  };

  const makeCall = async () => {
    if (!callData.agentId || !callData.agentPhoneNumberId || !callData.toNumber) {
      setErrors({ call: 'Preencha todos os campos obrigatórios' });
      return;
    }

    try {
      const payload = {
        tenantId: 1,
        agentId: callData.agentId,
        agentPhoneNumberId: callData.agentPhoneNumberId,
        toNumber: callData.toNumber,
        conversationInitiationClientData: callData.conversationInitiationClientData || undefined
      };

      const response = await axios.post(`/api/elevenlab-tokens/${selectedToken.id}/outbound-call`, payload);
      alert(`Chamada realizada com sucesso! ${response.data.message}`);
      closeCallModal();
      setErrors({});
    } catch (error: any) {
      console.error('Erro ao realizar chamada:', error);
      setErrors({ call: error.response?.data?.error || 'Erro ao realizar chamada' });
    }
  };

  return (
    <div className="wavoip-page-bg">
      <div className="wavoip-container">
        <h1 className="wavoip-title">Meus Tokens ElevenLabs</h1>
        {errors.general && <div className="wavoip-error">{errors.general}</div>}
        {errors.create && <div className="wavoip-error">{errors.create}</div>}
        {errors.update && <div className="wavoip-error">{errors.update}</div>}
        {errors.delete && <div className="wavoip-error">{errors.delete}</div>}
        {errors.call && <div className="wavoip-error">{errors.call}</div>}
        
        <div className="wavoip-add-bar">
          <input
            type="text"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="Nome do Token"
            className="wavoip-input"
          />
          <input
            type="password"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            placeholder="Token ElevenLabs (xi-api-key)"
            className="wavoip-input"
          />
          <button onClick={createToken} disabled={loading} className="wavoip-btn wavoip-btn-primary">Adicionar Token</button>
        </div>
        
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
                  <td style={{ maxWidth: 220, wordBreak: 'break-all', fontSize: 13, color: '#b0b0b0', padding: '10px 8px' }}>
                    {errors[`agents_${token.id}`] ? (
                      <span className="wavoip-status-warn">{errors[`agents_${token.id}`]}</span>
                    ) : agents[token.id] === undefined ? (
                      <span className="wavoip-status-wait">Verificando...</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {agents[token.id]?.map((agent: any) => (
                          <li key={agent.agent_id}>{agent.name}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td style={{ maxWidth: 220, wordBreak: 'break-all', fontSize: 13, color: '#b0b0b0', padding: '10px 8px' }}>
                    {errors[`phones_${token.id}`] ? (
                      <span className="wavoip-status-warn">{errors[`phones_${token.id}`]}</span>
                    ) : phoneNumbers[token.id] === undefined ? (
                      <span className="wavoip-status-wait">Verificando...</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {phoneNumbers[token.id]?.map((number: any) => (
                          <li key={number.phone_number_id}>{number.phone_number}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    {/* <button onClick={() => openCallModal(token)} className="wavoip-btn wavoip-btn-primary" title="Fazer Chamada">
                      <PhoneIcon fontSize="inherit" style={{ fontSize: 16 }} />
                    </button> */}
                    <button onClick={() => openEditModal(token)} className="wavoip-btn wavoip-btn-edit" title="Editar">
                      <EditIcon fontSize="inherit" style={{ fontSize: 16 }} />
                    </button>
                    <button onClick={() => openDeleteModal(token)} className="wavoip-btn wavoip-btn-delete" title="Deletar">
                      <DeleteIcon fontSize="inherit" style={{ fontSize: 16 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal de Edição */}
        {showEditModal && (
          <div className="wavoip-modal-bg">
            <div className="wavoip-modal">
              <h3>Editar Token</h3>
              <div className="wavoip-modal-field">
                <label>Nome:</label>
                <input
                  type="text"
                  value={editTokenName}
                  onChange={(e) => setEditTokenName(e.target.value)}
                  className="wavoip-input"
                />
              </div>
              <div className="wavoip-modal-field">
                <label>Token:</label>
                <input
                  type="password"
                  value={editTokenValue}
                  onChange={(e) => setEditTokenValue(e.target.value)}
                  placeholder="Deixe em branco para manter o segredo atual"
                  className="wavoip-input"
                />
              </div>
              <div className="wavoip-modal-actions">
                <button onClick={closeEditModal} className="wavoip-btn">Cancelar</button>
                <button onClick={updateToken} className="wavoip-btn wavoip-btn-primary">
                  <EditIcon fontSize="inherit" style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteModal && (
          <div className="wavoip-modal-bg">
            <div className="wavoip-modal">
              <h3>Confirmar Exclusão</h3>
              <p>Tem certeza que deseja deletar o token "{deletingToken?.name}"?</p>
              <p className="wavoip-modal-warn">Esta ação não pode ser desfeita.</p>
              <div className="wavoip-modal-actions">
                <button onClick={closeDeleteModal} className="wavoip-btn">Cancelar</button>
                <button onClick={deleteToken} className="wavoip-btn wavoip-btn-delete">
                  <DeleteIcon fontSize="inherit" style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />Deletar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Chamada */}
        {showCallModal && (
          <div className="wavoip-modal-bg">
            <div className="wavoip-modal">
              <h3>Fazer Chamada - {selectedToken?.name}</h3>
              <div className="wavoip-modal-field">
                <label>Agent ID:</label>
                <input
                  type="text"
                  value={callData.agentId}
                  onChange={(e) => setCallData({...callData, agentId: e.target.value})}
                  placeholder="ID do agent"
                  className="wavoip-input"
                />
              </div>
              <div className="wavoip-modal-field">
                <label>Phone Number ID:</label>
                <input
                  type="text"
                  value={callData.agentPhoneNumberId}
                  onChange={(e) => setCallData({...callData, agentPhoneNumberId: e.target.value})}
                  placeholder="ID do número de telefone"
                  className="wavoip-input"
                />
              </div>
              <div className="wavoip-modal-field">
                <label>Número de Destino:</label>
                <input
                  type="text"
                  value={callData.toNumber}
                  onChange={(e) => setCallData({...callData, toNumber: e.target.value})}
                  placeholder="+5511999999999"
                  className="wavoip-input"
                />
              </div>
              <div className="wavoip-modal-field">
                <label>Dados do Cliente (opcional):</label>
                <textarea
                  value={callData.conversationInitiationClientData}
                  onChange={(e) => setCallData({...callData, conversationInitiationClientData: e.target.value})}
                  placeholder="Dados adicionais para a conversa"
                  className="wavoip-input"
                  rows={3}
                />
              </div>
              <div className="wavoip-modal-actions">
                <button onClick={closeCallModal} className="wavoip-btn">Cancelar</button>
                <button onClick={makeCall} className="wavoip-btn wavoip-btn-primary">
                  <PhoneIcon fontSize="inherit" style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />Fazer Chamada
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
