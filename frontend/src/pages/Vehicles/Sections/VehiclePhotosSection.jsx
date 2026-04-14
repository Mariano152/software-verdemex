import { useState, useEffect } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehiclePhotosSection.css';

/**
 * VehiclePhotosSection - Gestión de fotografías del vehículo
 * Modo lectura por defecto, edición con carga de archivos
 */
export default function VehiclePhotosSection({
  vehicleId,
  photos = [],
  onSave,
  onCancel,
  onBack
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPhotos, setEditedPhotos] = useState(photos);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setEditedPhotos(photos);
  }, [photos]);

  const photoTypes = [
    { id: 'frente', nombre: 'Frente', emoji: '🚗' },
    { id: 'parte_trasera', nombre: 'Parte Trasera', emoji: '🚗' },
    { id: 'lado_piloto', nombre: 'Lado Piloto', emoji: '🚗' },
    { id: 'lado_copiloto', nombre: 'Lado Copiloto', emoji: '🚗' },
    { id: 'senales_y_luces', nombre: 'Señales y Luces', emoji: '💡' },
    { id: 'estrobos', nombre: 'Estrobos', emoji: '🚨' },
    { id: 'extintor', nombre: 'Extintor', emoji: '🧯' },
    { id: 'rotulacion', nombre: 'Rotulación', emoji: '🔤' },
    { id: 'torreta', nombre: 'Torreta', emoji: '📡' },
    { id: 'proteccion_antiderrames', nombre: 'Protección Antiderrames', emoji: '🛡️' },
    { id: 'equipo_comunicacion', nombre: 'Equipo de Comunicación', emoji: '📻' },
    { id: 'arnes_y_conectores', nombre: 'Arnés y Conectores', emoji: '⚡' },
    { id: 'equipo_proteccion_personal', nombre: 'Equipo de Protección', emoji: '🦺' }
  ];

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPhotos(photos);
    onCancel?.();
  };

  const handlePhotoDescriptionChange = (photoId, description) => {
    setEditedPhotos(editedPhotos.map(photo =>
      photo.id === photoId
        ? { ...photo, descripcion: description }
        : photo
    ));
  };

  const handlePhotoUpload = async (e, photoType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // Aquí se subiría a Cloudinary en el caso real
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto = {
          id: Date.now(),
          tipo_foto: photoType,
          archivo_url: event.target.result,
          descripcion: '',
          isNew: true
        };

        const existing = editedPhotos.find(p => p.tipo_foto === photoType);
        if (existing) {
          setEditedPhotos(editedPhotos.map(p =>
            p.tipo_foto === photoType ? newPhoto : p
          ));
        } else {
          setEditedPhotos([...editedPhotos, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setNotification({
        type: 'error',
        title: '✗ Error',
        message: 'Error al cargar la foto'
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (photoId) => {
    setEditedPhotos(editedPhotos.filter(p => p.id !== photoId));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave?.(editedPhotos);
      setNotification({
        type: 'success',
        title: '✓ Éxito',
        message: 'Fotografías guardadas correctamente'
      });
      setIsEditing(false);
    } catch (error) {
      setNotification({
        type: 'error',
        title: '✗ Error',
        message: error.message || 'Error al guardar fotografías'
      });
    } finally {
      setLoading(false);
    }
  };

  const completed = editedPhotos.length;

  return (
    <div className="photos-section">
      {/* HEADER */}
      <div className="section-header photos-header">
        <div className="header-content">
          <button className="btn-back" onClick={onBack}>← Volver</button>
          <div>
            <h2>📸 Fotografías del Vehículo</h2>
            <p className="progress-text">{completed}/13 fotografías capturadas</p>
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

      {/* PROGRESS */}
      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-fill" style={{width: `${(completed / 13) * 100}%`}}></div>
        </div>
        <p className="progress-label">{Math.round((completed / 13) * 100)}% Completado</p>
      </div>

      {/* CONTENIDO */}
      <div className="section-content">
        {isEditing ? (
          // MODO EDICIÓN
          <div className="edit-mode">
            <div className="photos-upload-grid">
              {photoTypes.map(type => {
                const existingPhoto = editedPhotos.find(p => p.tipo_foto === type.id);

                return (
                  <div key={type.id} className="photo-upload-card">
                    <div className="photo-preview-area">
                      {existingPhoto?.archivo_url ? (
                        <>
                          <img src={existingPhoto.archivo_url} alt={type.nombre} />
                          <button
                            className="btn-remove-photo"
                            onClick={() => handleRemovePhoto(existingPhoto.id)}
                            type="button"
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="upload-placeholder">
                            <span className="upload-icon">{type.emoji}</span>
                            <p className="upload-text">Seleccionar foto</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, type.id)}
                            disabled={uploading}
                            className="file-input"
                          />
                        </>
                      )}
                    </div>

                    <div className="photo-info">
                      <h4>{type.nombre}</h4>
                      {existingPhoto && (
                        <div className="photo-description">
                          <textarea
                            placeholder="Agregar descripción..."
                            value={existingPhoto.descripcion || ''}
                            onChange={(e) => handlePhotoDescriptionChange(existingPhoto.id, e.target.value)}
                            rows="2"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // MODO LECTURA
          <div className="read-mode">
            {editedPhotos.length > 0 ? (
              <div className="photos-grid">
                {photoTypes.map(type => {
                  const photo = editedPhotos.find(p => p.tipo_foto === type.id);

                  return (
                    <div key={type.id} className={`photo-card ${photo ? 'has-photo' : 'empty-photo'}`}>
                      <div className="photo-preview">
                        {photo?.archivo_url ? (
                          <img src={photo.archivo_url} alt={type.nombre} />
                        ) : (
                          <div className="empty-placeholder">
                            <span>{type.emoji}</span>
                          </div>
                        )}
                      </div>
                      <div className="photo-details">
                        <h4>{type.nombre}</h4>
                        {photo?.descripcion && (
                          <p className="photo-description-text">{photo.descripcion}</p>
                        )}
                        {photo && (
                          <span className="photo-status">✓ Capturada</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>📸 No hay fotografías registradas</p>
                <p className="subtitle">Haz clic en "Editar" para agregar fotos</p>
              </div>
            )}
          </div>
        )}
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
