import { useState, useEffect } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehicleMaintenanceSection.css';

/**
 * VehicleMaintenanceSection - Gestión de elementos de seguridad y mantenimiento
 * Modo lectura por defecto, checkbox editable en modo edición
 */
export default function VehicleMaintenanceSection({
  vehicleId,
  safetyElements = [],
  onSave,
  onCancel,
  onBack
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedElements, setEditedElements] = useState(safetyElements);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEditedElements(safetyElements);
  }, [safetyElements]);

  const defaultElements = [
    { id: 1, nombre: 'Extintor', descripcion: 'Extintor de incendios visible y accesible' },
    { id: 2, nombre: 'Botiquín de Primeros Auxilios', descripcion: 'Kit completo de emergencia' },
    { id: 3, nombre: 'Señales de Tránsito', descripcion: 'Triángulos de seguridad y conos' },
    { id: 4, nombre: 'Espejos Retrovisores', descripcion: 'Todos los espejos en buen estado' },
    { id: 5, nombre: 'Llantas y Neumáticos', descripcion: 'Presión y desgaste adecuados' },
    { id: 6, nombre: 'Frenos', descripcion: 'Sistema de frenos funcionando correctamente' },
    { id: 7, nombre: 'Iluminación', descripcion: 'Faros, calaveras y luces interiores' },
    { id: 8, nombre: 'Limpiadores de Parabrisas', descripcion: 'Funcionando y con líquido' },
    { id: 9, nombre: 'Cinturones de Seguridad', descripcion: 'Todos funcionales y seguros' },
    { id: 10, nombre: 'Airbags', descripcion: 'Sistemas de protección activos' },
    { id: 11, nombre: 'Dirección Hidráulica', descripcion: 'Funcionando sin problemas' }
  ];

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedElements(safetyElements);
    onCancel?.();
  };

  const handleElementChange = (elementId, field, value) => {
    setEditedElements(editedElements.map(elem =>
      elem.elemento_seguridad_id === elementId
        ? { ...elem, [field]: value }
        : elem
    ));
  };

  const toggleElement = (elementId) => {
    const existing = editedElements.find(e => e.elemento_seguridad_id === elementId);
    if (existing) {
      setEditedElements(editedElements.filter(e => e.elemento_seguridad_id !== elementId));
    } else {
      setEditedElements([
        ...editedElements,
        {
          elemento_seguridad_id: elementId,
          estatus: 'si',
          observaciones: ''
        }
      ]);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave?.(editedElements);
      setNotification({
        type: 'success',
        title: '✓ Éxito',
        message: 'Elementos de seguridad guardados correctamente'
      });
      setIsEditing(false);
    } catch (error) {
      setNotification({
        type: 'error',
        title: '✗ Error',
        message: error.message || 'Error al guardar elementos'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'si': return '✅';
      case 'no': return '❌';
      case 'no_aplica': return '⚪';
      default: return '❓';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'si': return 'Disponible';
      case 'no': return 'No Disponible';
      case 'no_aplica': return 'No Aplica';
      default: return status;
    }
  };

  const completed = editedElements.length;

  return (
    <div className="maintenance-section">
      {/* HEADER */}
      <div className="section-header maintenance-header">
        <div className="header-content">
          <button className="btn-back" onClick={onBack}>← Volver</button>
          <div>
            <h2>🔧 Elementos de Seguridad y Mantenimiento</h2>
            <p className="progress-text">{completed}/11 elementos completados</p>
          </div>
        </div>
        {!isEditing ? (
          <button className="btn-edit" onClick={handleEdit}>✏️ Editar</button>
        ) : (
          <div className="header-actions">
            <button className="btn-cancel" onClick={handleCancel}>❌ Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={loading}>
              {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        )}
      </div>

      {/* PROGRESS BAR */}
      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-fill" style={{width: `${(completed / 11) * 100}%`}}></div>
        </div>
        <p className="progress-label">{Math.round((completed / 11) * 100)}% Completado</p>
      </div>

      {/* CONTENIDO */}
      <div className="section-content">
        <div className="elements-grid">
          {defaultElements.map(element => {
            const existing = editedElements.find(e => e.elemento_seguridad_id === element.id);

            return (
              <div
                key={element.id}
                className={`element-card ${existing ? 'checked' : 'unchecked'}`}
              >
                <div className="element-header">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={!!existing}
                      onChange={() => toggleElement(element.id)}
                      className="element-checkbox"
                    />
                  ) : (
                    <span className="element-status-icon">
                      {existing ? getStatusIcon(existing.estatus) : '⚪'}
                    </span>
                  )}
                  <div className="element-title">
                    <h3>{element.nombre}</h3>
                    <p>{element.descripcion}</p>
                  </div>
                </div>

                {isEditing && existing && (
                  <div className="element-edit">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Estado</label>
                        <select
                          value={existing.estatus || 'si'}
                          onChange={(e) => handleElementChange(element.id, 'estatus', e.target.value)}
                        >
                          <option value="si">✅ Disponible</option>
                          <option value="no">❌ No Disponible</option>
                          <option value="no_aplica">⚪ No Aplica</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group full">
                        <label>Observaciones</label>
                        <textarea
                          placeholder="Ej: Necesita mantenimiento, dañado, etc."
                          value={existing.observaciones || ''}
                          onChange={(e) => handleElementChange(element.id, 'observaciones', e.target.value)}
                          rows="2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!isEditing && existing && existing.observaciones && (
                  <div className="element-obs">
                    <p>📝 {existing.observaciones}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* NOTIFICACIÓN */}
      {notification && (
        <NotificationModal
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
