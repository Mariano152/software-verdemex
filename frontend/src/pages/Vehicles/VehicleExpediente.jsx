import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ExpedientePage.css';

export default function ExpedientePage() {
  const { expedienteId } = useParams();
  const navigate = useNavigate();
  
  const [expediente, setExpediente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemContent, setNewItemContent] = useState('');
  const [notification, setNotification] = useState(null);
  const [editForm, setEditForm] = useState({
    titulo: '',
    descripcion: '',
    estado: 'activo'
  });

  useEffect(() => {
    fetchExpediente();
  }, [expedienteId]);

  const fetchExpediente = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/expedientes/${expedienteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al obtener expediente');

      const data = await response.json();
      setExpediente(data);
      setEditForm({
        titulo: data.titulo,
        descripcion: data.descripcion,
        estado: data.estado
      });
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        message: 'Error al cargar expediente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpediente = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/expedientes/${expedienteId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) throw new Error('Error al guardar');

      const updated = await response.json();
      setExpediente(updated);
      setIsEditing(false);
      setNotification({
        type: 'success',
        message: '✅ Expediente actualizado correctamente'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        message: 'Error al guardar expediente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemContent.trim()) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/expedientes/${expedienteId}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contenido: newItemContent,
          tipo_item: 'actividad'
        })
      });

      if (!response.ok) throw new Error('Error al crear item');

      const newItem = await response.json();
      setExpediente({
        ...expediente,
        items: [newItem, ...(expediente.items || [])]
      });
      setNewItemContent('');
      setNotification({
        type: 'success',
        message: '✅ Item agregado'
      });
      setTimeout(() => setNotification(null), 2000);
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        message: 'Error al agregar item'
      });
    }
  };

  const handleToggleItem = async (itemId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/expedientes/items/${itemId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al actualizar');

      const updated = await response.json();
      setExpediente({
        ...expediente,
        items: expediente.items.map(item => 
          item.id === itemId ? updated : item
        )
      });
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        message: 'Error al actualizar item'
      });
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('¿Eliminar este item?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/expedientes/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al eliminar');

      setExpediente({
        ...expediente,
        items: expediente.items.filter(item => item.id !== itemId)
      });
      setNotification({
        type: 'success',
        message: '✅ Item eliminado'
      });
      setTimeout(() => setNotification(null), 2000);
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        message: 'Error al eliminar item'
      });
    }
  };

  if (loading) {
    return (
      <div className='expediente-page'>
        <div className='loading-spinner'>Cargando...</div>
      </div>
    );
  }

  if (!expediente) {
    return (
      <div className='expediente-page'>
        <div className='error-message'>Expediente no encontrado</div>
      </div>
    );
  }

  const itemsCompletados = (expediente.items || []).filter(i => i.completado).length;
  const totalItems = expediente.items?.length || 0;
  const progressPercentage = totalItems === 0 ? 0 : Math.round((itemsCompletados / totalItems) * 100);

  return (
    <div className='expediente-page'>
      <div className='expediente-header-main'>
        <button className='btn-back' onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <h1>📋 {expediente.titulo}</h1>
        <button 
          className={`btn-edit ${isEditing ? 'editing' : ''}`}
          onClick={() => isEditing ? handleSaveExpediente() : setIsEditing(true)}
        >
          {isEditing ? '💾 Guardar Cambios' : '✏️ Editar'}
        </button>
      </div>

      {isEditing ? (
        <div className='edit-form'>
          <div className='form-group'>
            <label>Título</label>
            <input
              type='text'
              value={editForm.titulo}
              onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
              placeholder='Título del expediente'
            />
          </div>

          <div className='form-group'>
            <label>Descripción</label>
            <textarea
              value={editForm.descripcion}
              onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
              placeholder='Descripción del expediente'
              rows={4}
            />
          </div>

          <div className='form-group'>
            <label>Estado</label>
            <select
              value={editForm.estado}
              onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
            >
              <option value='activo'>Activo</option>
              <option value='completado'>Completado</option>
              <option value='archivado'>Archivado</option>
              <option value='cancelado'>Cancelado</option>
            </select>
          </div>

          <button 
            className='btn-cancel-edit'
            onClick={() => setIsEditing(false)}
          >
            ❌ Cancelar
          </button>
        </div>
      ) : (
        <div className='expediente-info'>
          {expediente.descripcion && (
            <p className='description'>{expediente.descripcion}</p>
          )}
          <div className='info-row'>
            <span className='label'>Estado:</span>
            <span className='value'>{expediente.estado}</span>
          </div>
        </div>
      )}

      <div className='progress-section'>
        <div className='progress-header'>
          <h3>Progreso: {itemsCompletados}/{totalItems} ({progressPercentage}%)</h3>
        </div>
        <div className='progress-bar-main'>
          <div 
            className='progress-fill-main' 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className='items-section'>
        <h3>📌 Items del Expediente</h3>

        {isEditing && (
          <div className='add-item-form'>
            <input
              type='text'
              placeholder='Agregar nuevo item...'
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <button 
              className='btn-add-item'
              onClick={handleAddItem}
              disabled={!newItemContent.trim()}
            >
              ➕ Agregar
            </button>
          </div>
        )}

        <div className='items-list'>
          {expediente.items && expediente.items.length > 0 ? (
            expediente.items.map(item => (
              <div key={item.id} className={`item ${item.completado ? 'completed' : ''}`}>
                <div className='item-checkbox'>
                  <input
                    type='checkbox'
                    checked={item.completado}
                    onChange={() => handleToggleItem(item.id)}
                    disabled={!isEditing}
                  />
                </div>
                <div className='item-content'>
                  <span className='item-text'>{item.contenido}</span>
                  {item.notas && <span className='item-notes'>{item.notas}</span>}
                </div>
                {isEditing && (
                  <button
                    className='btn-delete-item'
                    onClick={() => handleDeleteItem(item.id)}
                    title='Eliminar'
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className='empty-items'>
              <p>No hay items. Agrega uno para comenzar.</p>
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
