import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationModal from '@components/Notifications/NotificationModal';
import './VehicleCreate.css';

export default function VehicleCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    propietarioNombre: '',
    placa: '',
    numeroSerie: '',
    marca: '',
    modelo: '',
    color: '',
    capacidadKg: '',
    descripcion: '',
    imagen: null,
    imagenPreview: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        imagen: file,
        imagenPreview: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, imagen: null, imagenPreview: null }));
  };

  const validate = () => {
    if (
      !formData.propietarioNombre ||
      !formData.placa ||
      !formData.numeroSerie ||
      !formData.marca ||
      !formData.modelo
    ) {
      setNotification({
        type: 'error',
        title: 'Campos requeridos',
        message: 'Completa todos los campos obligatorios (*).'
      });
      return false;
    }

    if (!formData.imagen) {
      setNotification({
        type: 'error',
        title: 'Imagen requerida',
        message: 'Debes subir una imagen del vehículo.'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setNotification(null);

    try {
      // Obtener token de autenticación
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No estás autenticado. Por favor inicia sesión.');
      }

      // Crear FormData con la imagen
      const submitData = new FormData();
      
      // Agregar datos básicos
      submitData.append('propietario_nombre', formData.propietarioNombre);
      submitData.append('placa', formData.placa.toUpperCase());
      submitData.append('numero_serie', formData.numeroSerie);
      submitData.append('marca', formData.marca);
      submitData.append('modelo', parseInt(formData.modelo, 10));
      submitData.append('color', formData.color || '');
      submitData.append('capacidad_kg', formData.capacidadKg ? parseInt(formData.capacidadKg, 10) : '');
      submitData.append('descripcion', formData.descripcion || '');
      
      // Agregar imagen
      if (formData.imagen) {
        submitData.append('imagen', formData.imagen);
      }

      console.log('📤 Enviando vehículo con imagen al backend...');
      
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Error registrando vehículo');
      }

      console.log('✅ Vehículo registrado:', responseData);
      
      setNotification({
        type: 'success',
        title: '✓ Vehículo Registrado',
        message: `${formData.propietarioNombre} - Placa: ${formData.placa.toUpperCase()}`
      });

      setTimeout(() => navigate('/vehicles'), 1500);
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        title: 'Error al Registrar',
        message: error.message || 'Ocurrió un error al registrar el vehículo.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vehicle-create">
      <div className="form-header">
        <Link to="/vehicles" className="btn btn-outline">
          ← Volver
        </Link>
        <div>
          <h1>Registro de Nuevo Vehículo</h1>
          <p className="subtitle">RF1 - Información Básica del Vehículo</p>
        </div>
      </div>

      {notification && (
        <NotificationModal
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Sección Información Básica */}
          <div className="form-section">
            <h3>Información Básica del Vehículo</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="propietarioNombre">
                  Nombre del Propietario *
                </label>
                <input
                  id="propietarioNombre"
                  type="text"
                  name="propietarioNombre"
                  value={formData.propietarioNombre}
                  onChange={handleChange}
                  placeholder="Juan Rodríguez"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="placa">Placa *</label>
                <input
                  id="placa"
                  type="text"
                  name="placa"
                  value={formData.placa}
                  onChange={handleChange}
                  placeholder="ABC-1234"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="numeroSerie">Número de Serie *</label>
                <input
                  id="numeroSerie"
                  type="text"
                  name="numeroSerie"
                  value={formData.numeroSerie}
                  onChange={handleChange}
                  placeholder="1G1FB1S52D1234567"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="marca">Marca *</label>
                <input
                  id="marca"
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  placeholder="Toyota"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modelo">Año del Modelo *</label>
                <input
                  id="modelo"
                  type="number"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  placeholder="2023"
                  min="1900"
                  max="2100"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="color">Color</label>
                <input
                  id="color"
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="Blanco"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="capacidadKg">Capacidad (Kg)</label>
                <input
                  id="capacidadKg"
                  type="number"
                  name="capacidadKg"
                  value={formData.capacidadKg}
                  onChange={handleChange}
                  placeholder="1000"
                  min="0"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  placeholder="Descripción adicional del vehículo..."
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Sección Fotografía Principal */}
          <div className="form-section">
            <h3>Fotografía del Vehículo *</h3>

            <div className="photo-upload-container">
              {formData.imagenPreview ? (
                <div className="photo-preview-box">
                  <img src={formData.imagenPreview} alt="Vista previa" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="btn-remove-photo"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label htmlFor="imagen" className="photo-upload-placeholder">
                  <div className="upload-icon">📷</div>
                  <div className="upload-text">
                    Haz clic para seleccionar la imagen del vehículo
                  </div>
                </label>
              )}

              <input
                id="imagen"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="form-actions">
            <Link to="/vehicles" className="btn btn-outline">
              Cancelar
            </Link>
            <button
              type="submit"
              className="btn btn-success btn-lg"
              disabled={loading}
            >
              {loading ? 'Registrando...' : '✓ Registrar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}