import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationModal from '../../components/Notifications/NotificationModal';
import {
  createDriverRating,
  fetchDriverById,
  fetchDrivers,
  updateDriverRating
} from './driverApi';
import DriverRatingModal from './DriverRatingModal';
import { buildDriverStars, formatDriverRating } from './driverFormatting';
import {
  buildWeekOptions,
  fetchInternetCurrentDateString,
  formatWeekRangeLabel,
  resolveWeekFromDate
} from './driverRatingWeeks';
import './DriverGlobalRatingPage.css';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const findWeekRating = (ratings = [], ratingYear, weekNumber) => (
  ratings.find((item) => Number(item.rating_year) === Number(ratingYear) && Number(item.week_number) === Number(weekNumber)) || null
);

const calculateAverageRating = (ratings = []) => {
  if (!ratings.length) return 0;
  const total = ratings.reduce((sum, item) => sum + Number(item.calificacion || 0), 0);
  return Number((total / ratings.length).toFixed(1));
};

export default function DriverGlobalRatingPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [referenceDate, setReferenceDate] = useState('');
  const [weekContext, setWeekContext] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const loadReferenceDate = async () => {
      const internetDate = await fetchInternetCurrentDateString();
      const resolvedWeek = resolveWeekFromDate(internetDate);
      setReferenceDate(internetDate);
      setWeekContext(resolvedWeek);
    };

    loadReferenceDate();
  }, []);

  useEffect(() => {
    if (!weekContext) return;

    const loadDrivers = async () => {
      try {
        setLoading(true);
        const baseDrivers = await fetchDrivers();
        const driverDetails = await Promise.all(baseDrivers.map((driver) => fetchDriverById(driver.id)));
        setDrivers(driverDetails);
        setError(null);
      } catch (loadError) {
        setDrivers([]);
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDrivers();
  }, [weekContext]);

  const weekOptions = useMemo(() => (
    weekContext ? buildWeekOptions(weekContext.ratingYear) : []
  ), [weekContext]);

  const driversWithStatus = useMemo(() => {
    if (!weekContext) return [];

    return drivers.map((driver) => {
      const currentWeekRating = findWeekRating(driver.weeklyRatings || [], weekContext.ratingYear, weekContext.weekNumber);
      return {
        ...driver,
        currentWeekRating,
        isRated: Boolean(currentWeekRating)
      };
    });
  }, [drivers, weekContext]);

  const filteredDrivers = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);
    return driversWithStatus.filter((driver) => {
      const matchesSearch = normalizedQuery
        ? [
            driver.nombre,
            driver.numero_seguro_social,
            driver.telefono,
            driver.descripcion
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        : true;

      const matchesStatus = statusFilter === 'todos'
        ? true
        : statusFilter === 'pendientes'
          ? !driver.isRated
          : driver.isRated;

      return matchesSearch && matchesStatus;
    });
  }, [driversWithStatus, searchTerm, statusFilter]);

  const pendingCount = driversWithStatus.filter((driver) => !driver.isRated).length;
  const ratedCount = driversWithStatus.filter((driver) => driver.isRated).length;

  const openModalForDriver = (driver) => {
    setSelectedDriver(driver);
    setSelectedRecord(driver.currentWeekRating);
    setModalOpen(true);
  };

  const updateDriverState = (driverId, updater) => {
    setDrivers((current) => current.map((driver) => (
      driver.id === driverId ? updater(driver) : driver
    )));
  };

  const handleSave = async (formData, files, recordId) => {
    if (!selectedDriver) return;

    const savedRecord = recordId
      ? await updateDriverRating(selectedDriver.id, recordId, formData, files)
      : await createDriverRating(selectedDriver.id, formData, files);

    updateDriverState(selectedDriver.id, (driver) => {
      const currentRatings = driver.weeklyRatings || [];
      const exists = currentRatings.some((item) => item.id === savedRecord.id);
      const updatedRatings = exists
        ? currentRatings.map((item) => (item.id === savedRecord.id ? savedRecord : item))
        : [savedRecord, ...currentRatings];

      return {
        ...driver,
        weeklyRatings: updatedRatings,
        rating: calculateAverageRating(updatedRatings)
      };
    });

    setNotification({
      type: 'success',
      title: 'Exito',
      message: recordId ? 'Rating actualizado correctamente' : 'Rating creado correctamente'
    });
    setTimeout(() => setNotification(null), 2500);
  };

  const selectedWeekOption = weekOptions.find((option) => Number(option.value) === Number(weekContext?.weekNumber));

  return (
    <div className="global-rating-page">
      <div className="global-rating-header">
        <div>
          <h1>Calificar</h1>
          <p className="global-rating-subtitle">Control semanal de ratings para todos los conductores.</p>
        </div>
        <div className="global-rating-actions">
          <Link to="/drivers" className="btn btn-outline">Ver conductores</Link>
        </div>
      </div>

      <div className="global-rating-summary">
        <div className="global-rating-card">
          <span>Fecha de referencia</span>
          <strong>{referenceDate || '-'}</strong>
        </div>
        <div className="global-rating-card">
          <span>Semana activa</span>
          <strong>{selectedWeekOption?.label || '-'}</strong>
        </div>
        <div className="global-rating-card success">
          <span>Calificados</span>
          <strong>{ratedCount}</strong>
        </div>
        <div className="global-rating-card danger">
          <span>Pendientes</span>
          <strong>{pendingCount}</strong>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="global-rating-filters">
            <div className="driver-filter">
              <label htmlFor="global-rating-search">Buscar conductor</label>
              <input
                id="global-rating-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nombre, NSS o telefono"
              />
            </div>

            <div className="driver-filter">
              <label htmlFor="global-rating-status">Estado</label>
              <select
                id="global-rating-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="pendientes">Pendientes</option>
                <option value="calificados">Calificados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="global-rating-list">
        {loading ? (
          <div className="driver-empty"><p>Cargando conductores...</p></div>
        ) : error ? (
          <div className="driver-empty"><p>Error: {error}</p></div>
        ) : filteredDrivers.length === 0 ? (
          <div className="driver-empty"><p>No se encontraron conductores con los filtros actuales.</p></div>
        ) : (
          filteredDrivers.map((driver) => (
            <div
              key={driver.id}
              className={`global-rating-driver-card ${driver.isRated ? 'done' : 'pending'}`}
            >
              <div className="global-rating-driver-main">
                <div className="global-rating-driver-head">
                  <div className="global-rating-driver-avatar">
                    {driver.imagen_url ? (
                      <img src={driver.imagen_url} alt={driver.nombre} />
                    ) : (
                      <span>{driver.nombre?.charAt(0) || 'C'}</span>
                    )}
                  </div>
                  <div>
                    <h3>{driver.nombre}</h3>
                    <p>{driver.numero_seguro_social} | {driver.telefono}</p>
                  </div>
                </div>

                <div className="global-rating-driver-stats">
                  <div>
                    <span className="record-label">Promedio</span>
                    <strong>{formatDriverRating(driver.rating)}</strong>
                  </div>
                  <div>
                    <span className="record-label">Estrellas</span>
                    <strong>{buildDriverStars(driver.rating)}</strong>
                  </div>
                  <div>
                    <span className="record-label">Semana</span>
                    <strong>{formatWeekRangeLabel(weekContext?.semana_inicio, weekContext?.semana_fin)}</strong>
                  </div>
                  <div>
                    <span className="record-label">Estado</span>
                    <strong>{driver.isRated ? 'Calificado' : 'Pendiente'}</strong>
                  </div>
                </div>

                {driver.currentWeekRating ? (
                  <div className="global-rating-driver-rating">
                    <div>
                      <span className="record-label">Rating capturado</span>
                      <strong>{driver.currentWeekRating.calificacion} / 10</strong>
                    </div>
                    <div>
                      <span className="record-label">Fecha del rating</span>
                      <strong>{driver.currentWeekRating.fecha_registro}</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="global-rating-driver-actions">
                <button
                  type="button"
                  className={`btn ${driver.isRated ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => openModalForDriver(driver)}
                >
                  {driver.isRated ? 'Editar semana' : 'Calificar semana'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <DriverRatingModal
        driverId={selectedDriver?.id || ''}
        record={selectedRecord}
        isOpen={modalOpen}
        isNew={!selectedRecord}
        mode={selectedRecord ? 'edit' : 'edit'}
        defaultWeekContext={weekContext}
        lockWeekSelection
        onClose={() => {
          setModalOpen(false);
          setSelectedDriver(null);
          setSelectedRecord(null);
        }}
        onSave={handleSave}
        onDelete={null}
      />

      <NotificationModal
        isOpen={!!notification}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
