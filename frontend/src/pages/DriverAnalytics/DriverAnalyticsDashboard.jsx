import { useCallback, useEffect, useMemo, useState } from 'react';
import './DriverAnalyticsDashboard.css';

const number = (value, digits = 2) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: digits });
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value || 0));
const driverName = (record) => record.conductor_nombre_snapshot || record.conductor_nombre || record.operador || 'Conductor sin asignar';

function BarChart({ title, rows, metric, format, detail }) {
  const visible = rows.slice(0, 8);
  const max = Math.max(...visible.map((row) => Number(row[metric] || 0)), 1);
  return <div className='driver-analytics-chart'><h4>{title}</h4>{visible.length ? visible.map((row, index) => <div className='driver-analytics-bar' key={row.id}><span>{index + 1}</span><div><strong>{row.nombre}</strong><small>{detail(row)}</small><i><b style={{ width: `${Number(row[metric] || 0) / max * 100}%` }} /></i></div><em>{format(row[metric])}</em></div>) : <p>Sin datos suficientes en este periodo.</p>}</div>;
}

export default function DriverAnalyticsDashboard() {
  const [drivers, setDrivers] = useState([]); const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '' }); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const fetchData = useCallback(async () => {
    try {
      setLoading(true); const headers = { Authorization: `Bearer ${localStorage.getItem('authToken')}`, 'Content-Type': 'application/json' };
      const [driversResponse, recordsResponse] = await Promise.all([fetch('/api/drivers', { headers }), fetch('/api/gasoline-records', { headers })]);
      const [driversData, recordsData] = await Promise.all([driversResponse.json().catch(() => ({})), recordsResponse.json().catch(() => ({}))]);
      if (!driversResponse.ok) throw new Error(driversData.message || 'No se pudieron cargar los conductores');
      if (!recordsResponse.ok) throw new Error(recordsData.message || 'No se pudieron cargar las cargas de gasolina');
      setDrivers(driversData.drivers || []); setRecords(recordsData.gasolineRecords || []); setError('');
    } catch (fetchError) { setError(fetchError.message || 'No se pudo cargar el análisis de conductores.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const filteredRecords = useMemo(() => records.filter((record) => {
    const value = String(record.fecha_carga || '').slice(0, 10);
    return Boolean(record.conductor_id || record.conductor_nombre_snapshot || record.operador) && (!filters.from || value >= filters.from) && (!filters.to || value <= filters.to);
  }), [records, filters]);
  const rows = useMemo(() => {
    const byId = new Map(drivers.map((driver) => [String(driver.id), { id: String(driver.id), nombre: driver.nombre || 'Sin nombre', rating: Number(driver.rating || 0), liters: 0, amount: 0, km: 0, loads: 0 }]));
    filteredRecords.forEach((record) => {
      const id = String(record.conductor_id || record.conductor_nombre_snapshot || record.operador);
      const current = byId.get(id) || { id, nombre: driverName(record), rating: 0, liters: 0, amount: 0, km: 0, loads: 0 };
      current.liters += Number(record.litros || 0); current.amount += Number(record.costo_total || 0); current.km += Number(record.kilometros_recorridos || 0); current.loads += 1; byId.set(id, current);
    });
    return Array.from(byId.values()).map((row) => ({ ...row, efficiency: row.liters > 0 ? row.km / row.liters : 0, costPerKm: row.km > 0 ? row.amount / row.km : 0 })).filter((row) => row.loads || row.rating > 0);
  }, [drivers, filteredRecords]);
  const byRating = useMemo(() => [...rows].filter((row) => row.rating > 0).sort((a, b) => b.rating - a.rating), [rows]);
  const byLiters = useMemo(() => [...rows].sort((a, b) => b.liters - a.liters), [rows]);
  const byEfficiency = useMemo(() => [...rows].filter((row) => row.km > 0 && row.liters > 0).sort((a, b) => b.efficiency - a.efficiency), [rows]);
  const totalLiters = rows.reduce((sum, row) => sum + row.liters, 0); const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const averageRating = byRating.length ? byRating.reduce((sum, row) => sum + row.rating, 0) / byRating.length : 0;
  if (loading) return <div className='analytics-state'><div className='spinner' /><p>Cargando análisis de conductores...</p></div>;
  if (error) return <div className='analytics-state analytics-state-error'><p>{error}</p><button type='button' className='analytics-primary-btn' onClick={fetchData}>Reintentar</button></div>;
  return <div className='driver-analytics'>
    <div className='analytics-detail-header'><div><h2>Desempeño de conductores</h2><p>Calificaciones y desempeño operativo calculado a partir de las cargas asignadas.</p></div><button type='button' className='analytics-primary-btn' onClick={fetchData}>Actualizar</button></div>
    <div className='analytics-panel analytics-filters-panel'><div className='analytics-panel-header'><div><h3>Periodo</h3><p>Las métricas de combustible solo consideran cargas con conductor asignado.</p></div></div><div className='analytics-filters-grid'><label>Fecha inicial<input type='date' value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label><label>Fecha final<input type='date' value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label></div></div>
    <div className='analytics-kpi-grid analytics-kpi-grid-detail'><Kpi label='Conductores con cargas' value={number(rows.filter((row) => row.loads > 0).length, 0)} detail={`${number(filteredRecords.length, 0)} cargas asignadas`} /><Kpi label='Rating promedio' value={`${number(averageRating, 1)} / 10`} detail={`${number(byRating.length, 0)} conductores calificados`} /><Kpi label='Más litros cargados' value={byLiters[0] ? `${number(byLiters[0].liters)} L` : '-'} detail={byLiters[0]?.nombre || 'Sin cargas'} /><Kpi label='Mejor rendimiento' value={byEfficiency[0] ? `${number(byEfficiency[0].efficiency)} km/L` : '-'} detail={byEfficiency[0]?.nombre || 'Sin datos completos'} /></div>
    <div className='driver-analytics-total'><span>Consumo asignado: <strong>{number(totalLiters)} L</strong></span><span>Gasto asignado: <strong>{money(totalAmount)}</strong></span></div>
    <div className='driver-analytics-charts'><BarChart title='Mejor rating' rows={byRating} metric='rating' format={(value) => `${number(value, 1)} / 10`} detail={(row) => `${number(row.loads, 0)} cargas · ${number(row.liters)} L`} /><BarChart title='Más litros cargados' rows={byLiters} metric='liters' format={(value) => `${number(value)} L`} detail={(row) => `${money(row.amount)} · ${number(row.loads, 0)} cargas`} /><BarChart title='Mejor rendimiento (km/L)' rows={byEfficiency} metric='efficiency' format={(value) => `${number(value)} km/L`} detail={(row) => `${number(row.km)} km · ${number(row.liters)} L`} /></div>
    <div className='analytics-panel'><div className='analytics-panel-header'><div><h3>KPIs por conductor</h3><p>Vista completa de rating, consumo, gasto y eficiencia por las cargas registradas.</p></div></div><div className='analytics-records-table-wrapper'><table className='analytics-records-table driver-analytics-table'><thead><tr><th>Conductor</th><th>Rating</th><th>Cargas</th><th>Litros</th><th>Gasto</th><th>Km</th><th>Rendimiento</th><th>Costo/km</th></tr></thead><tbody>{[...rows].sort((a, b) => b.liters - a.liters).map((row) => <tr key={row.id}><td>{row.nombre}</td><td>{row.rating ? `${number(row.rating, 1)} / 10` : '-'}</td><td>{number(row.loads, 0)}</td><td>{number(row.liters)} L</td><td>{money(row.amount)}</td><td>{number(row.km)} km</td><td>{row.efficiency ? `${number(row.efficiency)} km/L` : '-'}</td><td>{row.costPerKm ? money(row.costPerKm) : '-'}</td></tr>)}</tbody></table></div></div>
  </div>;
}

function Kpi({ label, value, detail }) { return <div className='analytics-kpi-card'><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
