import { useState, useEffect } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehicleMaintenanceSection.css';

export default function VehicleMaintenanceSection({
  vehicleId,
  safetyElements = [],
  vehicleStatus = 'activo',
  onSave,
  onCancel,
  onBack
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedElements, setEditedElements] = useState(safetyElements);
  const [vehicleState, setVehicleState] = useState(vehicleStatus);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEditedElements(safetyElements);
    setVehicleState(vehicleStatus);
  }, [safetyElements, vehicleStatus]);

  const defaultElements = [
    { id: 1, nombre: 'Extintor', icon: '🔥' },
    { id: 2, nombre: 'Botiquín', icon: '⚕️' },
    { id: 3, nombre: 'Señales', icon: '🔺' },
    { id: 4, nombre: 'Espejos', icon: '🪞' },
    { id: 5, nombre: 'Llantas', icon: '🛞' },
    { id: 6, nombre: 'Frenos', icon: '⏹️' },
    { id: 7, nombre: 'Iluminación', icon: '💡' },
    { id: 8, nombre: 'Limpiadores', icon: '💦' },
    { id: 9, nombre: 'Cinturones', icon: '🪑' },
    { id: 10, nombre: 'Airbags', icon: '💨' },
    { id: 11, nombre: 'Dirección', icon: '🎯' }
  ];

  const getStatusIcon = (status) => {
    if (status === 'correcto') return '✅';
    if (status === 'incorrecto') return '❌';
    if (status === 'no_aplica') return '⚪';
    return '❓';
  };

  const getStatusLabel = (status) => {
    if (status === 'correcto') return 'Correcto';
    if (status === 'incorrecto') return 'Incorrecto';
    if (status === 'no_aplica') return 'No Aplica';
    return status;
  };

  const getStateColor = (state) => {
    if (state === 'activo') return '#27ae60';
    if (state === 'inactivo') return '#95a5a6';
    if (state === 'en_mantenimiento') return '#f39c12';
    return '#3498db';
  };

  const getStateLabel = (state) => {
    if (state === 'activo') return '🟢 Activo';
    if (state === 'inactivo') return '⚫ Inactivo';
    if (state === 'en_mantenimiento') return '🔧 Mantenimiento';
    return state;
  };

  const calculateProgress = () => {
    const correctCount = editedElements.filter(e => 
      e.estatus === 'correcto' || e.estatus === 'no_aplica'
    ).length;
    const percentage = Math.round((correctCount / defaultElements.length) * 100);
    const details = {
      correcto: editedElements.filter(e => e.estatus === 'correcto').length,
      incorrecto: editedElements.filter(e => e.estatus === 'incorrecto').length,
      no_aplica: editedElements.filter(e => e.estatus === 'no_aplica').length,
      no_registrados: defaultElements.length - editedElements.length
    };
    return { percentage, details };
  };

  const { percentage, details } = calculateProgress();

  const handleSave = async () => {
    try {
      setLoading(true);
      console.log('📤 Guardando:', { editedElements, vehicleState });
      
      // Limpiar datos: solo enviar campos necesarios
      const cleanedElements = editedElements.map(e => ({
        elemento_seguridad_id: e.elemento_seguridad_id,
        estatus: e.estatus,
        observaciones: e.observaciones || ''
      }));
      
      await onSave(cleanedElements, vehicleState);
      
      setNotification({
        type: 'success',
        title: '✓ Éxito',
        message: 'Elementos y estado guardados correctamente'
      });
      setIsEditing(false);
      setTimeout(() => setNotification(null), 2500);
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        title: '✗ Error',
        message: error.message || 'Error al guardar'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleElementChange = (elementId, status) => {
    const existing = editedElements.find(e => e.elemento_seguridad_id === elementId);
    
    if (existing && existing.estatus === status) {
      // Desmarcar
      setEditedElements(editedElements.filter(e => e.elemento_seguridad_id !== elementId));
    } else if (existing) {
      // Cambiar estado
      setEditedElements(editedElements.map(e =>
        e.elemento_seguridad_id === elementId ? { ...e, estatus: status } : e
      ));
    } else {
      // Agregar nuevo
      setEditedElements([...editedElements, {
        elemento_seguridad_id: elementId,
        estatus: status,
        observaciones: ''
      }]);
    }
  };

  return (
    <div className='maintenance-section'>
      <div className='section-header'>
        <div className='header-left'>
          <button className='btn-back' onClick={onBack}>← Volver</button>
          <div className='header-info'>
            <h2>🔧 Seguridad y Mantenimiento</h2>
            <div className='compact-stats'>
              <span className='stat-item'>✅ {details.correcto}</span>
              <span className='stat-item'>❌ {details.incorrecto}</span>
              <span className='stat-item'>⚪ {details.no_aplica}</span>
              <span className='stat-item'>📝 {details.no_registrados}</span>
            </div>
          </div>
        </div>
        <div className='header-right'>
          {!isEditing ? (
            <button className='btn-edit' onClick={() => setIsEditing(true)}>✏️ Editar</button>
          ) : (
            <div className='header-actions'>
              <button className='btn-cancel' onClick={() => { setIsEditing(false); onCancel?.(); }}>❌ Cancelar</button>
              <button className='btn-save' onClick={handleSave} disabled={loading}>
                {loading ? '⏳...' : '💾 Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className='progress-section'>
        <div className='progress-bar-wrapper'>
          <div className='progress-label-top'>
            <span>Cumplimiento General</span>
            <span className='percentage-big'>{percentage}%</span>
          </div>
          <div className='progress-bar'>
            <div className='progress-fill' style={{width: `${percentage}%`}}></div>
          </div>
          <div className='progress-description'>
            {percentage < 30 && <span className='status-low'>Requiere mucha atención</span>}
            {percentage >= 30 && percentage < 60 && <span className='status-medium'>Necesita mejoras</span>}
            {percentage >= 60 && percentage < 90 && <span className='status-good'>Buen estado</span>}
            {percentage >= 90 && <span className='status-excellent'>Excelente cumplimiento</span>}
          </div>
        </div>
      </div>

      <div className='state-section'>
        <div className='state-container'>
          <h3>Estado del Vehículo</h3>
          {isEditing ? (
            <div className='state-buttons-group'>
              <button className={`state-btn ${vehicleState === 'activo' ? 'active' : ''}`} onClick={() => setVehicleState('activo')}>
                <span className='state-icon'>🟢</span>
                <span className='state-text'>Activo</span>
              </button>
              <button className={`state-btn ${vehicleState === 'inactivo' ? 'active' : ''}`} onClick={() => setVehicleState('inactivo')}>
                <span className='state-icon'>⚫</span>
                <span className='state-text'>Inactivo</span>
              </button>
              <button className={`state-btn ${vehicleState === 'en_mantenimiento' ? 'active' : ''}`} onClick={() => setVehicleState('en_mantenimiento')}>
                <span className='state-icon'>🔧</span>
                <span className='state-text'>Mantenimiento</span>
              </button>
            </div>
          ) : (
            <div className='state-badge' style={{ backgroundColor: getStateColor(vehicleState) + '22', borderColor: getStateColor(vehicleState) }}>
              {getStateLabel(vehicleState)}
            </div>
          )}
        </div>
      </div>

      <div className='elements-section'>
        <h3>Elementos de Seguridad</h3>
        <div className='elements-grid'>
          {defaultElements.map(element => {
            const existing = editedElements.find(e => e.elemento_seguridad_id === element.id);
            return (
              <div key={element.id} className={`element-card ${isEditing ? 'editing' : 'viewing'} ${existing ? `status-${existing.estatus}` : 'status-empty'}`}>
                {isEditing ? (
                  <div className='element-edit-mode'>
                    <div className='element-header-edit'>
                      <span className='element-icon'>{element.icon}</span>
                      <span className='element-name-edit'>{element.nombre}</span>
                      {existing && <span className='edit-label'>EDITANDO</span>}
                    </div>
                    <div className='element-buttons-edit'>
                      <button className={`edit-btn ${existing?.estatus === 'correcto' ? 'active' : ''}`} onClick={() => handleElementChange(element.id, 'correcto')} title='Correcto'>✅</button>
                      <button className={`edit-btn ${existing?.estatus === 'incorrecto' ? 'active' : ''}`} onClick={() => handleElementChange(element.id, 'incorrecto')} title='Incorrecto'>❌</button>
                      <button className={`edit-btn ${existing?.estatus === 'no_aplica' ? 'active' : ''}`} onClick={() => handleElementChange(element.id, 'no_aplica')} title='No Aplica'>⚪</button>
                    </div>
                  </div>
                ) : (
                  <div className='element-view-mode'>
                    <span className='element-big-icon'>{element.icon}</span>
                    <span className='element-name-view'>{element.nombre}</span>
                    {existing && <span className='status-display'>{getStatusIcon(existing.estatus)} {getStatusLabel(existing.estatus)}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <NotificationModal isOpen={!!notification} type={notification?.type} title={notification?.title} message={notification?.message} onClose={() => setNotification(null)} />
    </div>
  );
}
