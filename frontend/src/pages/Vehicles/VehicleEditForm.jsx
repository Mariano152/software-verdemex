import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import './VehicleCreate.css';

export default function VehicleEditForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const [formData, setFormData] = useState({
    propietario_nombre: '',
    placa: '',
    numero_serie: '',
    marca: '',
    modelo: '',
    color: '',
    capacidad_kg: '',
    descripcion: '',
    estado: 'activo'
  });

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:3000/api/vehicles/${id}`, {
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
        
        setFormData({
          propietario_nombre: data.propietario_nombre || '',
          placa: data.placa || '',
          numero_serie: data.numero_serie || '',
          marca: data.marca || '',
          modelo: data.modelo || '',
          color: data.color || '',
          capacidad_kg: data.capacidad_kg || '',
          descripcion: data.descripcion || '',
          estado: data.estado || 'activo'
        });

        setError(null);
      } catch (err) {
        console.error('Error cargando vehículo:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVehicle();
    }
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSubmitMessage(null);

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:3000/api/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al guardar cambios');
      }

      setSubmitMessage({ type: 'success', text: '✓ Cambios guardados correctamente' });
      setIsEditing(false);

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Error guardando:', err);
      setSubmitMessage({ type: 'error', text: `❌ Error: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="vehicle-create-container">
        <p style={{ textAlign: 'center', padding: '3rem' }}>⏳ Cargando vehículo...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="vehicle-create-container">
        <p style={{ color: '#e74c3c', textAlign: 'center', padding: '2rem' }}>
          ❌ {error || 'Vehículo no encontrado'}
        </p>
        <div style={{ textAlign: 'center' }}>
          <Link to="/vehicles" className="btn btn-secondary">
            ← Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicle-create-container">
      <div className="vehicle-create-header">
        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Editar Vehículo - <span style={{ color: '#22c55e' }}>{vehicle.placa}</span></h1>
        <p style={{ color: '#6b7280', margin: 0 }}>Gestiona toda la información de tu vehículo</p>
      </div>

      {submitMessage && (
        <div className={`alert ${submitMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {submitMessage.text}
        </div>
      )}

      <div className="vehicle-create-content" style={{ paddingTop: '2rem' }}>
        {/* TABLA DE INFORMACIÓN */}
        <div className="card" style={{ marginBottom: '3rem' }}>
          <div style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Información del Vehículo</h2>
              {!isEditing && (
                <button
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                  type="button"
                >
                  ✏️ Editar
                </button>
              )}
            </div>

            {!isEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Propietario</strong>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.2rem', fontWeight: '600', color: '#222' }}>{formData.propietario_nombre}</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placa</strong>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.2rem', fontWeight: '600', color: '#22c55e' }} className="plate">{formData.placa}</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Número de Serie</strong>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.2rem', fontWeight: '600', color: '#222' }}>{formData.numero_serie}</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marca</strong>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.2rem', fontWeight: '600', color: '#222' }}>{formData.marca}</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Año</strong>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.2rem', fontWeight: '600', color: '#222' }}>{formData.modelo}</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Color</strong>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.2rem', fontWeight: '600', color: '#222' }}>
                    <span className="color-badge" style={{backgroundColor: formData.color || '#ccc', marginRight: '0.75rem', display: 'inline-block', width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #ddd'}}>
                    </span>
                    {formData.color || '-'}
                  </p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Capacidad</strong>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.2rem', fontWeight: '600', color: '#222' }}>{formData.capacidad_kg ? formData.capacidad_kg.toLocaleString() : '-'} kg</p>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                  <strong style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</strong>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '1.2rem', fontWeight: '600', color: '#22c55e' }}>
                    {formData.estado === 'activo' && '✓ Activo'}
                    {formData.estado === 'inactivo' && '🚫 Inactivo'}
                    {formData.estado === 'mantenimiento' && '🔧 En Taller'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre del Propietario *</label>
                    <input
                      type="text"
                      name="propietario_nombre"
                      value={formData.propietario_nombre}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Placa *</label>
                    <input
                      type="text"
                      name="placa"
                      value={formData.placa}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Número de Serie *</label>
                    <input
                      type="text"
                      name="numero_serie"
                      value={formData.numero_serie}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Marca *</label>
                    <input
                      type="text"
                      name="marca"
                      value={formData.marca}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Modelo (Año) *</label>
                    <input
                      type="number"
                      name="modelo"
                      value={formData.modelo}
                      onChange={handleInputChange}
                      min="1900"
                      max="2100"
                    />
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Capacidad (kg)</label>
                    <input
                      type="number"
                      name="capacidad_kg"
                      value={formData.capacidad_kg}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Estado *</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { value: 'activo', label: '✓ Activo' },
                        { value: 'inactivo', label: '🚫 Inactivo' },
                        { value: 'mantenimiento', label: '🔧 En Taller' }
                      ].map((status) => (
                        <label key={status.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="estado"
                            value={status.value}
                            checked={formData.estado === status.value}
                            onChange={handleInputChange}
                          />
                          {status.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsEditing(false)}
                    type="button"
                    style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleSave}
                    disabled={isSaving}
                    type="button"
                    style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                  >
                    {isSaving ? 'Guardando...' : '✓ Guardar Cambios'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ACCIONES RÁPIDAS */}
        <div className="card" style={{ marginTop: '3rem' }}>
          <div style={{ padding: '2rem' }}>
            <h2 style={{ margin: '0 0 2.5rem 0', fontSize: '1.8rem' }}>Acciones Rápidas</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
              <button
                className="action-card"
                onClick={() => {}}
                type="button"
                style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.backgroundColor = '#f0f9ff';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📄</div>
                <div style={{ fontWeight: '700', color: '#1f2937', fontSize: '1.1rem' }}>Documentos</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>Gestionar documentos</div>
              </button>

              <button
                className="action-card"
                onClick={() => {}}
                type="button"
                style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#f59e0b';
                  e.currentTarget.style.backgroundColor = '#fffbf0';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(245, 158, 11, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🔧</div>
                <div style={{ fontWeight: '700', color: '#1f2937', fontSize: '1.1rem' }}>Mantenimiento</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>Registrar mantenimiento</div>
              </button>

              <button
                className="action-card"
                onClick={() => {}}
                type="button"
                style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ec4899';
                  e.currentTarget.style.backgroundColor = '#fff5f8';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(236, 72, 153, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📸</div>
                <div style={{ fontWeight: '700', color: '#1f2937', fontSize: '1.1rem' }}>Fotografías</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>Gestionar fotos</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="form-actions" style={{ marginTop: '3rem' }}>
        <Link to="/vehicles" className="btn btn-secondary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          ← Volver al listado
        </Link>
      </div>
    </div>
  );
}
