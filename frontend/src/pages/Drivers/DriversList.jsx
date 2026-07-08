import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDrivers } from './driverApi';
import { buildDriverStars, formatDriverRating } from './driverFormatting';
import './DriversList.css';

export default function DriversList() {
  const [drivers, setDrivers] = useState([]);
  const [filters, setFilters] = useState({
    nombre: '',
    telefono: '',
    numero: '',
    ratingMinimo: '0'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        setLoading(true);
        const data = await fetchDrivers();
        setDrivers(data);
        setError(null);
      } catch (loadError) {
        setDrivers([]);
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDrivers();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const filteredDrivers = drivers.filter((driver) => {
    const nombre = filters.nombre.trim().toLowerCase();
    const telefono = filters.telefono.trim().toLowerCase();
    const numero = filters.numero.trim().toLowerCase();
    const ratingMinimo = Number(filters.ratingMinimo || 0);

    const matchesNombre = nombre ? driver.nombre?.toLowerCase().includes(nombre) : true;
    const matchesTelefono = telefono ? driver.telefono?.toLowerCase().includes(telefono) : true;
    const matchesNumero = numero ? driver.numero_seguro_social?.toLowerCase().includes(numero) : true;
    const matchesRating = Number(driver.rating || 0) >= ratingMinimo;

    return matchesNombre && matchesTelefono && matchesNumero && matchesRating;
  });

  return (
    <div className="drivers-page">
      <div className="driver-header-card">
        <div>
          <h1>Gestion de Conductores</h1>
          <p className="driver-subtitle">Alta, consulta y seguimiento base de tus conductores</p>
        </div>
        <div className="driver-actions">
          <Link to="/calificar" className="btn btn-outline btn-lg">
            Calificar
          </Link>
          <Link to="/drivers/create" className="btn btn-primary btn-lg">
            Anadir Conductor
          </Link>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="driver-toolbar">
            <div className="driver-filter">
              <label htmlFor="driver-filter-name">Nombre</label>
              <input
                id="driver-filter-name"
                name="nombre"
                type="search"
                value={filters.nombre}
                onChange={handleFilterChange}
                placeholder="Buscar por nombre"
              />
            </div>
            <div className="driver-filter">
              <label htmlFor="driver-filter-phone">Telefono</label>
              <input
                id="driver-filter-phone"
                name="telefono"
                type="search"
                value={filters.telefono}
                onChange={handleFilterChange}
                placeholder="+52 55..."
              />
            </div>
            <div className="driver-filter">
              <label htmlFor="driver-filter-nss">Numero de seguro social</label>
              <input
                id="driver-filter-nss"
                name="numero"
                type="search"
                value={filters.numero}
                onChange={handleFilterChange}
                placeholder="NSS o identificador"
              />
            </div>
            <div className="driver-filter">
              <label htmlFor="driver-filter-rating">Rating minimo</label>
              <select
                id="driver-filter-rating"
                name="ratingMinimo"
                value={filters.ratingMinimo}
                onChange={handleFilterChange}
              >
                <option value="0">Todos</option>
                <option value="3">3.0 o mas</option>
                <option value="4">4.0 o mas</option>
                <option value="4.5">4.5 o mas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="driver-empty">
              <p>Cargando conductores...</p>
            </div>
          ) : error ? (
            <div className="driver-empty">
              <p>Error: {error}</p>
              <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
                Reintentar
              </button>
            </div>
          ) : filteredDrivers.length > 0 ? (
            <table className="driver-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Telefono</th>
                  <th>Numero Seguro Social</th>
                  <th>Rating</th>
                  <th>Imagen</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="driver-row"
                    onClick={() => navigate(`/drivers/${driver.id}`)}
                  >
                    <td>
                      <div className="driver-name">{driver.nombre}</div>
                      <div className="driver-muted">{driver.descripcion || 'Sin descripcion capturada'}</div>
                    </td>
                    <td>{driver.telefono}</td>
                    <td>{driver.numero_seguro_social}</td>
                    <td>
                      <span className="driver-rating-chip">
                        <span>{buildDriverStars(driver.rating)}</span>
                        <span>{formatDriverRating(driver.rating)}</span>
                      </span>
                    </td>
                    <td>
                      {driver.imagen_url ? (
                        <img
                          src={driver.imagen_url}
                          alt={driver.nombre}
                          className="driver-list-image"
                        />
                      ) : (
                        <div className="driver-list-image driver-list-image-placeholder">
                          {driver.nombre?.charAt(0) || 'C'}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="driver-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/drivers/${driver.id}`);
                          }}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/drivers/${driver.id}/edit`);
                          }}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="driver-empty">
              <p>No se encontraron conductores con los filtros actuales.</p>
              <Link to="/drivers/create" className="btn btn-primary">
                Crear el primero
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
