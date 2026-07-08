import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createEmergencyContact,
  createDriverDocument,
  createDriverHistory,
  createDriverRating,
  deleteEmergencyContact,
  deleteDriverDocument,
  deleteDriverHistory,
  deleteDriverRating,
  fetchDriverById,
  updateDriverDocument,
  updateDriverHistory,
  updateDriverRating,
  updateEmergencyContact
} from './driverApi';
import DriverEmergencyContactsSection from './DriverEmergencyContactsSection';
import DriverDocumentsSection from './DriverDocumentsSection';
import DriverHistorySection from './DriverHistorySection';
import DriverRatingSection from './DriverRatingSection';
import { buildDriverStars, formatDriverDate, formatDriverRating } from './driverFormatting';
import './DriverDetail.css';

const TABS = [
  { id: 'descripcion', label: 'Descripcion' },
  { id: 'contacto', label: 'Contacto de emergencia' },
  { id: 'documentacion', label: 'Documentacion' },
  { id: 'historial', label: 'Historial' },
  { id: 'rating', label: 'Rating' }
];

const calculateAverageRating = (ratings = []) => {
  if (!ratings.length) return 0;
  const total = ratings.reduce((sum, item) => sum + Number(item.calificacion || 0), 0);
  return Number((total / ratings.length).toFixed(1));
};

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [activeTab, setActiveTab] = useState('descripcion');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDriver = async () => {
      try {
        setLoading(true);
        const data = await fetchDriverById(id);
        setDriver(data);
        setError(null);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDriver();
  }, [id]);

  if (loading) {
    return (
      <div className="driver-detail-page">
        <div className="card">
          <div className="driver-empty">
            <p>Cargando conductor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="driver-detail-page">
        <div className="card">
          <div className="driver-empty">
            <p>{error || 'Conductor no encontrado'}</p>
            <Link to="/drivers" className="btn btn-primary">Volver a conductores</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-detail-page">
      <div className="driver-detail-hero">
        <div>
          <Link to="/drivers" className="btn btn-outline">Volver</Link>
          <div className="driver-hero-identity">
            {driver.imagen_url ? (
              <img src={driver.imagen_url} alt={driver.nombre} className="driver-hero-image" />
            ) : (
              <div className="driver-hero-avatar">{driver.nombre?.charAt(0) || 'C'}</div>
            )}
            <div>
              <h1>{driver.nombre}</h1>
              <p>{driver.telefono}</p>
            </div>
          </div>
          <div className="driver-hero-stats">
            <div className="driver-stat-chip">
              <span className="driver-stat-label">NSS</span>
              <span className="driver-stat-value">{driver.numero_seguro_social}</span>
            </div>
            <div className="driver-stat-chip">
              <span className="driver-stat-label">Rating</span>
              <span className="driver-stat-value">{formatDriverRating(driver.rating)}</span>
            </div>
            <div className="driver-stat-chip">
              <span className="driver-stat-label">Estrellas</span>
              <span className="driver-stat-value">{buildDriverStars(driver.rating)}</span>
            </div>
          </div>
        </div>

        <div className="driver-detail-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate(`/drivers/${id}/edit`)}>
            Editar
          </button>
        </div>
      </div>

      <div className="driver-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`driver-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'descripcion' && (
        <div className="driver-info-grid">
          <div className="driver-info-card">
            <label>Nombre completo</label>
            <p>{driver.nombre}</p>
          </div>
          <div className="driver-info-card">
            <label>Telefono</label>
            <p>{driver.telefono}</p>
          </div>
          <div className="driver-info-card">
            <label>Numero de seguro social</label>
            <p>{driver.numero_seguro_social}</p>
          </div>
          <div className="driver-info-card">
            <label>Domicilio</label>
            <p>{driver.domicilio || 'Sin domicilio capturado por ahora.'}</p>
          </div>
          <div className="driver-info-card">
            <label>Rating actual</label>
            <p>{formatDriverRating(driver.rating)} ({buildDriverStars(driver.rating)})</p>
          </div>
          <div className="driver-info-card">
            <label>Descripcion</label>
            <p>{driver.descripcion || 'Sin descripcion capturada por ahora.'}</p>
          </div>
          <div className="driver-info-card">
            <label>Imagen</label>
            <p>{driver.imagen_url ? 'Imagen registrada' : 'Sin imagen capturada por ahora.'}</p>
            {driver.imagen_url ? (
              <img src={driver.imagen_url} alt={driver.nombre} className="driver-detail-image" />
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'contacto' && (
        <DriverEmergencyContactsSection
          contacts={driver.emergencyContacts || []}
          onCreateContact={async (payload) => {
            const contact = await createEmergencyContact(id, payload);
            setDriver((current) => ({
              ...current,
              emergencyContacts: [contact, ...(current?.emergencyContacts || [])]
            }));
            return contact;
          }}
          onUpdateContact={async (contactId, payload) => {
            const contact = await updateEmergencyContact(id, contactId, payload);
            setDriver((current) => ({
              ...current,
              emergencyContacts: (current?.emergencyContacts || []).map((item) =>
                item.id === contact.id ? contact : item
              )
            }));
            return contact;
          }}
          onDeleteContact={async (contactId) => {
            await deleteEmergencyContact(id, contactId);
            setDriver((current) => ({
              ...current,
              emergencyContacts: (current?.emergencyContacts || []).filter((item) => item.id !== contactId)
            }));
          }}
        />
      )}

      {activeTab === 'documentacion' && (
        <DriverDocumentsSection
          driverId={id}
          documents={driver.documents || []}
          onCreateDocument={async (payload, files) => {
            const document = await createDriverDocument(id, payload, files);
            setDriver((current) => ({
              ...current,
              documents: [document, ...(current?.documents || [])]
            }));
            return document;
          }}
          onUpdateDocument={async (documentId, payload, files) => {
            const document = await updateDriverDocument(id, documentId, payload, files);
            setDriver((current) => ({
              ...current,
              documents: (current?.documents || []).map((item) =>
                item.id === document.id ? document : item
              )
            }));
            return document;
          }}
          onDeleteDocument={async (documentId) => {
            await deleteDriverDocument(id, documentId);
            setDriver((current) => ({
              ...current,
              documents: (current?.documents || []).filter((item) => item.id !== documentId)
            }));
          }}
        />
      )}

      {activeTab === 'historial' && (
        <DriverHistorySection
          driverId={id}
          records={driver.historyRecords || []}
          onCreateHistory={async (payload, files) => {
            const history = await createDriverHistory(id, payload, files);
            setDriver((current) => ({
              ...current,
              historyRecords: [history, ...(current?.historyRecords || [])]
            }));
            return history;
          }}
          onUpdateHistory={async (historyId, payload, files) => {
            const history = await updateDriverHistory(id, historyId, payload, files);
            setDriver((current) => ({
              ...current,
              historyRecords: (current?.historyRecords || []).map((item) =>
                item.id === history.id ? history : item
              )
            }));
            return history;
          }}
          onDeleteHistory={async (historyId) => {
            await deleteDriverHistory(id, historyId);
            setDriver((current) => ({
              ...current,
              historyRecords: (current?.historyRecords || []).filter((item) => item.id !== historyId)
            }));
          }}
        />
      )}

      {activeTab === 'rating' && (
        <DriverRatingSection
          driverId={id}
          ratings={driver.weeklyRatings || []}
          onCreateRating={async (payload, files) => {
            const rating = await createDriverRating(id, payload, files);
            setDriver((current) => ({
              ...current,
              weeklyRatings: [rating, ...(current?.weeklyRatings || [])],
              rating: calculateAverageRating([rating, ...(current?.weeklyRatings || [])])
            }));
            return rating;
          }}
          onUpdateRating={async (ratingId, payload, files) => {
            const rating = await updateDriverRating(id, ratingId, payload, files);
            setDriver((current) => ({
              ...current,
              weeklyRatings: (current?.weeklyRatings || []).map((item) =>
                item.id === rating.id ? rating : item
              ),
              rating: calculateAverageRating(
                (current?.weeklyRatings || []).map((item) =>
                  item.id === rating.id ? rating : item
                )
              )
            }));
            return rating;
          }}
          onDeleteRating={async (ratingId) => {
            await deleteDriverRating(id, ratingId);
            setDriver((current) => ({
              ...current,
              weeklyRatings: (current?.weeklyRatings || []).filter((item) => item.id !== ratingId),
              rating: calculateAverageRating(
                (current?.weeklyRatings || []).filter((item) => item.id !== ratingId)
              )
            }));
          }}
        />
      )}
    </div>
  );
}
