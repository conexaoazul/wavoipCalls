import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/style.css';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const WavoipTokenPage: React.FC = () => {
  const [tokens, setTokens] = useState([]);
  const [status, setStatus] = useState<Record<string, any>>({});
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');
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
      
      const tokenResponse = await axios.get('/api/wavoip-tokens');
      setTokens(tokenResponse.data);

      // Verificar disponibilidade de todos os tokens
      const statusData: Record<string, any> = {};
      for (const token of tokenResponse.data) {
        try {
          const statusResponse = await axios.get(`/api/wavoip-tokens/${token.id}/availability?tenantId=1`);
          statusData[token.id] = statusResponse.data;
        } catch (error: any) {
          statusData[token.id] = { available: false, error: 'Erro ao verificar disponibilidade' };
        }
      }
      setStatus(statusData);
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
    if (!newTokenName || !newTokenValue) {
      setErrors({ create: 'Preencha o número do Whatsapp e o Token.' });
      return;
    }
    try {
      await axios.post('/api/wavoip-tokens', { 
        name: newTokenName, 
        token: newTokenValue, 
        tenantId: 1 
      });
      setNewTokenName('');
      setNewTokenValue('');
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
        await axios.put(`/api/wavoip-tokens/${editingToken.id}`, {
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
        await axios.delete(`/api/wavoip-tokens/${deletingToken.id}?tenantId=1`);
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
        <h1 className="wavoip-title">Meus Tokens Wavoip</h1>
        {errors.general && <div className="wavoip-error">{errors.general}</div>}
        {errors.create && <div className="wavoip-error">{errors.create}</div>}
        {errors.update && <div className="wavoip-error">{errors.update}</div>}
        {errors.delete && <div className="wavoip-error">{errors.delete}</div>}
        <div className="wavoip-add-bar">
          <input
            type="text"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="Número do Whatsapp"
            className="wavoip-input"
          />
          <input
            type="password"
            value={newTokenValue}
            onChange={(e) => setNewTokenValue(e.target.value)}
            placeholder="Token Wavoip"
            className="wavoip-input"
          />
          <button onClick={createToken} disabled={loading} className="wavoip-btn wavoip-btn-primary">Adicionar Token</button>
        </div>
        {loading && <div className="wavoip-loading">Carregando...</div>}
        <div className="wavoip-table-wrapper">
          <table className="wavoip-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Token</th>
                <th>Status</th>
                <th>Whatsapp</th>
                <th>Disponibilidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token: any) => (
                <tr key={token.id}>
                  <td>{token.name}</td>
                  <td style={{ maxWidth: 220, fontSize: 13, color: '#b0b0b0' }}>
                    {token.hasToken ? 'Configurado (write-only)' : 'Não configurado'}
                  </td>
                  <td>
                    {status[token.id] ? (
                      <span className={
                        status[token.id].status === 'close'
                          ? 'wavoip-status-bad'
                          : 'wavoip-status-ok'
                      }>
                        {status[token.id].status || (status[token.id].available ? 'Disponível' : 'Indisponível')}
                        {status[token.id].error && <span className="wavoip-status-warn"> - {status[token.id].error}</span>}
                      </span>
                    ) : (
                      <span className="wavoip-status-wait">Verificando...</span>
                    )}
                  </td>
                  <td>{status[token.id]?.phone || '-'}</td>
                  <td>
                    {status[token.id] ? (
                      <span className={status[token.id].available ? 'wavoip-available' : 'wavoip-unavailable'}>
                        {status[token.id].available ? 'Sim' : 'Não'}
                      </span>
                    ) : '-'}
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
                  type="password"
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

export default WavoipTokenPage; 