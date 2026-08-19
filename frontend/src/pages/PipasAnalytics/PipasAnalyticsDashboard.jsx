import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFuelTypeLabel } from '../../constants/fuelTypes';
import './PipasAnalyticsDashboard.css';

const number = (value, digits = 2) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: digits });
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
const date = (value) => value ? new Intl.DateTimeFormat('es-MX').format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : '-';

const Metric = ({ label, value, detail }) => <div className='inventory-summary-card'><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
const getVehicleLabel = (record) => {
  const economic = String(record.numero_economico_snapshot || record.vehiculo_numero_economico || '').trim();
  const description = String(record.descripcion_snapshot || record.vehiculo_descripcion || record.vehiculo_nombre || '').trim();
  return economic && description ? `${economic} - ${description}` : economic || description || record.vehiculo_placa || 'Vehículo sin identificar';
};
const buildRanking = (records, getKey, getLabel) => Array.from(records.reduce((map, record) => {
  const key = getKey(record);
  const current = map.get(key) || { key, label: getLabel(record), liters: 0, amount: 0, loads: 0 };
  current.liters += Number(record.litros || 0);
  current.amount += Number(record.costo_total || 0);
  current.loads += 1;
  map.set(key, current);
  return map;
}, new Map()).values());

export default function PipasAnalyticsDashboard() {
  const [pipas, setPipas] = useState([]);
  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [gasolineRecords, setGasolineRecords] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', fuelType: 'todos' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${localStorage.getItem('authToken')}`, 'Content-Type': 'application/json' };
      const responses = await Promise.all([
        fetch('/api/inventory/pipas', { headers }), fetch('/api/inventory/records', { headers }), fetch('/api/gasoline-records', { headers })
      ]);
      const data = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
      if (!responses[0].ok) throw new Error(data[0].message || 'No se pudieron cargar las pipas');
      if (!responses[1].ok) throw new Error(data[1].message || 'No se pudieron cargar los registros de inventario');
      if (!responses[2].ok) throw new Error(data[2].message || 'No se pudieron cargar las cargas de combustible');
      setPipas(data[0].pipas || []);
      setInventoryRecords(data[1].inventoryRecords || []);
      setGasolineRecords(data[2].gasolineRecords || []);
      setError('');
    } catch (requestError) { setError(requestError.message || 'No se pudo cargar el análisis.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const inPeriod = useCallback((value) => {
    const valueDate = String(value || '').slice(0, 10);
    return (!filters.from || valueDate >= filters.from) && (!filters.to || valueDate <= filters.to);
  }, [filters]);
  const filteredPipas = useMemo(() => pipas.filter((pipa) => filters.fuelType === 'todos' || pipa.tipo_combustible === filters.fuelType), [pipas, filters.fuelType]);
  const pipaIds = useMemo(() => new Set(filteredPipas.map((pipa) => String(pipa.id))), [filteredPipas]);
  const purchases = useMemo(() => inventoryRecords.filter((record) => pipaIds.has(String(record.pipa_id)) && inPeriod(record.fecha)), [inventoryRecords, pipaIds, inPeriod]);
  const loads = useMemo(() => gasolineRecords.filter((record) => inPeriod(record.fecha_carga) && (filters.fuelType === 'todos' || record.tipo_combustible === filters.fuelType)), [gasolineRecords, filters.fuelType, inPeriod]);
  const pipaLoads = useMemo(() => loads.filter((record) => record.origen_carga === 'pipa'), [loads]);
  const stationLoads = useMemo(() => loads.filter((record) => record.origen_carga !== 'pipa'), [loads]);
  const totals = useMemo(() => {
    const sum = (items, field) => items.reduce((total, item) => total + Number(item[field] || 0), 0);
    const current = sum(filteredPipas, 'litros_actuales'); const capacity = sum(filteredPipas, 'capacidad_maxima_litros');
    const purchased = sum(purchases, 'litros_comprados'); const investment = sum(purchases, 'costo_total_compra');
    return { current, capacity, purchased, investment, pipa: sum(pipaLoads, 'litros'), station: sum(stationLoads, 'litros'), price: purchased ? investment / purchased : 0 };
  }, [filteredPipas, purchases, pipaLoads, stationLoads]);
  const rows = useMemo(() => filteredPipas.map((pipa) => {
    const ownPurchases = purchases.filter((record) => String(record.pipa_id) === String(pipa.id));
    const ownLoads = pipaLoads.filter((record) => String(record.pipa_nombre_snapshot || '').trim() === String(pipa.nombre || '').trim());
    const bought = ownPurchases.reduce((sum, record) => sum + Number(record.litros_comprados || 0), 0);
    const investment = ownPurchases.reduce((sum, record) => sum + Number(record.costo_total_compra || 0), 0);
    const capacity = Number(pipa.capacidad_maxima_litros || 0); const stock = Number(pipa.litros_actuales || 0);
    return { ...pipa, bought, investment, delivered: ownLoads.reduce((sum, record) => sum + Number(record.litros || 0), 0), stock, capacity, fill: capacity ? stock / capacity * 100 : 0, price: bought ? investment / bought : 0 };
  }).sort((a, b) => b.delivered - a.delivered), [filteredPipas, purchases, pipaLoads]);
  const vehicleRanking = useMemo(() => buildRanking(
    pipaLoads,
    (record) => String(record.vehiculo_id || record.numero_economico_snapshot || record.vehiculo_placa || record.id),
    getVehicleLabel
  ), [pipaLoads]);
  const driverRanking = useMemo(() => buildRanking(
    pipaLoads,
    (record) => String(record.conductor_id || record.conductor_nombre_snapshot || record.operador || record.id),
    (record) => record.conductor_nombre_snapshot || record.conductor_nombre || record.operador || 'Conductor sin asignar'
  ).sort((a, b) => b.liters - a.liters), [pipaLoads]);
  const topVehicleLiters = useMemo(() => [...vehicleRanking].sort((a, b) => b.liters - a.liters), [vehicleRanking]);
  const topVehicleCost = useMemo(() => [...vehicleRanking].sort((a, b) => b.amount - a.amount), [vehicleRanking]);

  if (loading) return <div className='gasoline-dashboard-state'><p>Cargando análisis de pipas...</p></div>;
  if (error) return <div className='gasoline-dashboard-state gasoline-dashboard-error'><p>{error}</p><button type='button' className='maintenance-add-btn' onClick={fetchData}>Reintentar</button></div>;
  const sourceTotal = totals.pipa + totals.station;
  return <div className='maintenance-section gasoline-dashboard pipa-analytics-dashboard'>
    <div className='section-header'><div className='header-left'><div className='header-info'><h2>Análisis de pipas</h2><p className='header-caption'>Inventario, compras y litros entregados desde pipas frente a gasolineras.</p></div><button type='button' className='maintenance-add-btn' onClick={fetchData}>Actualizar</button></div></div>
    <section className='maintenance-history-section'><div className='maintenance-history-header'><div><h3>Periodo de análisis</h3><p>El inventario es el nivel actual; compras y cargas respetan el filtro.</p></div></div><div className='inventory-filter-row'><label>Desde<input type='date' value={filters.from} onChange={(event) => setFilters((state) => ({ ...state, from: event.target.value }))} /></label><label>Hasta<input type='date' value={filters.to} onChange={(event) => setFilters((state) => ({ ...state, to: event.target.value }))} /></label><label>Combustible<select value={filters.fuelType} onChange={(event) => setFilters((state) => ({ ...state, fuelType: event.target.value }))}><option value='todos'>Todos</option><option value='diesel'>Diesel</option><option value='magma'>Magma</option><option value='premium'>Premium</option></select></label></div></section>
    <section className='maintenance-history-section'><div className='maintenance-history-header'><div><h3>Indicadores clave</h3><p>Disponibilidad e inversión del periodo seleccionado.</p></div></div><div className='inventory-summary-grid'><Metric label='Pipas registradas' value={number(filteredPipas.length, 0)} detail={`${number(totals.capacity)} L de capacidad`} /><Metric label='Inventario actual' value={`${number(totals.current)} L`} detail={`${number(totals.capacity ? totals.current / totals.capacity * 100 : 0, 1)}% de capacidad`} /><Metric label='Litros comprados' value={`${number(totals.purchased)} L`} detail={`${money(totals.investment)} invertidos`} /><Metric label='Precio promedio pipa' value={money(totals.price)} detail='por litro comprado' /></div></section>
    <section className='maintenance-history-section'><div className='maintenance-history-header'><div><h3>Origen de las cargas a vehículos</h3><p>Comparativo de litros cargados en el periodo.</p></div></div><div className='pipa-source-grid'>{[['Desde pipa', totals.pipa, pipaLoads.length], ['En gasolinera', totals.station, stationLoads.length]].map(([label, liters, count]) => <div className='pipa-source-card' key={label}><span>{label}</span><strong>{number(liters)} L</strong><div className='pipa-source-track'><i style={{ width: `${sourceTotal ? liters / sourceTotal * 100 : 0}%` }} /></div><small>{number(sourceTotal ? liters / sourceTotal * 100 : 0, 1)}% · {number(count, 0)} cargas</small></div>)}</div></section>
    <section className='maintenance-history-section'><div className='maintenance-history-header'><div><h3>Desempeño por pipa</h3><p>Compras y entregas del periodo; nivel de inventario vigente.</p></div></div><div className='pipa-analysis-table-wrap'><table className='pipa-analysis-table'><thead><tr><th>Pipa</th><th>Inventario actual</th><th>Comprado</th><th>Entregado</th><th>Precio promedio</th><th>Última recarga</th></tr></thead><tbody>{rows.length ? rows.map((pipa) => <tr key={pipa.id}><td><strong>{pipa.nombre}</strong><small>{getFuelTypeLabel(pipa.tipo_combustible)}</small></td><td><div className='pipa-stock'><span>{number(pipa.stock)} / {number(pipa.capacity)} L</span><i><b style={{ width: `${Math.min(100, pipa.fill)}%` }} /></i><small className={pipa.fill <= 20 ? 'pipa-stock-alert' : ''}>{number(pipa.fill, 1)}% disponible</small></div></td><td>{number(pipa.bought)} L<small>{money(pipa.investment)}</small></td><td>{number(pipa.delivered)} L</td><td>{money(pipa.price)}</td><td>{date(pipa.ultima_fecha_registro)}</td></tr>) : <tr><td colSpan='6' className='pipa-table-empty'>No hay pipas para los filtros seleccionados.</td></tr>}</tbody></table></div></section>
    <section className='maintenance-history-section'>
      <div className='maintenance-history-header'><div><h3>Uso de combustible de pipas</h3><p>Rankings calculados solo con las cargas cuyo origen es pipa.</p></div></div>
      <div className='inventory-summary-grid'>
        <Metric label='Vehículo con más litros de pipa' value={topVehicleLiters[0] ? `${number(topVehicleLiters[0].liters)} L` : '-'} detail={topVehicleLiters[0]?.label || 'Sin cargas desde pipa'} />
        <Metric label='Vehículo con mayor gasto de pipa' value={topVehicleCost[0] ? money(topVehicleCost[0].amount) : '-'} detail={topVehicleCost[0]?.label || 'Sin cargas desde pipa'} />
        <Metric label='Conductor con más litros' value={driverRanking[0] ? `${number(driverRanking[0].liters)} L` : '-'} detail={driverRanking[0]?.label || 'Sin conductor asignado'} />
      </div>
      <div className='pipa-rankings-grid'>
        <Ranking title='Vehículos con más litros desde pipa' rows={topVehicleLiters} metric='liters' value={(row) => `${number(row.liters)} L`} detail={(row) => `${number(row.loads, 0)} cargas · ${money(row.amount)}`} />
        <Ranking title='Vehículos con mayor gasto desde pipa' rows={topVehicleCost} metric='amount' value={(row) => money(row.amount)} detail={(row) => `${number(row.liters)} L · ${number(row.loads, 0)} cargas`} />
        <Ranking title='Conductores con más litros cargados' rows={driverRanking} metric='liters' value={(row) => `${number(row.liters)} L`} detail={(row) => `${number(row.loads, 0)} cargas · ${money(row.amount)}`} />
      </div>
    </section>
  </div>;
}

function Ranking({ title, rows, metric, value, detail }) {
  const visibleRows = rows.slice(0, 8);
  const maximum = Math.max(...visibleRows.map((row) => Number(row[metric] || 0)), 1);
  return <div className='pipa-ranking-card'><h4>{title}</h4>{visibleRows.length ? <div className='pipa-bar-chart'>{visibleRows.map((row, index) => <div className='pipa-bar-row' key={row.key}><span className='pipa-bar-position'>{index + 1}</span><div className='pipa-bar-copy'><strong>{row.label}</strong><small>{detail(row)}</small><i><b style={{ width: `${Number(row[metric] || 0) / maximum * 100}%` }} /></i></div><b className='pipa-bar-value'>{value(row)}</b></div>)}</div> : <p>No hay cargas desde pipa en este periodo.</p>}</div>;
}
