import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { buildDriverStars, formatDriverRating } from '../Drivers/driverFormatting';
import {
  buildWeekOptions,
  fetchInternetCurrentDateString,
  formatWeekRangeLabel,
  resolveWeekFromDate
} from '../Drivers/driverRatingWeeks';
import './Profile.css';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const buildHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    Authorization: `Bearer ${token}`
  };
};

const extractFiles = (record) => {
  if (!record?.archivos_json) return [];
  try {
    const parsed = typeof record.archivos_json === 'string' ? JSON.parse(record.archivos_json) : record.archivos_json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const extractSignatureFiles = (record) => {
  if (!record?.firma_archivos_json) return [];
  try {
    const parsed = typeof record.firma_archivos_json === 'string' ? JSON.parse(record.firma_archivos_json) : record.firma_archivos_json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildAuthorizedDownloadUrl = (url, inline = false) => {
  const token = localStorage.getItem('authToken');
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  const inlineFlag = inline ? '&inline=1' : '';
  return `${url}${separator}downloadToken=${encodeURIComponent(token || '')}${inlineFlag}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX');
};

const formatSignatureStatus = (value) => {
  if (value === 'firmado') return 'Firmado';
  if (value === 'pendiente') return 'Pendiente';
  return 'Sin asignar';
};

const buildNotificationItems = ({ driver, ratings, currentWeek, gasolineSignatureRecords }) => {
  const items = [];
  const latestRating = ratings[0] || null;
  const pendingGasolineRecords = gasolineSignatureRecords.filter((record) => record.firma_estatus === 'pendiente');
  const hasCurrentWeekRating = currentWeek
    ? ratings.some((item) => Number(item.rating_year) === Number(currentWeek.ratingYear) && Number(item.week_number) === Number(currentWeek.weekNumber))
    : false;

  if (!driver?.id) {
    items.push({
      type: 'warning',
      title: 'Cuenta pendiente de vinculacion',
      message: 'Tu usuario aun no esta vinculado correctamente a un conductor.'
    });
  }

  if (!ratings.length) {
    items.push({
      type: 'info',
      title: 'Sin ratings capturados',
      message: 'Aun no se registra ningun rating semanal para tu cuenta.'
    });
  }

  if (latestRating && Number(latestRating.calificacion || 0) < 7) {
    items.push({
      type: 'warning',
      title: 'Revision de desempeno',
      message: `Tu rating mas reciente fue ${formatDriverRating(latestRating.calificacion)} / 10.`
    });
  }

  if (currentWeek && !hasCurrentWeekRating) {
    items.push({
      type: 'info',
      title: 'Rating semanal pendiente',
      message: `Aun no se refleja el rating de la semana ${currentWeek.weekNumber}.`
    });
  }

  pendingGasolineRecords.forEach((record) => {
    items.push({
      type: 'warning',
      title: 'Firma de gasolina pendiente',
      message: `${record.factura || record.titulo || 'Carga'} · ${record.placa_snapshot || record.vehiculo_placa || 'Vehiculo'}`,
      actionRecordId: String(record.id),
      actionLabel: `Firmar ${record.factura || record.titulo || 'carga'}`
    });
  });

  return items;
};

export default function Profile() {
  const { user, logout } = useAuth();
  const [activePortalSection, setActivePortalSection] = useState('signatures');
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScore, setSelectedScore] = useState('todos');
  const [selectedYear, setSelectedYear] = useState('todos');
  const [weekFrom, setWeekFrom] = useState('todos');
  const [weekTo, setWeekTo] = useState('todos');
  const [currentWeek, setCurrentWeek] = useState(null);
  const [signatureSearch, setSignatureSearch] = useState('');
  const [signatureStatus, setSignatureStatus] = useState('todos');
  const [signatureDateFrom, setSignatureDateFrom] = useState('');
  const [signatureDateTo, setSignatureDateTo] = useState('');
  const [signatureFiles, setSignatureFiles] = useState([]);
  const [signatureNotes, setSignatureNotes] = useState('');
  const [signingRecordId, setSigningRecordId] = useState('');
  const [submittingSignature, setSubmittingSignature] = useState(false);

  useEffect(() => {
    const loadPortal = async () => {
      try {
        setLoading(true);
        setError('');

        if (user?.role === 'conductor') {
          const response = await fetch('/api/auth/driver-profile', {
            method: 'GET',
            headers: buildHeaders()
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo cargar tu portal');
          }

          setPortalData(data);
        } else {
          setPortalData({ user });
        }
      } catch (loadError) {
        setPortalData(null);
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadPortal();
  }, [user]);

  useEffect(() => {
    const resolveCurrentWeek = async () => {
      try {
        const today = await fetchInternetCurrentDateString();
        setCurrentWeek(resolveWeekFromDate(today));
      } catch {
        setCurrentWeek(null);
      }
    };

    if (user?.role === 'conductor') {
      resolveCurrentWeek();
    }
  }, [user]);

  const ratings = portalData?.driver?.weeklyRatings || [];
  const gasolineSignatureRecords = portalData?.driver?.gasolineSignatureRecords || [];
  const availableYears = useMemo(() => (
    Array.from(new Set(ratings.map((item) => String(item.rating_year || '')).filter(Boolean))).sort((a, b) => Number(b) - Number(a))
  ), [ratings]);
  const availableScores = useMemo(() => (
    Array.from(new Set(ratings.map((item) => String(item.calificacion || '')).filter(Boolean))).sort((a, b) => Number(b) - Number(a))
  ), [ratings]);
  const weekOptions = useMemo(() => (selectedYear === 'todos' ? [] : buildWeekOptions(selectedYear)), [selectedYear]);

  const filteredRatings = useMemo(() => {
    const query = normalizeText(searchTerm);
    return ratings.filter((record) => {
      const numericWeek = Number(record.week_number || 0);
      const matchesScore = selectedScore === 'todos' ? true : String(record.calificacion) === selectedScore;
      const matchesYear = selectedYear === 'todos' ? true : String(record.rating_year) === selectedYear;
      const matchesWeekFrom = weekFrom === 'todos' ? true : numericWeek >= Number(weekFrom);
      const matchesWeekTo = weekTo === 'todos' ? true : numericWeek <= Number(weekTo);
      const searchableText = [
        record.descripcion,
        record.semana_inicio,
        record.semana_fin,
        `semana ${record.week_number}`,
        `anio ${record.rating_year}`,
        `rating ${record.calificacion}`
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = query ? searchableText.includes(query) : true;
      return matchesScore && matchesYear && matchesWeekFrom && matchesWeekTo && matchesSearch;
    });
  }, [ratings, searchTerm, selectedScore, selectedYear, weekFrom, weekTo]);

  const averageRating = useMemo(() => {
    if (!filteredRatings.length) return '0.0';
    const total = filteredRatings.reduce((sum, item) => sum + Number(item.calificacion || 0), 0);
    return (total / filteredRatings.length).toFixed(1);
  }, [filteredRatings]);

  const latestRating = ratings[0] || null;
  const pendingGasolineRecords = useMemo(
    () => gasolineSignatureRecords.filter((record) => record.firma_estatus === 'pendiente'),
    [gasolineSignatureRecords]
  );
  const notifications = useMemo(() => (
    buildNotificationItems({
      driver: portalData?.driver,
      ratings,
      currentWeek,
      gasolineSignatureRecords
    })
  ), [portalData, ratings, currentWeek, gasolineSignatureRecords]);

  const filteredGasolineSignatureRecords = useMemo(() => {
    const query = normalizeText(signatureSearch);
    return gasolineSignatureRecords.filter((record) => {
      const matchesStatus = signatureStatus === 'todos' ? true : String(record.firma_estatus || 'sin_asignar') === signatureStatus;
      const matchesDateFrom = signatureDateFrom ? String(record.fecha_carga || '') >= signatureDateFrom : true;
      const matchesDateTo = signatureDateTo ? String(record.fecha_carga || '') <= signatureDateTo : true;
      const searchableText = [
        record.factura,
        record.titulo,
        record.placa_snapshot,
        record.vehiculo_placa,
        record.numero_economico_snapshot,
        record.conductor_nombre_snapshot,
        record.proveedor,
        record.observaciones
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = query ? searchableText.includes(query) : true;
      return matchesStatus && matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [gasolineSignatureRecords, signatureDateFrom, signatureDateTo, signatureSearch, signatureStatus]);

  const handleDownload = async (fileInfo) => {
    const token = localStorage.getItem('authToken');
    const separator = fileInfo.download_url.includes('?') ? '&' : '?';
    const response = await fetch(`${fileInfo.download_url}${separator}downloadToken=${encodeURIComponent(token || '')}`);

    if (!response.ok) {
      throw new Error('No se pudo descargar el archivo');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = fileInfo.nombre_original || 'rating';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleSignatureFileChange = (event) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setSignatureFiles(files);
  };

  const openSignaturePanel = (recordId) => {
    setActivePortalSection('signatures');
    setSigningRecordId(String(recordId));
  };

  const handleSubmitSignature = async (recordId) => {
    if (!recordId) return;
    if (!signatureFiles.length) {
      window.alert('Selecciona al menos una foto para registrar la firma.');
      return;
    }

    try {
      setSubmittingSignature(true);
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('firma_observaciones', signatureNotes);
      signatureFiles.forEach((file) => formData.append('documento', file));

      const response = await fetch(`/api/gasoline-records/${recordId}/signature`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo registrar la firma');
      }

      setPortalData((current) => {
        if (!current?.driver) return current;
        return {
          ...current,
          driver: {
            ...current.driver,
            gasolineSignatureRecords: (current.driver.gasolineSignatureRecords || []).map((record) =>
              String(record.id) === String(recordId) ? data.gasolineRecord : record
            )
          }
        };
      });
      setSigningRecordId('');
      setSignatureFiles([]);
      setSignatureNotes('');
    } catch (submitError) {
      window.alert(submitError.message || 'No se pudo registrar la firma');
    } finally {
      setSubmittingSignature(false);
    }
  };

  if (loading) {
    return <div className="profile-page"><div className="profile-empty-card"><p>Cargando portal...</p></div></div>;
  }

  if (error) {
    return <div className="profile-page"><div className="profile-empty-card"><p>Error: {error}</p></div></div>;
  }

  if (user?.role !== 'conductor') {
    return (
      <div className="profile-page">
        <div className="profile-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar">{(user?.name || 'A').charAt(0).toUpperCase()}</div>
            <div>
              <p className="profile-eyebrow">Cuenta</p>
              <h1>{user?.name || 'Usuario'}</h1>
              <p className="profile-subtitle">Perfil general de acceso al sistema.</p>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={logout}>Cerrar sesion</button>
        </div>

        <div className="profile-grid">
          <section className="profile-card">
            <h3>Datos de acceso</h3>
            <div className="profile-detail-list">
              <p><strong>Correo</strong><span>{user?.email || '-'}</span></p>
              <p><strong>Username</strong><span>{user?.username || '-'}</span></p>
              <p><strong>Rol</strong><span>{user?.role || '-'}</span></p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const driver = portalData?.driver;

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-main">
          {driver?.imagen_url ? (
            <img src={driver.imagen_url} alt={driver.nombre} className="profile-driver-image" />
          ) : (
            <div className="profile-avatar">{(driver?.nombre || 'C').charAt(0).toUpperCase()}</div>
          )}
          <div>
            <p className="profile-eyebrow">Portal del conductor</p>
            <h1>{driver?.nombre || user?.name || 'Conductor'}</h1>
            <p className="profile-subtitle">Consulta tus ratings semanales y avisos pendientes.</p>
            <div className="profile-role-row">
              <span className="profile-role-badge">Conductor</span>
              <span className="profile-role-secondary">@{user?.username}</span>
            </div>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={logout}>Cerrar sesion</button>
      </div>

      <div className="profile-stats-grid">
        <article className="profile-stat-card">
          <span className="profile-stat-label">Rating promedio</span>
          <strong>{formatDriverRating(averageRating)} / 10</strong>
          <span>{buildDriverStars(averageRating)}</span>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Ratings registrados</span>
          <strong>{ratings.length}</strong>
          <span>Semanas evaluadas</span>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Ultimo rating</span>
          <strong>{latestRating ? formatDriverRating(latestRating.calificacion) : '-'}</strong>
          <span>{latestRating ? `Semana ${latestRating.week_number} / ${latestRating.rating_year}` : 'Sin registros'}</span>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Notificaciones</span>
          <strong>{notifications.length}</strong>
          <span>Avisos del sistema</span>
        </article>
      </div>

      <div className="profile-content-grid">
        <section className="profile-card">
          <div className="section-heading">
            <div>
              <h3>Mis datos</h3>
              <p>Informacion general de tu cuenta y conductor asignado.</p>
            </div>
          </div>

          <div className="profile-detail-list">
            <p><strong>Correo</strong><span>{user?.email || '-'}</span></p>
            <p><strong>Username</strong><span>{user?.username || '-'}</span></p>
            <p><strong>Telefono</strong><span>{driver?.telefono || '-'}</span></p>
            <p><strong>NSS</strong><span>{driver?.numero_seguro_social || '-'}</span></p>
            <p><strong>Domicilio</strong><span>{driver?.domicilio || '-'}</span></p>
            <p><strong>Descripcion</strong><span>{driver?.descripcion || 'Sin descripcion capturada'}</span></p>
          </div>
        </section>

        <section className="profile-card notifications-card">
          <div className="section-heading">
            <div>
              <h3>Notificaciones</h3>
              <p>Este apartado muestra avisos operativos y cargas de gasolina pendientes por firmar.</p>
            </div>
          </div>

          <div className="notifications-list">
            {notifications.map((item, index) => (
              <article key={`${item.title}-${index}`} className={`notification-item ${item.type}`}>
                <h4>{item.title}</h4>
                <p>{item.message}</p>
                {item.actionRecordId ? (
                  <button
                    type="button"
                    className="file-chip notification-action-chip"
                    onClick={() => openSignaturePanel(item.actionRecordId)}
                  >
                    {item.actionLabel || 'Ir a firmar'}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="profile-card profile-section-switcher">
        <div className="profile-section-toggle">
          <button
            type="button"
            className={`profile-section-tab ${activePortalSection === 'signatures' ? 'active' : ''}`}
            onClick={() => setActivePortalSection('signatures')}
          >
            Firmas de gasolina
          </button>
          <button
            type="button"
            className={`profile-section-tab ${activePortalSection === 'ratings' ? 'active' : ''}`}
            onClick={() => setActivePortalSection('ratings')}
          >
            Historial de ratings
          </button>
        </div>
      </section>

      {activePortalSection === 'signatures' ? (
        <section className="profile-card profile-ratings-card">
          <div className="section-heading">
            <div>
              <h3>Firmas de gasolina</h3>
              <p>Aqui puedes firmar cargas pendientes y consultar tu historial con filtros.</p>
            </div>
            <div className="rating-average-chip">
              Pendientes: <strong>{pendingGasolineRecords.length}</strong>
            </div>
          </div>

          <div className="ratings-filter-grid ratings-filter-grid-compact">
            <div className="ratings-search-field">
              <label htmlFor="profile-gasoline-search">Buscar</label>
              <input
                id="profile-gasoline-search"
                type="search"
                value={signatureSearch}
                onChange={(event) => setSignatureSearch(event.target.value)}
                placeholder="Factura, placa o proveedor"
              />
            </div>

            <label>
              Estatus
              <select value={signatureStatus} onChange={(event) => setSignatureStatus(event.target.value)}>
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="firmado">Firmado</option>
                <option value="sin_asignar">Sin asignar</option>
              </select>
            </label>

            <label>
              Fecha desde
              <input type="date" value={signatureDateFrom} onChange={(event) => setSignatureDateFrom(event.target.value)} />
            </label>

            <label>
              Fecha hasta
              <input type="date" value={signatureDateTo} onChange={(event) => setSignatureDateTo(event.target.value)} />
            </label>
          </div>

          <div className="ratings-list">
            {gasolineSignatureRecords.length === 0 ? (
              <div className="profile-empty-card">
                <p>Aun no tienes cargas de gasolina asignadas.</p>
              </div>
            ) : filteredGasolineSignatureRecords.length === 0 ? (
              <div className="profile-empty-card">
                <p>No se encontraron firmas de gasolina con los filtros actuales.</p>
              </div>
            ) : (
              filteredGasolineSignatureRecords.map((record) => {
                const signatureRecordFiles = extractSignatureFiles(record);
                const isPending = record.firma_estatus === 'pendiente';
                const isSigning = String(signingRecordId) === String(record.id);

                return (
                  <article key={`gasoline-signature-${record.id}`} className="rating-record-card">
                    <div className="rating-record-top">
                      <div>
                        <h4>{record.factura || record.titulo || 'Carga de gasolina'}</h4>
                        <p>{record.placa_snapshot || record.vehiculo_placa || '-'} · {formatDate(record.fecha_carga)}</p>
                      </div>
                      <div className="rating-score-pill">{formatSignatureStatus(record.firma_estatus)}</div>
                    </div>

                    <div className="rating-record-grid">
                      <div>
                        <span className="record-label">Vehiculo</span>
                        <strong>{record.numero_economico_snapshot || record.vehiculo_numero_economico || '-'}</strong>
                      </div>
                      <div>
                        <span className="record-label">Proveedor</span>
                        <strong>{record.proveedor || '-'}</strong>
                      </div>
                      <div>
                        <span className="record-label">Fecha de firma</span>
                        <strong>{record.firma_fecha ? formatDate(record.firma_fecha) : '-'}</strong>
                      </div>
                    </div>

                    <div className="rating-record-description">
                      <span className="record-label">Observaciones</span>
                      <p>{record.firma_observaciones || record.observaciones || 'Sin observaciones'}</p>
                    </div>

                    <div className="rating-files-row">
                      <span className="record-label">Evidencia</span>
                      {signatureRecordFiles.length === 0 ? (
                        <p>Sin adjuntos</p>
                      ) : (
                        <div className="rating-file-chips">
                          {signatureRecordFiles.map((fileInfo, index) => (
                            <button
                              key={fileInfo.id || `${fileInfo.nombre_original}-${index}`}
                              type="button"
                              className="file-chip"
                              onClick={() => handleDownload(fileInfo)}
                            >
                              {fileInfo.nombre_original || `Firma ${index + 1}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {signatureRecordFiles.length > 0 ? (
                      <div className="rating-file-chips">
                        {signatureRecordFiles.map((fileInfo, index) => (
                          <img
                            key={`preview-${fileInfo.id || index}`}
                            src={buildAuthorizedDownloadUrl(fileInfo.download_url, true)}
                            alt={fileInfo.nombre_original || `Firma ${index + 1}`}
                            className="profile-driver-image"
                          />
                        ))}
                      </div>
                    ) : null}

                    {isPending ? (
                      <div className="rating-record-description">
                        {!isSigning ? (
                          <button type="button" className="btn btn-primary" onClick={() => setSigningRecordId(String(record.id))}>
                            Subir foto de firma
                          </button>
                        ) : (
                          <>
                            <input type="file" accept="image/*" multiple onChange={handleSignatureFileChange} />
                            <textarea
                              rows={3}
                              value={signatureNotes}
                              onChange={(event) => setSignatureNotes(event.target.value)}
                              placeholder="Observaciones de la firma"
                            />
                            <div className="rating-file-chips">
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={submittingSignature}
                                onClick={() => handleSubmitSignature(record.id)}
                              >
                                {submittingSignature ? 'Enviando...' : 'Registrar firma'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                  setSigningRecordId('');
                                  setSignatureFiles([]);
                                  setSignatureNotes('');
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>
      ) : (
        <section className="profile-card profile-ratings-card">
          <div className="section-heading">
            <div>
              <h3>Historial de ratings</h3>
              <p>Solo consulta. Aqui puedes revisar tus evaluaciones semanales.</p>
            </div>
            <div className="rating-average-chip">
              Promedio filtrado: <strong>{averageRating}</strong> / 10
            </div>
          </div>

          <div className="ratings-filter-grid">
            <div className="ratings-search-field">
              <label htmlFor="profile-rating-search">Buscar</label>
              <input
                id="profile-rating-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Semana, descripcion o anio"
              />
            </div>

            <label>
              Calificacion
              <select value={selectedScore} onChange={(event) => setSelectedScore(event.target.value)}>
                <option value="todos">Todos</option>
                {availableScores.map((score) => (
                  <option key={score} value={score}>{score}</option>
                ))}
              </select>
            </label>

            <label>
              Anio
              <select
                value={selectedYear}
                onChange={(event) => {
                  const nextYear = event.target.value;
                  setSelectedYear(nextYear);
                  setWeekFrom('todos');
                  setWeekTo('todos');
                }}
              >
                <option value="todos">Todos</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>

            <label>
              Semana desde
              <select
                value={weekFrom}
                onChange={(event) => setWeekFrom(event.target.value)}
                disabled={selectedYear === 'todos'}
              >
                <option value="todos">Todas</option>
                {weekOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label>
              Semana hasta
              <select
                value={weekTo}
                onChange={(event) => setWeekTo(event.target.value)}
                disabled={selectedYear === 'todos'}
              >
                <option value="todos">Todas</option>
                {weekOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="ratings-list">
            {ratings.length === 0 ? (
              <div className="profile-empty-card">
                <p>Aun no hay ratings semanales para este conductor.</p>
              </div>
            ) : filteredRatings.length === 0 ? (
              <div className="profile-empty-card">
                <p>No se encontraron ratings con los filtros actuales.</p>
              </div>
            ) : (
              filteredRatings.map((record) => {
                const files = extractFiles(record);
                return (
                  <article key={record.id} className="rating-record-card">
                    <div className="rating-record-top">
                      <div>
                        <h4>Semana {record.week_number || '-'} de {record.rating_year || '-'}</h4>
                        <p>{formatWeekRangeLabel(record.semana_inicio, record.semana_fin)}</p>
                      </div>
                      <div className="rating-score-pill">{record.calificacion} / 10</div>
                    </div>

                    <div className="rating-record-grid">
                      <div>
                        <span className="record-label">Fecha de captura</span>
                        <strong>{formatDate(record.fecha_registro)}</strong>
                      </div>
                      <div>
                        <span className="record-label">Promedio visual</span>
                        <strong>{buildDriverStars(record.calificacion)}</strong>
                      </div>
                      <div>
                        <span className="record-label">Adjuntos</span>
                        <strong>{files.length}</strong>
                      </div>
                    </div>

                    <div className="rating-record-description">
                      <span className="record-label">Descripcion</span>
                      <p>{record.descripcion || 'Sin descripcion'}</p>
                    </div>

                    <div className="rating-files-row">
                      <span className="record-label">Adjuntos</span>
                      {files.length === 0 ? (
                        <p>Sin adjuntos</p>
                      ) : (
                        <div className="rating-file-chips">
                          {files.map((fileInfo, index) => (
                            <button
                              key={fileInfo.id || `${fileInfo.nombre_original}-${index}`}
                              type="button"
                              className="file-chip"
                              onClick={() => handleDownload(fileInfo)}
                            >
                              {fileInfo.nombre_original || `Archivo ${index + 1}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
