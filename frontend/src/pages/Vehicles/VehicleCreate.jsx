import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './VehicleCreate.css';

export default function VehicleCreate({ vehicleToEdit = null }) {
  const navigate = useNavigate();
  const isEditMode = !!vehicleToEdit;
  const hasInitialized = useRef(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Estado para información básica
  const [basicInfo, setBasicInfo] = useState({
    propietario_nombre: '',
    placa: '',
    numero_serie: '',
    marca: '',
    modelo: new Date().getFullYear(),
    color: '',
    capacidad_kg: '',
    descripcion: '',
    estado: 'activo'
  });

  // Pre-llenar datos si estamos en modo edición
  useEffect(() => {
    if (!hasInitialized.current && isEditMode && vehicleToEdit) {
      hasInitialized.current = true;

      setBasicInfo({
        propietario_nombre: vehicleToEdit.propietario_nombre || '',
        placa: vehicleToEdit.placa || '',
        numero_serie: vehicleToEdit.numero_serie || '',
        marca: vehicleToEdit.marca || '',
        modelo: vehicleToEdit.modelo || new Date().getFullYear(),
        color: vehicleToEdit.color || '',
        capacidad_kg: vehicleToEdit.capacidad_kg || '',
        descripcion: vehicleToEdit.descripcion || '',
        estado: vehicleToEdit.estado || 'activo'
      });

      // Pre-llenar documentos si existen
      if (vehicleToEdit.documentos && Array.isArray(vehicleToEdit.documentos) && vehicleToEdit.documentos.length > 0) {
        setDocuments(vehicleToEdit.documentos.map(doc => ({
          tipo_documento_id: doc.tipo_documento_id || '',
          ambito: doc.ambito || 'federal',
          estado: doc.estado || '',
          dependencia_otorga: doc.dependencia_otorga || '',
          vigencia: doc.vigencia || '',
          folio_oficio: doc.folio_oficio || '',
          observaciones: doc.observaciones || ''
        })));
      }

      // Pre-llenar elementos de seguridad si existen
      if (vehicleToEdit.elementos_seguridad && Array.isArray(vehicleToEdit.elementos_seguridad)) {
        setSafetyElements(prev => 
          prev.map(elem => {
            const existingElem = vehicleToEdit.elementos_seguridad.find(
              e => e.elemento_seguridad_id === elem.id
            );
            if (existingElem) {
              return {
                id: elem.id,
                nombre: elem.nombre,
                estatus: existingElem.estatus || 'no_aplica',
                observaciones: existingElem.observaciones || ''
              };
            }
            return elem;
          })
        );
      }

      // Pre-llenar fotos si existen
      if (vehicleToEdit.fotografias && Array.isArray(vehicleToEdit.fotografias) && vehicleToEdit.fotografias.length > 0) {
        setPhotos(prev => 
          prev.map(photo => {
            const existingPhoto = vehicleToEdit.fotografias.find(
              f => f.tipo_foto === photo.tipo_foto
            );
            if (existingPhoto) {
              return {
                ...photo,
                archivo_url: existingPhoto.archivo_url,
                descripcion: existingPhoto.descripcion || ''
              };
            }
            return photo;
          })
        );
      }

      // Resetear deletedPhotos al cargar vehículo
      setDeletedPhotos([]);
    }
  }, [isEditMode, vehicleToEdit]);

  // Estado para documentos
  const [documents, setDocuments] = useState([
    {
      tipo_documento_id: '',
      ambito: 'federal',
      estado: '',
      dependencia_otorga: '',
      vigencia: '',
      folio_oficio: '',
      observaciones: ''
    }
  ]);

  // Estado para elementos de seguridad - ahora con observaciones
  const [safetyElements, setSafetyElements] = useState([
    { id: 1, nombre: 'Rotulación', estatus: 'no_aplica', observaciones: '' },
    { id: 2, nombre: 'Luces', estatus: 'no_aplica', observaciones: '' },
    { id: 3, nombre: 'Señales', estatus: 'no_aplica', observaciones: '' },
    { id: 4, nombre: 'Estrobos', estatus: 'no_aplica', observaciones: '' },
    { id: 5, nombre: 'Torreta', estatus: 'no_aplica', observaciones: '' },
    { id: 6, nombre: 'Alarma', estatus: 'no_aplica', observaciones: '' },
    { id: 7, nombre: 'Arnés', estatus: 'no_aplica', observaciones: '' },
    { id: 8, nombre: 'Equipo comunicación', estatus: 'no_aplica', observaciones: '' },
    { id: 9, nombre: 'Extintor', estatus: 'no_aplica', observaciones: '' },
    { id: 10, nombre: 'Protección antiderrames', estatus: 'no_aplica', observaciones: '' },
    { id: 11, nombre: 'EPP', estatus: 'no_aplica', observaciones: '' }
  ]);

  // Estado para fotografías - con todos los 14 tipos
  const [photos, setPhotos] = useState([
    { tipo_foto: 'frente', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'parte_trasera', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'lado_piloto', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'lado_copiloto', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'senales_y_luces', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'estrobos', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'extintor', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'rotulacion', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'torreta', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'proteccion_antiderrames', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'equipo_comunicacion', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'arnes_y_conectores', archivo_url: '', archivo: null, descripcion: '' },
    { tipo_foto: 'equipo_proteccion_personal', archivo_url: '', archivo: null, descripcion: '' }
  ]);

  // Track de fotos eliminadas (para el backend)
  const [deletedPhotos, setDeletedPhotos] = useState([]);

  // Validar información al guardar (no al navegar)
  const validateForSave = () => {
    const missing = [];
    
    if (!basicInfo.propietario_nombre.trim()) missing.push('Nombre del Propietario');
    if (!basicInfo.placa.trim()) missing.push('Placa');
    if (!basicInfo.numero_serie.trim()) missing.push('Número de Serie');
    if (!basicInfo.marca.trim()) missing.push('Marca');
    if (!basicInfo.modelo) missing.push('Modelo');

    return missing;
  };

  // Manejar cambios en información básica
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setBasicInfo(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Manejar cambios en documentos
  const handleDocumentChange = (index, field, value) => {
    const newDocuments = [...documents];
    newDocuments[index][field] = value;
    setDocuments(newDocuments);
  };

  // Agregar nuevo documento
  const addDocument = () => {
    setDocuments(prev => [...prev, {
      tipo_documento_id: '',
      ambito: 'federal',
      estado: '',
      dependencia_otorga: '',
      vigencia: '',
      folio_oficio: '',
      observaciones: ''
    }]);
  };

  // Eliminar documento
  const removeDocument = (index) => {
    if (documents.length > 1) {
      setDocuments(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Manejar cambios en elementos de seguridad
  const handleSafetyChange = (id, estatus) => {
    setSafetyElements(prev =>
      prev.map(elem => elem.id === id ? { ...elem, estatus } : elem)
    );
  };

  // Manejar observaciones de seguridad
  const handleSafetyObservations = (id, observaciones) => {
    setSafetyElements(prev =>
      prev.map(elem => elem.id === id ? { ...elem, observaciones } : elem)
    );
  };

  // Manejar cambios en fotografías
  const handlePhotoChange = (index, field, value) => {
    const newPhotos = [...photos];
    newPhotos[index][field] = value;
    setPhotos(newPhotos);
  };

  // Manejar selección de archivo de foto
  const handlePhotoFileChange = (index, file) => {
    if (!file) return;

    // Crear preview local (data URL)
    const reader = new FileReader();
    reader.onload = (e) => {
      const newPhotos = [...photos];
      newPhotos[index].archivo = file;
      newPhotos[index].archivo_url = e.target.result; // Data URL para preview
      setPhotos(newPhotos);
    };
    reader.readAsDataURL(file);
  };

  // Eliminar foto
  const handleRemovePhoto = (index) => {
    const photoToDelete = photos[index];
    // Si la foto tenía URL en el servidor, marcarla para eliminar
    if (photoToDelete.archivo_url && !photoToDelete.archivo) {
      setDeletedPhotos(prev => [...prev, photoToDelete.tipo_foto]);
    }
    
    const newPhotos = [...photos];
    newPhotos[index] = {
      ...newPhotos[index],
      archivo: null,
      archivo_url: '',
      descripcion: ''
    };
    setPhotos(newPhotos);
  };

  // Convertir tipo_foto a label legible
  const getPhotoLabel = (tipo) => {
    const labels = {
      'frente': 'Frente',
      'parte_trasera': 'Parte Trasera',
      'lado_piloto': 'Lado Piloto',
      'lado_copiloto': 'Lado Copiloto',
      'senales_y_luces': 'Señales de Alerta Reflejantes y Luces',
      'estrobos': 'Estrobos',
      'extintor': 'Extintor',
      'rotulacion': 'Rotulación',
      'torreta': 'Torreta',
      'proteccion_antiderrames': 'Protección Antiderrames',
      'equipo_comunicacion': 'Equipo de Comunicación',
      'arnes_y_conectores': 'Arnés y Conectores',
      'equipo_proteccion_personal': 'Equipo Protección Personal'
    };
    return labels[tipo] || tipo;
  };

  // Navegar entre pasos libremente
  const goToStep = (step) => {
    setCurrentStep(step);
    setErrors({});
  };

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Guardar vehículo - con validación y confirmación
  const handleSaveClick = () => {
    const missing = validateForSave();
    
    if (missing.length > 0) {
      setMissingFields(missing);
      setErrors({ validation: true });
      return;
    }
    
    // Si no hay campos faltantes, mostrar confirmación
    setShowConfirm(true);
    setErrors({});
  };

  const handleConfirmSave = async () => {
    setIsLoading(true);
    setShowConfirm(false);
    
    try {
      // Crear FormData para multipart upload
      const formData = new FormData();

      // Agregar datos del vehículo como JSON strings en FormData
      formData.append('basicInfo', JSON.stringify(basicInfo));
      formData.append('documents', JSON.stringify(documents));
      formData.append('safetyElements', JSON.stringify(safetyElements));
      
      // Agregar archivos de fotos y sus descripciones (solo si hay nuevos archivos)
      photos.forEach(photo => {
        if (photo.archivo) {
          // Agregar archivo con el nombre del tipo de foto
          formData.append(photo.tipo_foto, photo.archivo);
          // Agregar descripción con prefijo
          if (photo.descripcion) {
            formData.append(`descripcion_${photo.tipo_foto}`, photo.descripcion);
          }
        }
      });

      // Agregar fotos eliminadas (para que el backend las deshabilite)
      if (deletedPhotos.length > 0) {
        formData.append('deletedPhotos', JSON.stringify(deletedPhotos));
      }

      // Obtener token de autenticación
      const token = localStorage.getItem('authToken');

      // Determinaar si es crear o editar
      const endpoint = isEditMode 
        ? `http://localhost:3000/api/vehicles/${vehicleToEdit.id}`
        : 'http://localhost:3000/api/vehicles';
      const method = isEditMode ? 'PUT' : 'POST';

      console.log(`📤 ${isEditMode ? 'Actualizando' : 'Enviando'} vehículo al backend...`);

      // Enviar al backend
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
          // NO incluir Content-Type: el navegador lo pone automáticamente
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error al ${isEditMode ? 'actualizar' : 'guardar'} vehículo`);
      }

      console.log(`✅ Vehículo ${isEditMode ? 'actualizado' : 'guardado'}:`, data);
      
      // Guardar datos de éxito y mostrar modal
      setSuccessData({
        vehicleId: data.vehicle.id,
        placa: data.vehicle.placa,
        propietario: data.vehicle.propietario_nombre,
        summary: data.summary,
        isEdit: isEditMode
      });
      setShowSuccessModal(true);
      
      // Resetear deletedPhotos después de guardado exitoso
      setDeletedPhotos([]);
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      setErrors({ submit: error.message || `Error al ${isEditMode ? 'actualizar' : 'guardar'} el vehículo` });
      setShowConfirm(false); // Volver a mostrar el formulario
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSave = () => {
    setShowConfirm(false);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/vehicles');
  };

  const handleCloseModalStay = () => {
    setShowSuccessModal(false);
  };

  return (
    <div className="vehicle-create-container">
      <div className="vehicle-create-header">
        <h1>{isEditMode ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h1>
        <div className="progress-indicator">
          <button 
            className={`step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
            onClick={() => goToStep(1)}
            type="button"
          >
            1
          </button>
          <div className="step-line"></div>
          <button 
            className={`step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
            onClick={() => goToStep(2)}
            type="button"
          >
            2
          </button>
          <div className="step-line"></div>
          <button 
            className={`step ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}
            onClick={() => goToStep(3)}
            type="button"
          >
            3
          </button>
          <div className="step-line"></div>
          <button 
            className={`step ${currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : ''}`}
            onClick={() => goToStep(4)}
            type="button"
          >
            4
          </button>
        </div>
      </div>

      <div className="vehicle-create-content">
        {/* VALIDACIÓN DE CAMPOS REQUERIDOS */}
        {errors.validation && missingFields.length > 0 && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <strong>⚠️ Campos requeridos faltantes:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              {missingFields.map((field, idx) => (
                <li key={idx}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        {/* PASO 1: INFORMACIÓN BÁSICA */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2>Información Básica del Vehículo</h2>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del Propietario *</label>
                <input
                  type="text"
                  name="propietario_nombre"
                  value={basicInfo.propietario_nombre}
                  onChange={handleBasicInfoChange}
                  className={errors.propietario_nombre ? 'error' : ''}
                  placeholder="Ej: Juan Pérez"
                />
                {errors.propietario_nombre && <p className="error-text">{errors.propietario_nombre}</p>}
              </div>

              <div className="form-group">
                <label>Placa *</label>
                <input
                  type="text"
                  name="placa"
                  value={basicInfo.placa}
                  onChange={handleBasicInfoChange}
                  className={errors.placa ? 'error' : ''}
                  placeholder="Ej: ABC-123"
                  maxLength="20"
                />
                {errors.placa && <p className="error-text">{errors.placa}</p>}
              </div>

              <div className="form-group">
                <label>Número de Serie *</label>
                <input
                  type="text"
                  name="numero_serie"
                  value={basicInfo.numero_serie}
                  onChange={handleBasicInfoChange}
                  className={errors.numero_serie ? 'error' : ''}
                  placeholder="Ej: VF5YB234567890123"
                  maxLength="100"
                />
                {errors.numero_serie && <p className="error-text">{errors.numero_serie}</p>}
              </div>

              <div className="form-group">
                <label>Marca *</label>
                <input
                  type="text"
                  name="marca"
                  value={basicInfo.marca}
                  onChange={handleBasicInfoChange}
                  className={errors.marca ? 'error' : ''}
                  placeholder="Ej: Volkswagen"
                />
                {errors.marca && <p className="error-text">{errors.marca}</p>}
              </div>

              <div className="form-group">
                <label>Modelo (Año) *</label>
                <input
                  type="number"
                  name="modelo"
                  value={basicInfo.modelo}
                  onChange={handleBasicInfoChange}
                  className={errors.modelo ? 'error' : ''}
                  min="1900"
                  max="2100"
                />
                {errors.modelo && <p className="error-text">{errors.modelo}</p>}
              </div>

              <div className="form-group">
                <label>Color</label>
                <input
                  type="text"
                  name="color"
                  value={basicInfo.color}
                  onChange={handleBasicInfoChange}
                  placeholder="Ej: Blanco"
                />
              </div>

              <div className="form-group">
                <label>Capacidad (kg)</label>
                <input
                  type="number"
                  name="capacidad_kg"
                  value={basicInfo.capacidad_kg}
                  onChange={handleBasicInfoChange}
                  className={errors.capacidad_kg ? 'error' : ''}
                  placeholder="Ej: 2500"
                  step="0.01"
                />
                {errors.capacidad_kg && <p className="error-text">{errors.capacidad_kg}</p>}
              </div>

              <div className="form-group full-width">
                <label>Descripción</label>
                <textarea
                  name="descripcion"
                  value={basicInfo.descripcion}
                  onChange={handleBasicInfoChange}
                  placeholder="Información adicional del vehículo..."
                  rows="4"
                />
              </div>

              <div className="form-group full-width">
                <label>Estado del Vehículo</label>
                <div className="status-options">
                  {[
                    { value: 'activo', label: '✓ Activo', color: 'status-active' },
                    { value: 'inactivo', label: '🚫 Inactivo', color: 'status-inactive' },
                    { value: 'mantenimiento', label: '🔧 En Taller', color: 'status-maintenance' }
                  ].map((status) => (
                    <label key={status.value} className={`status-radio ${status.color}`}>
                      <input
                        type="radio"
                        name="estado"
                        value={status.value}
                        checked={basicInfo.estado === status.value}
                        onChange={handleBasicInfoChange}
                      />
                      <span className="status-label">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: DOCUMENTOS */}
        {currentStep === 2 && (
          <div className="step-content">
            <h2>Documentos y Permisos</h2>
            
            {documents.map((doc, index) => (
              <div key={index} className="document-section">
                <div className="document-header">
                  <h3>Documento {index + 1}</h3>
                  {documents.length > 1 && (
                    <button
                      className="btn-remove"
                      onClick={() => removeDocument(index)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Tipo de Documento *</label>
                    <select
                      value={doc.tipo_documento_id}
                      onChange={(e) => handleDocumentChange(index, 'tipo_documento_id', e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="1">Tarjeta de Circulación</option>
                      <option value="2">Constancia Físico-Mecánica</option>
                      <option value="3">Autorización Federal</option>
                      <option value="4">Permiso Estatal</option>
                      <option value="5">Seguro Vigente</option>
                      <option value="6">Verificación Vehicular</option>
                      <option value="7">Otro</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Ámbito *</label>
                    <select
                      value={doc.ambito}
                      onChange={(e) => handleDocumentChange(index, 'ambito', e.target.value)}
                    >
                      <option value="federal">Federal</option>
                      <option value="estatal_jalisco">Estatal - Jalisco</option>
                      <option value="estatal_otro">Estatal - Otro</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Estado</label>
                    <input
                      type="text"
                      value={doc.estado}
                      onChange={(e) => handleDocumentChange(index, 'estado', e.target.value)}
                      placeholder="Ej: Activo"
                    />
                  </div>

                  <div className="form-group">
                    <label>Dependencia que Otorga</label>
                    <input
                      type="text"
                      value={doc.dependencia_otorga}
                      onChange={(e) => handleDocumentChange(index, 'dependencia_otorga', e.target.value)}
                      placeholder="Ej: Secretaría de Movilidad"
                    />
                  </div>

                  <div className="form-group">
                    <label>Vigencia</label>
                    <input
                      type="date"
                      value={doc.vigencia}
                      onChange={(e) => handleDocumentChange(index, 'vigencia', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Folio/Oficio</label>
                    <input
                      type="text"
                      value={doc.folio_oficio}
                      onChange={(e) => handleDocumentChange(index, 'folio_oficio', e.target.value)}
                      placeholder="Ej: FOL-2026-001234"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Observaciones</label>
                    <textarea
                      value={doc.observaciones}
                      onChange={(e) => handleDocumentChange(index, 'observaciones', e.target.value)}
                      placeholder="Notas adicionales..."
                      rows="2"
                    />
                  </div>
                </div>

                {index < documents.length - 1 && <hr className="document-divider" />}
              </div>
            ))}

            <button
              className="btn-add-document"
              onClick={addDocument}
              type="button"
            >
              + Agregar Otro Documento
            </button>
          </div>
        )}

        {/* PASO 3: ELEMENTOS DE SEGURIDAD */}
        {currentStep === 3 && (
          <div className="step-content">
            <h2>Checklist de Elementos de Seguridad</h2>
            <p className="subtitle">Indica el estado de cada elemento e incluye comentarios si es necesario</p>
            
            <div className="safety-checklist">
              {safetyElements.map((element) => (
                <div key={element.id} className="safety-item">
                  <label className="safety-label">{element.nombre}</label>
                  <div className="safety-options">
                    <button
                      type="button"
                      className={`option ${element.estatus === 'si' ? 'selected' : ''}`}
                      onClick={() => handleSafetyChange(element.id, 'si')}
                    >
                      ✓ Sí
                    </button>
                    <button
                      type="button"
                      className={`option ${element.estatus === 'no' ? 'selected' : ''}`}
                      onClick={() => handleSafetyChange(element.id, 'no')}
                    >
                      ✗ No
                    </button>
                    <button
                      type="button"
                      className={`option ${element.estatus === 'no_aplica' ? 'selected' : ''}`}
                      onClick={() => handleSafetyChange(element.id, 'no_aplica')}
                    >
                      — N/A
                    </button>
                  </div>
                  <textarea
                    className="safety-observations"
                    value={element.observaciones}
                    onChange={(e) => handleSafetyObservations(element.id, e.target.value)}
                    placeholder="Agregar comentarios (opcional)..."
                    rows="2"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 4: FOTOGRAFÍAS */}
        {currentStep === 4 && (
          <div className="step-content">
            <h2>Fotografías del Vehículo</h2>
            <p className="subtitle">Carga fotos de cada parte del vehículo. Se guardarán en Cloudinary</p>
            
            <div className="photos-grid">
              {photos.map((photo, index) => (
                <div key={index} className="photo-item">
                  <label className="photo-label">{getPhotoLabel(photo.tipo_foto)}</label>
                  
                  <div className="photo-preview">
                    {photo.archivo_url ? (
                      <>
                        <img src={photo.archivo_url} alt={photo.tipo_foto} />
                        <button
                          className="btn-remove-photo"
                          onClick={() => handleRemovePhoto(index)}
                          type="button"
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <label className="photo-upload-placeholder">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoFileChange(index, e.target.files?.[0])}
                          style={{ display: 'none' }}
                        />
                        <div className="upload-icon">📷</div>
                        <div className="upload-text">Click o arrastra para subir</div>
                      </label>
                    )}
                  </div>

                  {photo.archivo_url && (
                    <label className="photo-file-input">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoFileChange(index, e.target.files?.[0])}
                        style={{ display: 'none' }}
                      />
                      🔄 Cambiar Foto
                    </label>
                  )}

                  <textarea
                    value={photo.descripcion}
                    onChange={(e) => handlePhotoChange(index, 'descripcion', e.target.value)}
                    placeholder="Descripción de la foto (opcional)..."
                    rows="2"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errores globales */}
        {errors.submit && (
          <div className="alert alert-error">
            {errors.submit}
          </div>
        )}
      </div>

      {/* Botones de navegación */}
      <div className="form-actions">
        <button
          className="btn btn-secondary"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          type="button"
        >
          ← Anterior
        </button>

        {currentStep < 4 ? (
          <button
            className="btn btn-primary"
            onClick={handleNext}
            type="button"
          >
            Siguiente →
          </button>
        ) : (
          <button
            className="btn btn-success"
            onClick={handleSaveClick}
            disabled={isLoading}
            type="button"
          >
            {isLoading 
              ? isEditMode ? 'Actualizando...' : 'Guardando...' 
              : isEditMode ? '✓ Actualizar Vehículo' : '✓ Guardar Vehículo'}
          </button>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirmar Registro</h2>
            <p>¿Está seguro de que desea guardar este vehículo? Verifique que todos los datos sean correctos.</p>
            
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={handleCancelSave}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="btn btn-success"
                onClick={handleConfirmSave}
                disabled={isLoading}
                type="button"
              >
                {isLoading ? 'Guardando...' : 'Sí, Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {showSuccessModal && successData && (
        <div className="modal-overlay">
          <div className="modal-success">
            <button
              className="modal-close-btn"
              onClick={handleCloseModalStay}
              type="button"
              title="Cerrar"
            >
              ✕
            </button>
            
            <div className="success-header">
              <div className="success-icon">✓</div>
              <h2>{successData.isEdit ? '¡Vehículo Actualizado!' : '¡Vehículo Registrado!'}</h2>
            </div>

            <button
              className="btn btn-primary btn-large"
              onClick={handleSuccessModalClose}
              type="button"
              style={{ marginTop: '2rem' }}
            >
              Ir al Listado de Vehículos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
