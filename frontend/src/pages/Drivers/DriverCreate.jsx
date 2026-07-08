import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationModal from '../../components/Notifications/NotificationModal';
import { createDriver } from './driverApi';
import './DriverCreate.css';

export default function DriverCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    numero_seguro_social: '',
    domicilio: '',
    descripcion: '',
    imagen: null,
    imagenPreview: null
  });
  const [notification, setNotification] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((current) => ({
        ...current,
        imagen: file,
        imagenPreview: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotification(null);

    try {
      await createDriver(formData);

      setNotification({
        type: 'success',
        title: 'Conductor registrado',
        message: `${formData.nombre} fue agregado correctamente`
      });

      setTimeout(() => {
        navigate('/drivers');
      }, 1200);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error al registrar',
        message: error.message || 'No se pudo guardar el conductor'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="driver-form-page">
      <div className="driver-form-header">
        <Link to="/drivers" className="btn btn-outline">Volver</Link>
        <div className="driver-create-tabs" aria-label="Tipo de alta">
          <Link to="/vehicles/create" className="driver-create-tab">Vehiculo</Link>
          <span className="driver-create-tab active">Conductor</span>
        </div>
        <div>
          <h1>Registro de Nuevo Conductor</h1>
          <p>Captura la informacion principal del conductor</p>
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
          <div className="form-section">
            <h3>Informacion Base</h3>
            <div className="driver-form-grid">
              <div className="full-width">
                <label htmlFor="imagen">Imagen del conductor</label>
                <div className="driver-image-upload">
                  {formData.imagenPreview ? (
                    <img src={formData.imagenPreview} alt="Vista previa del conductor" className="driver-image-preview" />
                  ) : (
                    <div className="driver-image-placeholder">Imagen opcional</div>
                  )}
                  <input id="imagen" type="file" accept="image/*" onChange={handleImageChange} />
                </div>
              </div>
              <div>
                <label htmlFor="nombre">Nombre Completo *</label>
                <input
                  id="nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Juan Rodriguez Garcia"
                  required
                />
              </div>
              <div>
                <label htmlFor="telefono">Telefono *</label>
                <input
                  id="telefono"
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="+52 55 1234 5678"
                  required
                />
              </div>
              <div>
                <label htmlFor="numero_seguro_social">Numero de Seguro Social *</label>
                <input
                  id="numero_seguro_social"
                  type="text"
                  name="numero_seguro_social"
                  value={formData.numero_seguro_social}
                  onChange={handleChange}
                  placeholder="NSS-00012345"
                  required
                />
              </div>
              <div>
                <label htmlFor="domicilio">Domicilio</label>
                <input
                  id="domicilio"
                  type="text"
                  name="domicilio"
                  value={formData.domicilio}
                  onChange={handleChange}
                  placeholder="Calle, numero, colonia, ciudad"
                />
              </div>
              <div className="full-width">
                <label htmlFor="descripcion">Descripcion</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  placeholder="Notas generales del conductor, experiencia, disponibilidad o contexto operativo"
                  rows="4"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/drivers" className="btn btn-outline">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Guardando...' : 'Registrar Conductor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
