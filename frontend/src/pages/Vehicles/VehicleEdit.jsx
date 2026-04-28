import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import VehicleDetailView from './VehicleDetailView';
import VehicleDocumentsSection from './Sections/VehicleDocumentsSection';
import VehicleMaintenanceSection from './Sections/VehicleMaintenanceSection';
import VehiclePhotosSection from './Sections/VehiclePhotosSection';
import NotificationModal from '../../components/Notifications/NotificationModal';
import '../../components/Notifications/NotificationModal.css';
import './VehicleEdit.css';

/**
 * VehicleEdit - Página principal de edición de vehículos
 * Muestra VehicleDetailView por defecto
 * Permite navegación a secciones específicas (Documentos, Mantenimiento, Fotos)
 */
export default function VehicleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Cargar datos del vehículo desde API
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`/api/vehicles/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Error al obtener vehículo');
        }

        const data = await response.json();
        setVehicle(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching vehicle:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVehicle();
    }
  }, [id]);

  const handleDocumentsSave = async (documents) => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('📤 Guardando documentos en backend...', { documents, id });
      
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documents })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar documentos');
      }

      const updated = await response.json();
      console.log('✅ Backend retornó vehículo actualizado:', updated);
      
      // Actualizar el estado del vehículo con la respuesta del backend
      setVehicle(updated);
      
      // Mostrar notificación de éxito
      setNotification({
        type: 'success',
        title: '✓ Éxito',
        message: 'Documentos guardados correctamente'
      });
    } catch (err) {
      console.error('❌ Error:', err);
      throw new Error(err.message);
    }
  };

  const handleMaintenanceSave = async (safetyElements, vehicleState) => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('📤 Guardando mantenimiento y estado...', { safetyElements, vehicleState });
      
      const response = await fetch(`/api/vehicles/${id}/safety-elements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ safetyElements, estado: vehicleState })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al guardar mantenimiento');
      }

      const savedData = await response.json();
      console.log('✅ Mantenimiento y estado guardados:', savedData);
      setVehicle((prev) => ({
        ...prev,
        estado: savedData.vehicleStatus || vehicleState,
        safetyElements: savedData.safetyElements || []
      }));
      
      setNotification({
        type: 'success',
        title: '✓ Éxito',
        message: 'Mantenimiento y estado guardados correctamente'
      });
    } catch (err) {
      console.error('❌ Error al guardar mantenimiento:', err);
      throw new Error(err.message);
    }
  };

  const handleCreateMaintenanceRecord = async (formData, files = []) => {
    const token = localStorage.getItem('authToken');
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });

    files.forEach((file) => {
      payload.append('documento', file);
    });

    const response = await fetch(`/api/vehicles/${id}/maintenance-records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al crear mantenimiento');
    }

    const savedRecord = responseData.maintenanceRecord;
    setVehicle((prev) => ({
      ...prev,
      maintenanceRecords: [savedRecord, ...(prev?.maintenanceRecords || [])]
    }));

    return savedRecord;
  };

  const handleUpdateMaintenanceRecord = async (recordId, formData, files = []) => {
    const token = localStorage.getItem('authToken');
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });

    files.forEach((file) => {
      payload.append('documento', file);
    });

    const response = await fetch(`/api/vehicles/${id}/maintenance-records/${recordId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al actualizar mantenimiento');
    }

    const savedRecord = responseData.maintenanceRecord;
    setVehicle((prev) => ({
      ...prev,
      maintenanceRecords: (prev?.maintenanceRecords || []).map((record) =>
        record.id === savedRecord.id ? savedRecord : record
      )
    }));

    return savedRecord;
  };

  const handleDeleteMaintenanceRecord = async (recordId) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/vehicles/${id}/maintenance-records/${recordId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al eliminar mantenimiento');
    }

    setVehicle((prev) => ({
      ...prev,
      maintenanceRecords: (prev?.maintenanceRecords || []).filter((record) => record.id !== recordId)
    }));
  };

  const handlePhotosSave = async (photos, deletedPhotoTypes = []) => {
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();

      formData.append('deletedPhotos', JSON.stringify(deletedPhotoTypes));

      photos.forEach((photo) => {
        formData.append(`descripcion_${photo.tipo_foto}`, photo.descripcion || '');
      });
      
      // Procesar fotos nuevas
      for (const photo of photos) {
        if (photo.isNew && photo.archivo_url && typeof photo.archivo_url === 'string' && photo.archivo_url.startsWith('data:')) {
          // Convertir data URL a blob
          const response = await fetch(photo.archivo_url);
          const blob = await response.blob();
          const extension = blob.type.split('/')[1] || 'jpg';
          formData.append(photo.tipo_foto, blob, `${photo.tipo_foto}.${extension}`);
        }
      }

      const responseUpdate = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!responseUpdate.ok) throw new Error('Error al guardar fotos');

      const updated = await responseUpdate.json();
      setVehicle(updated);
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const handleDocumentSaved = (savedDocument) => {
    if (!savedDocument?.id) return;

    setVehicle((prev) => {
      if (!prev) return prev;

      const currentDocs = prev.documents || [];
      const exists = currentDocs.some((doc) => doc.id === savedDocument.id);

      const nextDocs = exists
        ? currentDocs.map((doc) => (doc.id === savedDocument.id ? { ...doc, ...savedDocument } : doc))
        : [...currentDocs, savedDocument];

      return {
        ...prev,
        documents: nextDocs
      };
    });
  };

  if (loading) {
    return (
      <div className="edit-loading">
        <div className="spinner"></div>
        <p>⏳ Cargando vehículo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="edit-error">
        <div className="error-box">
          <p className="error-message">❌ Error: {error}</p>
          <div className="error-actions">
            <button onClick={() => navigate('/vehicles')} className="btn btn-secondary">
              Volver al listado
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="edit-error">
        <div className="error-box">
          <p className="error-message">❌ Vehículo no encontrado</p>
          <button onClick={() => navigate('/vehicles')} className="btn btn-secondary">
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicle-edit-page">
      {/* HEADER GLOBAL */}
      <div className="edit-page-header">
        <button className="btn-back-main" onClick={() => {
          if (activeSection) {
            setActiveSection(null);
          } else {
            navigate('/vehicles');
          }
        }}>
          ← Volver
        </button>
        <div>
          <h1>🚗 {vehicle.placa}</h1>
          <p className="owner-info">Propietario: {vehicle.propietario_nombre}</p>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="edit-page-content">
        {activeSection === null ? (
          // VISTA PRINCIPAL - DETALLES
          <VehicleDetailView
            vehicle={vehicle}
            vehicleId={id}
            onDocumentsClick={() => setActiveSection('documents')}
            onMaintenanceClick={() => setActiveSection('maintenance')}
            onPhotosClick={() => setActiveSection('photos')}
          />
        ) : activeSection === 'documents' ? (
          // SECCIÓN DOCUMENTOS
          <VehicleDocumentsSection
            vehicleId={id}
            documents={vehicle.documents || []}
            onSave={handleDocumentsSave}
            onDocumentSaved={handleDocumentSaved}
            onCancel={() => setActiveSection(null)}
            onBack={() => setActiveSection(null)}
          />
        ) : activeSection === 'maintenance' ? (
          // SECCIÓN MANTENIMIENTO
          <VehicleMaintenanceSection
            vehicleId={id}
            maintenanceRecords={vehicle.maintenanceRecords || []}
            safetyElements={vehicle.safetyElements || []}
            vehicleStatus={vehicle.estado || 'activo'}
            onSaveSafety={handleMaintenanceSave}
            onCreateMaintenanceRecord={handleCreateMaintenanceRecord}
            onUpdateMaintenanceRecord={handleUpdateMaintenanceRecord}
            onDeleteMaintenanceRecord={handleDeleteMaintenanceRecord}
            onCancel={() => setActiveSection(null)}
            onBack={() => setActiveSection(null)}
          />
        ) : activeSection === 'photos' ? (
          // SECCIÓN FOTOS
          <VehiclePhotosSection
            vehicleId={id}
            photos={vehicle.photos || []}
            onSave={handlePhotosSave}
            onCancel={() => setActiveSection(null)}
            onBack={() => setActiveSection(null)}
          />
        ) : null}
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
