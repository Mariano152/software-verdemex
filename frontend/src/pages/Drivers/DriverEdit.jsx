import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import NotificationModal from '../../components/Notifications/NotificationModal';
import { fetchDriverById, updateDriver } from './driverApi';
import './DriverEdit.css';

export default function DriverEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    numero_seguro_social: '',
    domicilio: '',
    descripcion: '',
    imagen: null,
    imagenPreview: null
  });

  useEffect(() => {
    const loadDriver = async () => {
      try {
        setLoading(true);
        const driver = await fetchDriverById(id);
        setFormData({
          nombre: driver.nombre || '',
          telefono: driver.telefono || '',
          numero_seguro_social: driver.numero_seguro_social || '',
          domicilio: driver.domicilio || '',
          descripcion: driver.descripcion || '',
          imagen: null,
          imagenPreview: driver.imagen_url || null
        });
        setError(null);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDriver();
  }, [id]);

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
    setSaving(true);
    setNotification(null);

    try {
      await updateDriver(id, formData);

      setNotification({
        type: 'success',
        title: 'Cambios guardados',
        message: 'El conductor fue actualizado correctamente'
      });

      setTimeout(() => navigate(`/drivers/${id}`), 1200);
    } catch (saveError) {
      setNotification({
        type: 'error',
        title: 'Error al guardar',
        message: saveError.message || 'No se pudo actualizar el conductor'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="driver-form-page">
        <div className="card">
          <div className="driver-empty">
            <p>Cargando conductor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="driver-form-page">
        <div className="card">
          <div className="driver-empty">
            <p>Error: {error}</p>
            <Link to="/drivers" className="btn btn-primary">Volver</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-form-page">
      <div className="driver-form-header">
        <Link to={`/drivers/${id}`} className="btn btn-outline">Volver</Link>
        <div>
          <h1>Editar Conductor</h1>
          <p>Ajusta la informacion principal del conductor</p>
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
                <input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="telefono">Telefono *</label>
                <input id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="numero_seguro_social">Numero de Seguro Social *</label>
                <input
                  id="numero_seguro_social"
                  name="numero_seguro_social"
                  value={formData.numero_seguro_social}
                  onChange={handleChange}
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
                />
              </div>
              <div className="full-width">
                <label htmlFor="descripcion">Descripcion</label>
                <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Link to={`/drivers/${id}`} className="btn btn-outline">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
