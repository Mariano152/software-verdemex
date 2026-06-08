import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import VehicleDetailView from './VehicleDetailView';
import VehicleDocumentsSection from './Sections/VehicleDocumentsSection';
import VehicleMaintenanceSection from './Sections/VehicleMaintenanceSection';
import VehicleGasolineSection from './Sections/VehicleGasolineSection';
import VehiclePhotosSection from './Sections/VehiclePhotosSection';
import VehicleParametersSection from './Sections/VehicleParametersSection';
import NotificationModal from '../../components/Notifications/NotificationModal';
import { VEHICLE_TYPE_OPTIONS } from '../../constants/vehicleTypes';
import { getVehicleIdentifier, getVehicleSecondaryLabel } from '../../utils/vehicleLabels';
import '../../components/Notifications/NotificationModal.css';
import './VehicleEdit.css';

const GASOLINE_RECORDS_UPDATED_EVENT = 'gasoline-records-updated';
const GASOLINE_RECORDS_UPDATED_STORAGE_KEY = 'gasoline-records-updated-at';

/**
 * VehicleEdit - Pagina principal de edicion de vehiculos
 * Muestra VehicleDetailView por defecto
 * Permite navegacion a secciones especificas (Documentos, Mantenimiento, Fotos)
 */
export default function VehicleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vehicle, setVehicle] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [basicInfoSaving, setBasicInfoSaving] = useState(false);
  const [vehicleDeleting, setVehicleDeleting] = useState(false);
  const [basicInfoForm, setBasicInfoForm] = useState({
    numero_economico: '',
    tipo_carro: '',
    propietario_nombre: '',
    placa: '',
    numero_serie: '',
    marca: '',
    modelo: '',
    color: '',
    capacidad_kg: '',
    descripcion: ''
  });
  const contentRef = useRef(null);
  const requestedSection = searchParams.get('section');
  const requestedDocumentId = searchParams.get('documentId');
  const requestedMaintenanceId = searchParams.get('maintenanceId');
  const requestedGasolineId = searchParams.get('gasolineId');


  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');

        const response = await fetch(`/api/vehicles/${id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Error al obtener vehículo');
        }

        const data = await response.json();
        setVehicle(data);
        setBasicInfoForm({
          numero_economico: data.numero_economico || '',
          tipo_carro: data.tipo_carro || '',
          propietario_nombre: data.propietario_nombre || '',
          placa: data.placa || '',
          numero_serie: data.numero_serie || '',
          marca: data.marca || '',
          modelo: data.modelo || '',
          color: data.color || '',
          capacidad_kg: data.capacidad_kg || '',
          descripcion: data.descripcion || ''
        });
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

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(requestedSection);
  }, [requestedSection]);

  useEffect(() => {
    if (!activeSection) return undefined;

    const scrollToSectionContent = () => {
      contentRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
      window.scrollBy({ top: -8, left: 0, behavior: 'auto' });
    };

    const frameId = window.requestAnimationFrame(scrollToSectionContent);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeSection]);

  const handleDocumentsSave = async (documents) => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documents })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar documentos');
      }

      const updated = await response.json();
      setVehicle(updated);

      setNotification({
        type: 'success',
        title: 'Éxito',
        message: 'Documentos guardados correctamente'
      });
    } catch (err) {
      console.error('Error:', err);
      throw new Error(err.message);
    }
  };

  const handleMaintenanceSave = async (safetyElements, vehicleState) => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/vehicles/${id}/safety-elements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ safetyElements, estado: vehicleState })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al guardar mantenimiento');
      }

      const savedData = await response.json();
      setVehicle((prev) => ({
        ...prev,
        estado: savedData.vehicleStatus || vehicleState,
        safetyElements: savedData.safetyElements || []
      }));

      setNotification({
        type: 'success',
        title: 'Éxito',
        message: 'Mantenimiento y estado guardados correctamente'
      });
    } catch (err) {
      console.error('Error al guardar mantenimiento:', err);
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

  const handleCreateGasolineRecord = async (formData, files = []) => {
    const token = localStorage.getItem('authToken');
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });

    files.forEach((file) => {
      payload.append('documento', file);
    });

    const response = await fetch(`/api/vehicles/${id}/gasoline-records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al crear registro de gasolina');
    }

    const savedRecord = responseData.gasolineRecord;
    setVehicle((prev) => ({
      ...prev,
      gasolineRecords: [savedRecord, ...(prev?.gasolineRecords || [])]
    }));
    window.dispatchEvent(new CustomEvent(GASOLINE_RECORDS_UPDATED_EVENT));
    localStorage.setItem(GASOLINE_RECORDS_UPDATED_STORAGE_KEY, String(Date.now()));

    return savedRecord;
  };

  const handleUpdateGasolineRecord = async (recordId, formData, files = []) => {
    const token = localStorage.getItem('authToken');
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });

    files.forEach((file) => {
      payload.append('documento', file);
    });

    const response = await fetch(`/api/vehicles/${id}/gasoline-records/${recordId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al actualizar registro de gasolina');
    }

    const savedRecord = responseData.gasolineRecord;
    setVehicle((prev) => ({
      ...prev,
      gasolineRecords: (prev?.gasolineRecords || []).map((record) =>
        record.id === savedRecord.id ? savedRecord : record
      )
    }));
    window.dispatchEvent(new CustomEvent(GASOLINE_RECORDS_UPDATED_EVENT));
    localStorage.setItem(GASOLINE_RECORDS_UPDATED_STORAGE_KEY, String(Date.now()));

    return savedRecord;
  };

  const handleDeleteGasolineRecord = async (recordId) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/vehicles/${id}/gasoline-records/${recordId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al eliminar registro de gasolina');
    }

    setVehicle((prev) => ({
      ...prev,
      gasolineRecords: (prev?.gasolineRecords || []).filter((record) => record.id !== recordId)
    }));
    window.dispatchEvent(new CustomEvent(GASOLINE_RECORDS_UPDATED_EVENT));
    localStorage.setItem(GASOLINE_RECORDS_UPDATED_STORAGE_KEY, String(Date.now()));
  };

  const handlePhotosSave = async (photos, deletedPhotoTypes = []) => {
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();

      formData.append('deletedPhotos', JSON.stringify(deletedPhotoTypes));

      photos.forEach((photo) => {
        formData.append(`descripcion_${photo.tipo_foto}`, photo.descripcion || '');
      });

      for (const photo of photos) {
        if (photo.isNew && photo.archivo_url && typeof photo.archivo_url === 'string' && photo.archivo_url.startsWith('data:')) {
          const response = await fetch(photo.archivo_url);
          const blob = await response.blob();
          const extension = blob.type.split('/')[1] || 'jpg';
          formData.append(photo.tipo_foto, blob, `${photo.tipo_foto}.${extension}`);
        }
      }

      const responseUpdate = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
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

  const handleSaveParameters = async (formData) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/vehicles/${id}/parameters`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al guardar parametros operativos');
    }

    setVehicle((prev) => ({
      ...prev,
      operationParameters: responseData.parameters || null
    }));

    setNotification({
      type: 'success',
      title: 'Éxito',
      message: responseData.message || 'Parametros operativos guardados correctamente'
    });

    return responseData.parameters || null;
  };

  const handleDocumentSaved = (savedDocument) => {
    if (!savedDocument?.id) return;

    setVehicle((prev) => {
      if (!prev) return prev;

      const currentDocs = prev.documents || [];

      if (savedDocument.deleted) {
        return {
          ...prev,
          documents: currentDocs.filter((doc) => doc.id !== savedDocument.id)
        };
      }

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

  const handleBasicInfoInputChange = (event) => {
    const { name, value } = event.target;
    setBasicInfoForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSaveBasicInfo = async () => {
    setBasicInfoSaving(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ basicInfo: basicInfoForm })
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.message || 'No se pudo actualizar el vehiculo');
      }

      setVehicle(responseData);
      setBasicInfoForm({
        numero_economico: responseData.numero_economico || '',
        tipo_carro: responseData.tipo_carro || '',
        propietario_nombre: responseData.propietario_nombre || '',
        placa: responseData.placa || '',
        numero_serie: responseData.numero_serie || '',
        marca: responseData.marca || '',
        modelo: responseData.modelo || '',
        color: responseData.color || '',
        capacidad_kg: responseData.capacidad_kg || '',
        descripcion: responseData.descripcion || ''
      });
      setIsEditingBasicInfo(false);
      setNotification({
        type: 'success',
        title: 'Exito',
        message: 'Datos del vehiculo actualizados correctamente'
      });
    } catch (saveError) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: saveError.message || 'No se pudo actualizar el vehiculo'
      });
    } finally {
      setBasicInfoSaving(false);
    }
  };

  const handleDeleteVehicle = async () => {
    const vehicleLabel = getVehicleIdentifier(vehicle) || vehicle?.placa || id;
    const confirmed = window.confirm(
      `Se eliminara el vehiculo ${vehicleLabel} junto con sus documentos, mantenimientos y registros de gasolina.\n\nEsta accion lo ocultara del sistema. Deseas continuar?`
    );

    if (!confirmed) return;

    try {
      setVehicleDeleting(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.message || 'Error al eliminar vehiculo');
      }

      navigate('/vehicles');
    } catch (deleteError) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: deleteError.message || 'No se pudo eliminar el vehiculo'
      });
    } finally {
      setVehicleDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-loading">
        <div className="spinner"></div>
        <p>Cargando vehículo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="edit-error">
        <div className="error-box">
          <p className="error-message">Error: {error}</p>
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
          <p className="error-message">Vehículo no encontrado</p>
          <button onClick={() => navigate('/vehicles')} className="btn btn-secondary">
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicle-edit-page">
      <div className="edit-page-header">
        <button
          className="btn-back-main"
          onClick={() => {
            if (activeSection) {
              setActiveSection(null);
            } else {
              navigate('/vehicles');
            }
          }}
        >
          Volver
        </button>
        <div className="edit-header-copy">
          <span className="edit-header-eyebrow">Expediente del vehículo</span>
          <h1>{getVehicleIdentifier(vehicle)}</h1>
          <p className="owner-info">{getVehicleSecondaryLabel(vehicle)}</p>
          <p className="owner-info">Propietario: {vehicle.propietario_nombre || '-'}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0 }}>Datos del vehiculo</h2>
              <p style={{ margin: '0.35rem 0 0 0', color: '#6b7280' }}>
                El numero economico es el identificador principal de la unidad.
              </p>
            </div>
            {!isEditingBasicInfo ? (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" onClick={() => setIsEditingBasicInfo(true)} disabled={vehicleDeleting}>
                  Editar vehiculo
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDeleteVehicle}
                  disabled={vehicleDeleting}
                  style={{ background: '#991b1b', borderColor: '#991b1b', color: '#fff' }}
                >
                  {vehicleDeleting ? 'Eliminando...' : 'Eliminar vehiculo'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingBasicInfo(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveBasicInfo} disabled={basicInfoSaving}>
                  {basicInfoSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            )}
          </div>

          {isEditingBasicInfo ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <label>
                  <span>Numero Economico</span>
                  <input name="numero_economico" value={basicInfoForm.numero_economico} onChange={handleBasicInfoInputChange} />
                </label>
                <label>
                  <span>Tipo de Carro</span>
                  <select name="tipo_carro" value={basicInfoForm.tipo_carro} onChange={handleBasicInfoInputChange}>
                    <option value="">Selecciona un tipo</option>
                    {VEHICLE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Propietario</span>
                  <input name="propietario_nombre" value={basicInfoForm.propietario_nombre} onChange={handleBasicInfoInputChange} />
                </label>
                <label>
                  <span>Placa</span>
                  <input name="placa" value={basicInfoForm.placa} onChange={handleBasicInfoInputChange} />
                </label>
                <label>
                  <span>Numero de Serie</span>
                  <input name="numero_serie" value={basicInfoForm.numero_serie} onChange={handleBasicInfoInputChange} />
                </label>
                <label>
                  <span>Marca</span>
                  <input name="marca" value={basicInfoForm.marca} onChange={handleBasicInfoInputChange} />
                </label>
                <label>
                  <span>Modelo</span>
                  <input name="modelo" type="number" min="1900" max="2100" value={basicInfoForm.modelo} onChange={handleBasicInfoInputChange} />
                </label>
                <label>
                  <span>Color</span>
                  <input name="color" value={basicInfoForm.color} onChange={handleBasicInfoInputChange} />
                </label>
                <label>
                  <span>Capacidad (kg)</span>
                  <input name="capacidad_kg" type="number" min="0" value={basicInfoForm.capacidad_kg} onChange={handleBasicInfoInputChange} />
                </label>
              </div>
              <label style={{ display: 'block', marginTop: '1rem' }}>
                <span>Descripcion</span>
                <textarea
                  name="descripcion"
                  rows="3"
                  value={basicInfoForm.descripcion}
                  onChange={handleBasicInfoInputChange}
                  style={{ width: '100%' }}
                />
              </label>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div><strong>Numero Economico</strong><p>{vehicle.numero_economico || '-'}</p></div>
              <div><strong>Tipo de Carro</strong><p>{vehicle.tipo_carro || '-'}</p></div>
              <div><strong>Placa</strong><p>{vehicle.placa || '-'}</p></div>
              <div><strong>Propietario</strong><p>{vehicle.propietario_nombre || '-'}</p></div>
            </div>
          )}
        </div>
      </div>

      <div ref={contentRef} className="edit-page-content">
        {activeSection === null ? (
          <VehicleDetailView
            vehicle={vehicle}
            vehicleId={id}
            onDocumentsClick={() => setActiveSection('documents')}
            onMaintenanceClick={() => setActiveSection('maintenance')}
            onGasolineClick={() => setActiveSection('gasoline')}
            onParametersClick={() => setActiveSection('parameters')}
            onPhotosClick={() => setActiveSection('photos')}
          />
        ) : activeSection === 'documents' ? (
          <VehicleDocumentsSection
            vehicleId={id}
            documents={vehicle.documents || []}
            initialDocumentId={requestedDocumentId}
            onSave={handleDocumentsSave}
            onDocumentSaved={handleDocumentSaved}
            onCancel={() => setActiveSection(null)}
            onBack={() => setActiveSection(null)}
          />
        ) : activeSection === 'maintenance' ? (
          <VehicleMaintenanceSection
            vehicleId={id}
            gasolineRecords={vehicle.gasolineRecords || []}
            operationParameters={vehicle.operationParameters || null}
            maintenanceRecords={vehicle.maintenanceRecords || []}
            safetyElements={vehicle.safetyElements || []}
            vehicleStatus={vehicle.estado || 'activo'}
            initialRecordId={requestedMaintenanceId}
            onSaveSafety={handleMaintenanceSave}
            onCreateMaintenanceRecord={handleCreateMaintenanceRecord}
            onUpdateMaintenanceRecord={handleUpdateMaintenanceRecord}
            onDeleteMaintenanceRecord={handleDeleteMaintenanceRecord}
            onCancel={() => setActiveSection(null)}
            onBack={() => setActiveSection(null)}
          />
        ) : activeSection === 'gasoline' ? (
          <VehicleGasolineSection
            vehicleId={id}
            vehicle={vehicle}
            gasolineRecords={vehicle.gasolineRecords || []}
            initialRecordId={requestedGasolineId}
            onCreateGasolineRecord={handleCreateGasolineRecord}
            onUpdateGasolineRecord={handleUpdateGasolineRecord}
            onDeleteGasolineRecord={handleDeleteGasolineRecord}
            onBack={() => setActiveSection(null)}
          />
        ) : activeSection === 'parameters' ? (
          <VehicleParametersSection
            vehicle={vehicle}
            parameters={vehicle.operationParameters || null}
            onSave={handleSaveParameters}
            onBack={() => setActiveSection(null)}
          />
        ) : activeSection === 'photos' ? (
          <VehiclePhotosSection
            vehicleId={id}
            photos={vehicle.photos || []}
            onSave={handlePhotosSave}
            onCancel={() => setActiveSection(null)}
            onBack={() => setActiveSection(null)}
          />
        ) : null}
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
