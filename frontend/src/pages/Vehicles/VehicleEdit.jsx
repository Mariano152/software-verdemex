import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import VehicleCreate from './VehicleCreate';

/**
 * VehicleEdit reutiliza VehicleCreate cargando datos existentes
 * El componente VehicleCreate detecta vehicleToEdit y cambia la lógica
 */
export default function VehicleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos del vehículo desde API
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

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: '3rem', color: '#666'}}>
        <p style={{fontSize: '1.1rem'}}>⏳ Cargando vehículo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{textAlign: 'center', padding: '2rem', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '8px', color: '#e74c3c'}}>
        <p style={{fontSize: '1rem', marginBottom: '1rem'}}>❌ Error: {error}</p>
        <button onClick={() => navigate('/vehicles')} className="btn btn-secondary">
          Volver al listado
        </button>
      </div>
    );
  }

  // Pasar el vehículo al componente VehicleCreate para edición
  return <VehicleCreate vehicleToEdit={vehicle} />;
}
