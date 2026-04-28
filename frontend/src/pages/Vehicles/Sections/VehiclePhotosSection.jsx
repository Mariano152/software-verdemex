import { useEffect, useState } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehiclePhotosSection.css';

const PHOTO_TYPES = [
  { id: 'frente', nombre: 'Frente' },
  { id: 'parte_trasera', nombre: 'Parte trasera' },
  { id: 'lado_piloto', nombre: 'Lado piloto' },
  { id: 'lado_copiloto', nombre: 'Lado copiloto' },
  { id: 'senales_y_luces', nombre: 'Senales y luces' },
  { id: 'estrobos', nombre: 'Estrobos' },
  { id: 'extintor', nombre: 'Extintor' },
  { id: 'rotulacion', nombre: 'Rotulacion' },
  { id: 'torreta', nombre: 'Torreta' },
  { id: 'proteccion_antiderrames', nombre: 'Proteccion antiderrames' },
  { id: 'equipo_comunicacion', nombre: 'Equipo de comunicacion' },
  { id: 'arnes_y_conectores', nombre: 'Arnes y conectores' },
  { id: 'equipo_proteccion_personal', nombre: 'Equipo de proteccion' }
];

export default function VehiclePhotosSection({
  photos = [],
  onSave,
  onCancel,
  onBack
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPhotos, setEditedPhotos] = useState(photos);
  const [deletedPhotoTypes, setDeletedPhotoTypes] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setEditedPhotos(photos);
    setDeletedPhotoTypes([]);
  }, [photos]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPhotos(photos);
    setDeletedPhotoTypes([]);
    onCancel?.();
  };

  const handlePhotoDescriptionChange = (photoId, description) => {
    setEditedPhotos((currentPhotos) => currentPhotos.map((photo) => (
      photo.id === photoId
        ? { ...photo, descripcion: description }
        : photo
    )));
  };

  const handlePhotoUpload = async (event, photoType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const existingPhoto = editedPhotos.find((photo) => photo.tipo_foto === photoType);
      const reader = new FileReader();

      reader.onload = (loadEvent) => {
        const newPhoto = {
          id: existingPhoto?.id || Date.now(),
          tipo_foto: photoType,
          archivo_url: loadEvent.target?.result,
          descripcion: existingPhoto?.descripcion || '',
          isNew: true
        };

        setDeletedPhotoTypes((currentTypes) => currentTypes.filter((type) => type !== photoType));
        setEditedPhotos((currentPhotos) => {
          const hasExistingPhoto = currentPhotos.some((photo) => photo.tipo_foto === photoType);

          if (hasExistingPhoto) {
            return currentPhotos.map((photo) => (
              photo.tipo_foto === photoType ? newPhoto : photo
            ));
          }

          return [...currentPhotos, newPhoto];
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar la foto'
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemovePhoto = (photo) => {
    if (!photo) return;

    if (!photo.isNew) {
      setDeletedPhotoTypes((currentTypes) => (
        currentTypes.includes(photo.tipo_foto)
          ? currentTypes
          : [...currentTypes, photo.tipo_foto]
      ));
    }

    setEditedPhotos((currentPhotos) => currentPhotos.filter((item) => item.id !== photo.id));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave?.(editedPhotos, deletedPhotoTypes);
      setNotification({
        type: 'success',
        title: 'Exito',
        message: 'Fotografias guardadas correctamente'
      });
      setIsEditing(false);
      setDeletedPhotoTypes([]);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Error al guardar fotografias'
      });
    } finally {
      setLoading(false);
    }
  };

  const completed = editedPhotos.length;

  return (
    <div className="photos-section">
      <div className="section-header photos-header">
        <div className="header-content">
          <button className="btn-back" onClick={onBack}>Volver</button>
          <div>
            <h2>Fotografias del vehiculo</h2>
            <p className="progress-text">{completed}/13 fotografias capturadas</p>
          </div>
        </div>
        {!isEditing ? (
          <button className="btn-edit" onClick={handleEdit}>Editar</button>
        ) : (
          <div className="header-actions">
            <button className="btn-cancel" onClick={handleCancel}>Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(completed / 13) * 100}%` }}></div>
        </div>
        <p className="progress-label">{Math.round((completed / 13) * 100)}% completado</p>
      </div>

      <div className="section-content">
        {isEditing ? (
          <div className="edit-mode">
            <div className="photos-upload-grid">
              {PHOTO_TYPES.map((type) => {
                const existingPhoto = editedPhotos.find((photo) => photo.tipo_foto === type.id);

                return (
                  <div key={type.id} className="photo-upload-card">
                    <div className="photo-preview-area">
                      {existingPhoto?.archivo_url ? (
                        <>
                          <img src={existingPhoto.archivo_url} alt={type.nombre} />
                          <button
                            className="btn-remove-photo"
                            onClick={() => handleRemovePhoto(existingPhoto)}
                            type="button"
                          >
                            x
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="upload-placeholder">
                            <span className="upload-icon">+</span>
                            <p className="upload-text">Seleccionar foto</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => handlePhotoUpload(event, type.id)}
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
                            placeholder="Agregar descripcion..."
                            value={existingPhoto.descripcion || ''}
                            onChange={(event) => handlePhotoDescriptionChange(existingPhoto.id, event.target.value)}
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
          <div className="read-mode">
            {editedPhotos.length > 0 ? (
              <div className="photos-grid">
                {PHOTO_TYPES.map((type) => {
                  const photo = editedPhotos.find((item) => item.tipo_foto === type.id);

                  return (
                    <div key={type.id} className={`photo-card ${photo ? 'has-photo' : 'empty-photo'}`}>
                      <div className="photo-preview">
                        {photo?.archivo_url ? (
                          <img src={photo.archivo_url} alt={type.nombre} />
                        ) : (
                          <div className="empty-placeholder">
                            <span>Sin foto</span>
                          </div>
                        )}
                      </div>
                      <div className="photo-details">
                        <h4>{type.nombre}</h4>
                        {photo?.descripcion && (
                          <p className="photo-description-text">{photo.descripcion}</p>
                        )}
                        {photo && (
                          <span className="photo-status">Capturada</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No hay fotografias registradas</p>
                <p className="subtitle">Haz clic en "Editar" para agregar fotos</p>
              </div>
            )}
          </div>
        )}
      </div>

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
