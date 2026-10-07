import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/style.css';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const VapiTokenPage: React.FC = () => {
  const [tokens, setTokens] = useState([]);
  const [assistants, setAssistants] = useState<Record<string, any[]>>({});
  // const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [phoneNumbersByToken, setPhoneNumbersByToken] = useState<Record<string, any[]>>({});
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrors({});
      
      const tokenResponse = await axios.get('/api/vapi-tokens');
      setTokens(tokenResponse.data);

      const assistantsData: Record<string, any[]> = {};
      const phoneNumbersData: Record<string, any[]> = {};
      const errorData: Record<string, string> = {};
      
      for (const token of tokenResponse.data) {
        try {
          const response = await axios.get(`/api/vapi-tokens/${token.id}/assistants?tenantId=1`);
          assistantsData[token.id] = response.data;
        } catch (error: any) {
          if (error.response?.status === 404) {
            errorData[`assistants_${token.id}`] = 'Assistants não disponíveis - Token não existe';
          } else {
            errorData[`assistants_${token.id}`] = 'Erro ao carregar assistants';
          }
          assistantsData[token.id] = [];
        }

        try {
          const phoneResponse = await axios.get(`/api/vapi-tokens/${token.id}/phone-numbers?tenantId=1`);
          phoneNumbersData[token.id] = phoneResponse.data;
        } catch (error: any) {
          if (error.response?.status === 404) {
            errorData[`phones_${token.id}`] = 'Phone numbers não disponíveis - Token não existe';
          } else {
            errorData[`phones_${token.id}`] = 'Erro ao carregar phone numbers';
          }
          phoneNumbersData[token.id] = [];
        }
      }
      
      setAssistants(assistantsData);
      setPhoneNumbersByToken(phoneNumbersData);
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
      await axios.post('/api/vapi-tokens', { name: newTokenName, token: newToken, tenantId: 1 });
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
        await axios.put(`/api/vapi-tokens/${editingToken.id}`, {
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
        await axios.delete(`/api/vapi-tokens/${deletingToken.id}?tenantId=1`);
        closeDeleteModal();
        fetchData();
      } catch (error) {
        console.error('Erro ao deletar token:', error);
        setErrors({ delete: 'Erro ao deletar token' });
      }
    }
  };

  return (
    <div className="wavoip-page-bg">
      <div className="wavoip-container">
        <h1 className="wavoip-title">Meus Tokens Vapi</h1>
        {errors.general && <div className="wavoip-error">{errors.general}</div>}
        {errors.create && <div className="wavoip-error">{errors.create}</div>}
        {errors.update && <div className="wavoip-error">{errors.update}</div>}
        {errors.delete && <div className="wavoip-error">{errors.delete}</div>}
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
            placeholder="Token Vapi"
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
                <th>Assistentes</th>
                <th>Números</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token: any) => (
                <tr key={token.id}>
                  <td>{token.name}</td>
                  <td style={{ maxWidth: 220, wordBreak: 'break-all', fontSize: 13, color: '#b0b0b0', padding: '10px 8px' }}>
                    {errors[`assistants_${token.id}`] ? (
                      <span className="wavoip-status-warn">{errors[`assistants_${token.id}`]}</span>
                    ) : assistants[token.id] === undefined ? (
                      <span className="wavoip-status-wait">Verificando...</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {assistants[token.id]?.map((assistant: any) => (
                          <li key={assistant.id}>{assistant.name}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td style={{ maxWidth: 220, wordBreak: 'break-all', fontSize: 13, color: '#b0b0b0', padding: '10px 8px' }}>
                    {errors[`phones_${token.id}`] ? (
                      <span className="wavoip-status-warn">{errors[`phones_${token.id}`]}</span>
                    ) : phoneNumbersByToken[token.id] === undefined ? (
                      <span className="wavoip-status-wait">Verificando...</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {phoneNumbersByToken[token.id]?.map((number: any) => (
                          <li key={number.id}>{number.number}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <button onClick={() => openEditModal(token)} className="wavoip-btn wavoip-btn-edit"><EditIcon fontSize="inherit" style={{ fontSize: 16 }} /></button>
                    <button onClick={() => openDeleteModal(token)} className="wavoip-btn wavoip-btn-delete"><DeleteIcon fontSize="inherit" style={{ fontSize: 16 }} /></button>
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
                <button onClick={updateToken} className="wavoip-btn wavoip-btn-primary"><EditIcon fontSize="inherit" style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />Salvar</button>
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
                <button onClick={deleteToken} className="wavoip-btn wavoip-btn-delete"><DeleteIcon fontSize="inherit" style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }} />Deletar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VapiTokenPage; 