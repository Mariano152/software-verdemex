import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const number = (value, digits = 0) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: digits });
const normalizeStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'en_mantenimiento' || value === 'mantenimiento') return 'mantenimiento';
  return value === 'inactivo' ? 'inactivo' : 'activo';
};
const vehicleLabel = (item) => item.vehiculo_numero_economico || item.numero_economico_snapshot || item.vehiculo_placa || item.placa_snapshot || 'Unidad sin identificar';
const relativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Hace un momento';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} día(s)`;
  return date.toLocaleDateString('es-MX');
};

export default function Dashboard() {
  const [data, setData] = useState({ vehicles: [], drivers: [], routes: [], gasoline: [], maintenance: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const urls = ['/api/vehicles', '/api/drivers', '/api/routes', '/api/gasoline-records', '/api/maintenance-records'];
        const responses = await Promise.all(urls.map((url) => fetch(url, { headers, cache: 'no-store', signal: controller.signal })));
        const payloads = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
        const failed = responses.findIndex((response) => !response.ok);
        if (failed >= 0) throw new Error(payloads[failed].message || 'No se pudo cargar el resumen operativo');
        setData({ vehicles: payloads[0].vehicles || [], drivers: payloads[1].drivers || [], routes: payloads[2].routes || [], gasoline: payloads[3].gasolineRecords || [], maintenance: payloads[4].maintenanceRecords || [] });
        setError('');
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return {
      activeVehicles: data.vehicles.filter((vehicle) => normalizeStatus(vehicle.estado) === 'activo').length,
      activeRoutes: data.routes.filter((route) => ['programada', 'en_proceso'].includes(String(route.estatus))).length,
      monthlyLiters: data.gasoline.reduce((sum, record) => String(record.fecha_carga || '').startsWith(month) ? sum + Number(record.litros || 0) : sum, 0)
    };
  }, [data]);

  const vehicleStatus = useMemo(() => {
    const total = data.vehicles.length;
    return [{ key: 'activo', status: 'Activos', color: '#27ae60' }, { key: 'mantenimiento', status: 'En mantenimiento', color: '#f39c12' }, { key: 'inactivo', status: 'Inactivos', color: '#e74c3c' }].map((item) => {
      const count = data.vehicles.filter((vehicle) => normalizeStatus(vehicle.estado) === item.key).length;
      return { ...item, count, percentage: total ? count / total * 100 : 0 };
    });
  }, [data.vehicles]);

  const activities = useMemo(() => [
    ...data.gasoline.map((record) => ({ id: `g-${record.id}`, type: 'Gasolina', message: `${number(record.litros, 2)} L cargados a ${vehicleLabel(record)}`, date: record.created_at || record.fecha_carga })),
    ...data.maintenance.map((record) => ({ id: `m-${record.id}`, type: 'Mantenimiento', message: `${record.tipo_mantenimiento || record.titulo || 'Servicio'} en ${vehicleLabel(record)}`, date: record.created_at || record.fecha_servicio })),
    ...data.routes.map((route) => ({ id: `r-${route.id}`, type: 'Ruta', message: `${route.origen || 'Origen'} → ${route.destino || 'Destino'} · ${String(route.estatus || 'programada').replace('_', ' ')}`, date: route.updated_at || route.created_at || route.fecha_registro }))
  ].filter((item) => item.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8), [data]);

  const stats = [{ label: 'Vehículos activos', value: number(summary.activeVehicles), icon: 'V', color: 'primary' }, { label: 'Conductores registrados', value: number(data.drivers.length), icon: 'C', color: 'accent' }, { label: 'Rutas activas', value: number(summary.activeRoutes), icon: 'R', color: 'warning' }, { label: 'Combustible cargado este mes', value: `${number(summary.monthlyLiters, 2)} L`, icon: 'G', color: 'success' }];

  return <div className='dashboard'>
    <div className='dashboard-header'><h1>Dashboard Principal</h1><p className='subtitle'>Resumen operativo actualizado con información del sistema</p></div>
    {error ? <div className='dashboard-error'>{error}</div> : null}
    {loading ? <div className='dashboard-loading'>Cargando información operativa...</div> : <>
      <div className='stats-grid'>{stats.map((stat) => <div key={stat.label} className={`stat-card stat-${stat.color}`}><div className='stat-icon'>{stat.icon}</div><div className='stat-info'><p className='stat-label'>{stat.label}</p><p className='stat-value'>{stat.value}</p></div></div>)}</div>
      <div className='dashboard-grid'>
        <div className='card'><div className='card-header'>Estado actual de vehículos</div><div className='card-body'>{vehicleStatus.map((item) => <div key={item.key} className='status-item'><div className='status-info'><span className='status-label'>{item.status}</span><span className='status-count'>{item.count} unidades</span></div><div className='status-bar'><div className='status-progress' style={{ width: `${item.percentage}%`, backgroundColor: item.color }} /></div><span className='status-percentage'>{number(item.percentage, 1)}%</span></div>)}</div></div>
        <div className='card'><div className='card-header'>Acciones rápidas</div><div className='card-body actions-list'><Link to='/vehicles/create' className='action-btn'><span className='action-icon'>+</span><span className='action-text'>Añadir vehículo</span></Link><Link to='/drivers/create' className='action-btn'><span className='action-icon'>C</span><span className='action-text'>Registrar conductor</span></Link><Link to='/routes/create' className='action-btn'><span className='action-icon'>R</span><span className='action-text'>Crear ruta</span></Link><Link to='/analytics' className='action-btn'><span className='action-icon'>A</span><span className='action-text'>Ver análisis</span></Link></div></div>
      </div>
      <div className='card mt-3'><div className='card-header'>Actividad reciente</div><div className='card-body'>{activities.length ? <div className='activity-list'>{activities.map((activity) => <div key={activity.id} className='activity-item'><div className='activity-dot' /><div className='activity-content'><div className='activity-header'><span className='activity-type'>{activity.type}</span><span className='activity-time'>{relativeTime(activity.date)}</span></div><p className='activity-message'>{activity.message}</p></div></div>)}</div> : <div className='dashboard-empty'>Todavía no hay actividad operativa registrada.</div>}</div></div>
    </>}
  </div>;
}
