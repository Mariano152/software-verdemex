import { useCallback, useEffect, useMemo, useState } from 'react';
import NotificationModal from '../../components/Notifications/NotificationModal';
import { getFuelTypeLabel } from '../../constants/fuelTypes';
import '../../components/Notifications/NotificationModal.css';
import InventoryPipaModal from './InventoryPipaModal';
import InventoryRecordModal from './InventoryRecordModal';
import './InventoryDashboard.css';

const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
}).format(Number(value || 0));

const formatNumber = (value, maximumFractionDigits = 2) => Number(value || 0).toLocaleString('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits
});

const formatDate = (value) => {
  if (!value) return '-';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const getLatestRecordTimestamp = (record) => {
  if (!record?.fecha) return 0;
  const date = new Date(`${record.fecha}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const sortRecordsByDateDesc = (records = []) => (
  [...records].sort((left, right) => {
    const dateDifference = getLatestRecordTimestamp(right) - getLatestRecordTimestamp(left);
    if (dateDifference !== 0) return dateDifference;
    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
  })
);

export default function InventoryDashboard() {
  const [pipas, setPipas] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [pipaFilters, setPipaFilters] = useState({
    search: '',
    fuelType: 'todos'
  });
  const [recordFilters, setRecordFilters] = useState({
    search: '',
    pipaId: 'todos',
    fuelType: 'todos',
    dateFrom: '',
    dateTo: ''
  });
  const [pipaModalOpen, setPipaModalOpen] = useState(false);
  const [selectedPipa, setSelectedPipa] = useState(null);
  const [isNewPipa, setIsNewPipa] = useState(false);
  const [pipaModalMode, setPipaModalMode] = useState('edit');
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [recordModalMode, setRecordModalMode] = useState('edit');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyPipa, setHistoryPipa] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const fetchData = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setLoading(true);

      const token = localStorage.getItem('authToken');
      const [pipasResponse, recordsResponse] = await Promise.all([
        fetch('/api/inventory/pipas', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/inventory/records', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const pipasData = await pipasResponse.json().catch(() => ({}));
      const recordsData = await recordsResponse.json().catch(() => ({}));

      if (!pipasResponse.ok) {
        throw new Error(pipasData.message || 'No se pudieron cargar las pipas');
      }

      if (!recordsResponse.ok) {
        throw new Error(recordsData.message || 'No se pudieron cargar los registros de inventario');
      }

      setPipas(pipasData.pipas || []);
      setRecords(sortRecordsByDateDesc(recordsData.inventoryRecords || []));
      setError(null);
    } catch (fetchError) {
      console.error('Error loading inventory dashboard:', fetchError);
      setError(fetchError.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPipas = useMemo(() => {
    const normalizedSearch = String(pipaFilters.search || '').trim().toLowerCase();

    return pipas.filter((pipa) => {
      const matchesFuelType = pipaFilters.fuelType === 'todos' ? true : pipa.tipo_combustible === pipaFilters.fuelType;
      const searchableText = [
        pipa.nombre,
        pipa.tipo_combustible,
        pipa.observaciones
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;
      return matchesFuelType && matchesSearch;
    });
  }, [pipaFilters, pipas]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = String(recordFilters.search || '').trim().toLowerCase();

    return records.filter((record) => {
      const matchesPipa = recordFilters.pipaId === 'todos' ? true : String(record.pipa_id) === String(recordFilters.pipaId);
      const matchesFuelType = recordFilters.fuelType === 'todos' ? true : record.tipo_combustible_snapshot === recordFilters.fuelType;
      const matchesDateFrom = recordFilters.dateFrom ? record.fecha >= recordFilters.dateFrom : true;
      const matchesDateTo = recordFilters.dateTo ? record.fecha <= recordFilters.dateTo : true;
      const searchableText = [
        record.nombre_pipa_snapshot,
        record.tipo_combustible_snapshot,
        record.factura,
        record.proveedor,
        record.lugar,
        record.observaciones
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;

      return matchesPipa && matchesFuelType && matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [recordFilters, records]);

  const summary = useMemo(() => {
    const totalCurrentLiters = filteredPipas.reduce((acc, pipa) => acc + Number(pipa.litros_actuales || 0), 0);
    const totalCapacity = filteredPipas.reduce((acc, pipa) => acc + Number(pipa.capacidad_maxima_litros || 0), 0);
    const filteredInvestment = filteredRecords.reduce((acc, record) => acc + Number(record.costo_total_compra || 0), 0);

    return {
      totalPipas: filteredPipas.length,
      totalCurrentLiters,
      totalCapacity,
      filteredInvestment
    };
  }, [filteredPipas, filteredRecords]);

  const openNewPipaModal = () => {
    setSelectedPipa(null);
    setIsNewPipa(true);
    setPipaModalMode('edit');
    setPipaModalOpen(true);
  };

  const openViewPipaModal = (pipa) => {
    setSelectedPipa(pipa);
    setIsNewPipa(false);
    setPipaModalMode('view');
    setPipaModalOpen(true);
  };

  const openEditPipaModal = (pipa) => {
    setSelectedPipa(pipa);
    setIsNewPipa(false);
    setPipaModalMode('edit');
    setPipaModalOpen(true);
  };

  const openPipaHistoryModal = async (pipa) => {
    setHistoryPipa(pipa);
    setHistoryRecords([]);
    setHistoryError('');
    setHistoryModalOpen(true);
    setHistoryLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/inventory/pipas/${pipa.id}/consumption-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.message || 'No se pudo cargar el historial de la pipa');
      }

      setHistoryPipa(responseData.pipa || pipa);
      setHistoryRecords(responseData.consumptionHistory || []);
    } catch (historyFetchError) {
      setHistoryError(historyFetchError.message || 'No se pudo cargar el historial de la pipa');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openNewRecordModal = () => {
    if (pipas.length === 0) {
      setNotification({
        type: 'error',
        title: 'Sin pipas',
        message: 'Primero registra una pipa para poder capturar inventario.'
      });
      return;
    }

    setSelectedRecord(null);
    setIsNewRecord(true);
    setRecordModalMode('edit');
    setRecordModalOpen(true);
  };

  const openViewRecordModal = (record) => {
    setSelectedRecord(record);
    setIsNewRecord(false);
    setRecordModalMode('view');
    setRecordModalOpen(true);
  };

  const openEditRecordModal = (record) => {
    setSelectedRecord(record);
    setIsNewRecord(false);
    setRecordModalMode('edit');
    setRecordModalOpen(true);
  };

  const handleSavePipa = async (formData, pipaId) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(pipaId ? `/api/inventory/pipas/${pipaId}` : '/api/inventory/pipas', {
      method: pipaId ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo guardar la pipa');
    }

    await fetchData({ showLoader: false });
    setNotification({
      type: 'success',
      title: 'Exito',
      message: pipaId ? 'Pipa actualizada correctamente' : 'Pipa registrada correctamente'
    });
  };

  const handleDeletePipa = async (pipaId) => {
    const confirmed = window.confirm('Esto eliminara la pipa y su historial de inventario. Deseas continuar?');
    if (!confirmed) return;

    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/inventory/pipas/${pipaId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo eliminar la pipa');
    }

    setPipaModalOpen(false);
    setSelectedPipa(null);
    await fetchData({ showLoader: false });
    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Pipa eliminada correctamente'
    });
  };

  const handleSaveRecord = async (formData, documentFile, recordId) => {
    const token = localStorage.getItem('authToken');
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });

    if (documentFile) {
      payload.append('documento', documentFile);
    }

    const response = await fetch(recordId ? `/api/inventory/records/${recordId}` : '/api/inventory/records', {
      method: recordId ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo guardar el registro');
    }

    await fetchData({ showLoader: false });
    setNotification({
      type: 'success',
      title: 'Exito',
      message: recordId ? 'Registro actualizado correctamente' : 'Registro creado correctamente'
    });
  };

  const handleDeleteRecord = async (recordId) => {
    const confirmed = window.confirm('Seguro que deseas eliminar este registro de inventario?');
    if (!confirmed) return;

    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/inventory/records/${recordId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo eliminar el registro');
    }

    setRecordModalOpen(false);
    setSelectedRecord(null);
    await fetchData({ showLoader: false });
    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Registro eliminado correctamente'
    });
  };

  const handleDownloadDocument = async (fileInfo) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(fileInfo.download_url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo descargar el documento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileInfo.nombre_original || 'documento';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: downloadError.message || 'No se pudo descargar el documento'
      });
    }
  };

  if (loading) {
    return (
      <div className='gasoline-dashboard-state'>
        <div className='spinner' />
        <p>Cargando inventario de pipas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='gasoline-dashboard-state gasoline-dashboard-error'>
        <p>{error}</p>
        <button type='button' className='maintenance-add-btn' onClick={() => fetchData()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className='maintenance-section gasoline-dashboard inventory-dashboard'>
      <div className='section-header'>
        <div className='header-left'>
          <div className='header-info'>
            <h2>Inventario</h2>
            <p className='header-caption'>
              Controla las pipas registradas, su capacidad maxima y el historial de recargas para conocer los litros disponibles.
            </p>
          </div>
          <div className='inventory-header-actions'>
            <button type='button' className='maintenance-add-btn maintenance-add-btn-secondary' onClick={openNewPipaModal}>
              Agregar pipa
            </button>
            <button type='button' className='maintenance-add-btn' onClick={openNewRecordModal}>
              Agregar registro
            </button>
          </div>
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Resumen</h3>
            <p>Vista general del inventario actual y la inversion registrada en el filtro activo.</p>
          </div>
        </div>

        <div className='inventory-summary-grid'>
          <div className='inventory-summary-card'>
            <span>Pipas activas</span>
            <strong>{formatNumber(summary.totalPipas, 0)}</strong>
          </div>
          <div className='inventory-summary-card'>
            <span>Litros actuales</span>
            <strong>{formatNumber(summary.totalCurrentLiters)} L</strong>
          </div>
          <div className='inventory-summary-card'>
            <span>Capacidad total</span>
            <strong>{formatNumber(summary.totalCapacity)} L</strong>
          </div>
          <div className='inventory-summary-card'>
            <span>Inversion filtrada</span>
            <strong>{formatCurrency(summary.filteredInvestment)}</strong>
          </div>
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Pipas registradas</h3>
            <p>Consulta el catalogo de pipas y el nivel actual segun el ultimo registro capturado.</p>
          </div>
          <button type='button' className='maintenance-add-btn' onClick={openNewPipaModal}>
            Nueva pipa
          </button>
        </div>

        <div className='inventory-filter-row'>
          <div className='records-search-field'>
            <label htmlFor='inventory-pipa-search'>Buscar</label>
            <input
              id='inventory-pipa-search'
              type='search'
              value={pipaFilters.search}
              onChange={(event) => setPipaFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder='Nombre, combustible u observaciones'
            />
          </div>

          <label>
            Combustible
            <select value={pipaFilters.fuelType} onChange={(event) => setPipaFilters((current) => ({ ...current, fuelType: event.target.value }))}>
              <option value='todos'>Todos</option>
              <option value='diesel'>Diesel</option>
              <option value='magma'>Magma</option>
              <option value='premium'>Premium</option>
            </select>
          </label>
        </div>

        <div className='inventory-pipa-grid'>
          {pipas.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>Aun no hay pipas registradas.</p>
              <button type='button' className='maintenance-add-btn maintenance-add-btn-inline' onClick={openNewPipaModal}>
                Registrar primera pipa
              </button>
            </div>
          ) : filteredPipas.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>No hay pipas que coincidan con los filtros actuales.</p>
            </div>
          ) : (
            filteredPipas.map((pipa) => {
              const currentLiters = Number(pipa.litros_actuales || 0);
              const maxCapacity = Number(pipa.capacidad_maxima_litros || 0);
              const percentage = maxCapacity > 0 ? Math.min(100, (currentLiters / maxCapacity) * 100) : 0;

              return (
                <button key={pipa.id} type='button' className='inventory-pipa-card inventory-pipa-card-clickable' onClick={() => openPipaHistoryModal(pipa)}>
                  <div className='maintenance-record-top'>
                    <div>
                      <h4>{pipa.nombre}</h4>
                      <p className='maintenance-record-type'>{getFuelTypeLabel(pipa.tipo_combustible)}</p>
                      <p className='maintenance-record-type'>
                        Ultima carga: {pipa.ultima_fecha_registro ? formatDate(pipa.ultima_fecha_registro) : 'Sin registros'}
                      </p>
                    </div>
                    <div className='maintenance-record-actions'>
                      <button type='button' className='ghost-btn' onClick={(event) => { event.stopPropagation(); openPipaHistoryModal(pipa); }}>Historial</button>
                      <button type='button' className='ghost-btn' onClick={(event) => { event.stopPropagation(); openViewPipaModal(pipa); }}>Ver</button>
                      <button type='button' className='ghost-btn' onClick={(event) => { event.stopPropagation(); openEditPipaModal(pipa); }}>Editar</button>
                      <button type='button' className='danger-btn' onClick={(event) => { event.stopPropagation(); handleDeletePipa(pipa.id); }}>Eliminar</button>
                    </div>
                  </div>

                  <div className='inventory-capacity-card'>
                    <div className='inventory-capacity-copy'>
                      <span>Litros actuales</span>
                      <strong>{formatNumber(currentLiters)} L</strong>
                    </div>
                    <div className='inventory-capacity-track'>
                      <div style={{ width: `${percentage}%` }} />
                    </div>
                    <small>{formatNumber(percentage, 1)}% de {formatNumber(maxCapacity)} L</small>
                  </div>

                  <div className='inventory-record-grid'>
                    <div><span className='record-label'>Capacidad maxima</span><strong>{formatNumber(pipa.capacidad_maxima_litros)} L</strong></div>
                    <div><span className='record-label'>Total de registros</span><strong>{formatNumber(pipa.total_registros, 0)}</strong></div>
                    <div><span className='record-label'>Total invertido</span><strong>{formatCurrency(pipa.total_inversion)}</strong></div>
                    <div><span className='record-label'>Ultimo lugar</span><strong>{pipa.ultimo_lugar_registro || '-'}</strong></div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Registros de inventario</h3>
            <p>Se muestran del mas reciente al mas antiguo para seguir la evolucion de litros y costo por cada recarga.</p>
          </div>
          <button type='button' className='maintenance-add-btn' onClick={openNewRecordModal}>
            Agregar registro
          </button>
        </div>

        <div className='inventory-filter-row'>
          <div className='records-search-field'>
            <label htmlFor='inventory-record-search'>Buscar</label>
            <input
              id='inventory-record-search'
              type='search'
              value={recordFilters.search}
              onChange={(event) => setRecordFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder='Pipa, factura, proveedor, lugar u observaciones'
            />
          </div>

          <label>
            Pipa
            <select value={recordFilters.pipaId} onChange={(event) => setRecordFilters((current) => ({ ...current, pipaId: event.target.value }))}>
              <option value='todos'>Todas</option>
              {pipas.map((pipa) => (
                <option key={pipa.id} value={pipa.id}>{pipa.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Combustible
            <select value={recordFilters.fuelType} onChange={(event) => setRecordFilters((current) => ({ ...current, fuelType: event.target.value }))}>
              <option value='todos'>Todos</option>
              <option value='diesel'>Diesel</option>
              <option value='magma'>Magma</option>
              <option value='premium'>Premium</option>
            </select>
          </label>

          <label>
            Fecha inicial
            <input type='date' value={recordFilters.dateFrom} onChange={(event) => setRecordFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
          </label>

          <label>
            Fecha final
            <input type='date' value={recordFilters.dateTo} onChange={(event) => setRecordFilters((current) => ({ ...current, dateTo: event.target.value }))} />
          </label>
        </div>

        <div className='maintenance-records-list'>
          {records.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>Aun no hay registros de inventario.</p>
              <button type='button' className='maintenance-add-btn maintenance-add-btn-inline' onClick={openNewRecordModal}>
                Registrar primera recarga
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>No hay registros que coincidan con los filtros actuales.</p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const pricePerLiter = Number(record.litros_comprados || 0) > 0
                ? Number(record.costo_total_compra || 0) / Number(record.litros_comprados || 1)
                : 0;

              return (
                <div key={record.id} className='maintenance-record-card inventory-record-card'>
                  <div className='maintenance-record-top'>
                    <div>
                      <h4>{record.nombre_pipa_snapshot}</h4>
                      <p className='maintenance-record-type'>{getFuelTypeLabel(record.tipo_combustible_snapshot)}</p>
                      <p className='maintenance-record-type'>{record.lugar || '-'}</p>
                    </div>
                    <div className='maintenance-record-actions'>
                      <button type='button' className='ghost-btn' onClick={() => openViewRecordModal(record)}>Ver</button>
                      <button type='button' className='ghost-btn' onClick={() => openEditRecordModal(record)}>Editar</button>
                      <button type='button' className='danger-btn' onClick={() => handleDeleteRecord(record.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className='inventory-record-grid'>
                    <div><span className='record-label'>Fecha</span><strong>{formatDate(record.fecha)}</strong></div>
                    <div><span className='record-label'>Factura</span><strong>{record.factura || '-'}</strong></div>
                    <div><span className='record-label'>Proveedor</span><strong>{record.proveedor || '-'}</strong></div>
                    <div><span className='record-label'>Capacidad</span><strong>{formatNumber(record.capacidad_maxima_snapshot)} L</strong></div>
                    <div><span className='record-label'>Litros iniciales</span><strong>{formatNumber(record.litros_iniciales)} L</strong></div>
                    <div><span className='record-label'>Litros finales</span><strong>{formatNumber(record.litros_finales)} L</strong></div>
                    <div><span className='record-label'>Litros comprados</span><strong>{formatNumber(record.litros_comprados)} L</strong></div>
                    <div><span className='record-label'>Costo total</span><strong>{formatCurrency(record.costo_total_compra)}</strong></div>
                    <div><span className='record-label'>Precio por litro</span><strong>{formatCurrency(pricePerLiter)}</strong></div>
                    <div><span className='record-label'>Lugar</span><strong>{record.lugar || '-'}</strong></div>
                  </div>

                  {record.documento ? (
                    <div className='maintenance-files-inline'>
                      <span className='record-label'>Documento</span>
                      <div className='maintenance-inline-files'>
                        <button
                          type='button'
                          className='file-chip'
                          onClick={() => handleDownloadDocument(record.documento)}
                        >
                          {record.documento.nombre_original}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {record.observaciones ? (
                    <div className='maintenance-files-inline'>
                      <span className='record-label'>Observaciones</span>
                      <p>{record.observaciones}</p>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <InventoryPipaModal
        pipa={selectedPipa}
        isOpen={pipaModalOpen}
        isNew={isNewPipa}
        mode={pipaModalMode}
        onClose={() => setPipaModalOpen(false)}
        onSave={handleSavePipa}
        onEdit={(pipa) => openEditPipaModal(pipa)}
        onDelete={(pipaId) => handleDeletePipa(pipaId)}
      />

      <InventoryRecordModal
        pipas={pipas}
        record={selectedRecord}
        isOpen={recordModalOpen}
        isNew={isNewRecord}
        mode={recordModalMode}
        onClose={() => setRecordModalOpen(false)}
        onSave={handleSaveRecord}
        onEdit={(record) => openEditRecordModal(record)}
        onDelete={(recordId) => handleDeleteRecord(recordId)}
      />

      {historyModalOpen ? (
        <div className='maintenance-modal-overlay' onClick={() => setHistoryModalOpen(false)}>
          <div className='maintenance-modal inventory-history-modal' onClick={(event) => event.stopPropagation()}>
            <div className='maintenance-modal-header'>
              <div>
                <h3>Historial de salidas de pipa</h3>
                <p>{historyPipa?.nombre || 'Pipa'} - {historyPipa?.tipo_combustible ? getFuelTypeLabel(historyPipa.tipo_combustible) : ''}</p>
              </div>
              <button type='button' className='maintenance-close-btn' onClick={() => setHistoryModalOpen(false)}>Cerrar</button>
            </div>

            {historyLoading ? (
              <div className='maintenance-empty-state'>
                <p>Cargando historial...</p>
              </div>
            ) : historyError ? (
              <div className='maintenance-empty-state'>
                <p>{historyError}</p>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className='maintenance-empty-state'>
                <p>Esta pipa aun no tiene salidas registradas hacia vehiculos.</p>
              </div>
            ) : (
              <div className='inventory-consumption-list'>
                {historyRecords.map((item) => {
                  const vehicleLabel = [
                    item.vehiculo_numero_economico,
                    item.vehiculo_placa,
                    item.vehiculo_descripcion
                  ].filter(Boolean).join(' - ');

                  return (
                    <div key={item.id} className='inventory-consumption-card'>
                      <div className='inventory-consumption-main'>
                        <div>
                          <span className='record-label'>Fecha de salida</span>
                          <strong>{formatDate(item.fecha_carga || item.fecha_consumo)}</strong>
                          {item.hora_carga ? <small>{String(item.hora_carga).slice(0, 5)}</small> : null}
                        </div>
                        <div>
                          <span className='record-label'>Vehiculo</span>
                          <strong>{vehicleLabel || 'Vehiculo sin descripcion'}</strong>
                          {item.operador ? <small>Operador: {item.operador}</small> : null}
                        </div>
                        <div>
                          <span className='record-label'>Litros entregados</span>
                          <strong>{formatNumber(item.litros_consumidos)} L</strong>
                          <small>{formatCurrency(item.costo_unitario)} / L</small>
                        </div>
                        <div>
                          <span className='record-label'>Costo</span>
                          <strong>{formatCurrency(item.costo_total)}</strong>
                          {item.gasolina_factura ? <small>Factura: {item.gasolina_factura}</small> : null}
                        </div>
                      </div>
                      <div className='inventory-consumption-meta'>
                        <span>Lote: {formatDate(item.lote_fecha)}{item.lote_factura ? ` - Factura ${item.lote_factura}` : ''}</span>
                        {item.lote_lugar ? <span>Lugar: {item.lote_lugar}</span> : null}
                        {item.kilometros_recorridos !== null && item.kilometros_recorridos !== undefined ? <span>Km recorridos: {formatNumber(item.kilometros_recorridos)}</span> : null}
                        {item.m3_enviados !== null && item.m3_enviados !== undefined ? <span>M3 enviados: {formatNumber(item.m3_enviados)}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

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
