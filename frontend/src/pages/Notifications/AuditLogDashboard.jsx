import { useCallback, useEffect, useMemo, useState } from 'react';
import './AuditLogDashboard.css';

const MODULES = [
  ['todos', 'Todos'], ['vehículos', 'Vehículos'], ['rutas', 'Rutas'], ['gasolina', 'Gasolina'],
  ['mantenimiento', 'Mantenimiento'], ['inventario', 'Inventario'], ['conductores', 'Conductores'],
  ['usuarios', 'Usuarios'], ['expedientes', 'Expedientes']
];
const ACTION_LABELS = { agregar: 'Agregó', modificar: 'Modificó', eliminar: 'Eliminó' };
const MODULE_SINGULAR = { 'vehículos': 'vehículo', rutas: 'ruta', gasolina: 'registro de gasolina', mantenimiento: 'mantenimiento', inventario: 'registro de inventario', conductores: 'conductor', usuarios: 'usuario', expedientes: 'expediente' };
const formatDateTime = (value) => new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'medium' });
const friendlyTitle = (log) => String(log.title || '').startsWith('/api/') ? `Registro de ${MODULE_SINGULAR[log.module] || log.module}` : (log.title || `Registro de ${log.module}`);
const movementDescription = (log) => `${ACTION_LABELS[log.action] || log.action} ${MODULE_SINGULAR[log.module] || log.module}: ${friendlyTitle(log)}`;

export default function AuditLogDashboard() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ module: 'todos', action: 'todos', userId: 'todos', dateFrom: '', dateTo: '', search: '' });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value && value !== 'todos'));
      const response = await fetch(`/api/audit-logs?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'No se pudo cargar la bitácora');
      setLogs(data.logs || []); setUsers(data.users || []); setError('');
    } catch (loadError) { setError(loadError.message); setLogs([]); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { const timer = window.setTimeout(fetchLogs, 250); return () => window.clearTimeout(timer); }, [fetchLogs]);

  const totals = useMemo(() => ({ all: logs.length, add: logs.filter((log) => log.action === 'agregar').length, edit: logs.filter((log) => log.action === 'modificar').length, remove: logs.filter((log) => log.action === 'eliminar').length }), [logs]);
  const change = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return <div className='audit-page'>
    <div className='audit-hero'><div><span>TRAZABILIDAD</span><h1>Notificaciones y movimientos</h1><p>Consulta quién agregó, modificó o eliminó información en todo el sistema.</p></div><button type='button' onClick={fetchLogs}>Actualizar</button></div>
    <div className='audit-tabs'>{MODULES.map(([key, label]) => <button key={key} type='button' className={filters.module === key ? 'active' : ''} onClick={() => change('module', key)}>{label}</button>)}</div>
    <div className='audit-filters'>
      <label>Buscar<input type='search' value={filters.search} onChange={(event) => change('search', event.target.value)} placeholder='Título, cuenta o ruta...' /></label>
      <label>Acción<select value={filters.action} onChange={(event) => change('action', event.target.value)}><option value='todos'>Todas</option><option value='agregar'>Agregar</option><option value='modificar'>Modificar</option><option value='eliminar'>Eliminar</option></select></label>
      <label>Cuenta<select value={filters.userId} onChange={(event) => change('userId', event.target.value)}><option value='todos'>Todas</option>{users.map((user) => <option key={user.id ?? 'deleted'} value={user.id ?? 'deleted'}>{user.name}</option>)}</select></label>
      <label>Desde<input type='date' value={filters.dateFrom} onChange={(event) => change('dateFrom', event.target.value)} /></label>
      <label>Hasta<input type='date' value={filters.dateTo} onChange={(event) => change('dateTo', event.target.value)} /></label>
      <button type='button' className='audit-clear' onClick={() => setFilters({ module: 'todos', action: 'todos', userId: 'todos', dateFrom: '', dateTo: '', search: '' })}>Limpiar</button>
    </div>
    <div className='audit-summary'><div><strong>{totals.all}</strong><span>Movimientos</span></div><div><strong>{totals.add}</strong><span>Agregados</span></div><div><strong>{totals.edit}</strong><span>Modificados</span></div><div><strong>{totals.remove}</strong><span>Eliminados</span></div></div>
    <div className='audit-card'>
      {loading ? <div className='audit-empty'>Cargando movimientos...</div> : error ? <div className='audit-empty audit-error'>{error}</div> : logs.length === 0 ? <div className='audit-empty'>No hay movimientos que coincidan con los filtros.</div> : <div className='audit-table-wrap'><table className='audit-table'><thead><tr><th>Fecha y hora</th><th>Módulo</th><th>Acción</th><th>Cuenta</th><th>Qué se hizo</th><th>Detalle</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td className='audit-date'>{formatDateTime(log.created_at)}</td><td><span className={`audit-module audit-module-${log.module}`}>{log.module}</span></td><td><span className={`audit-action audit-action-${log.action}`}>{ACTION_LABELS[log.action] || log.action}</span></td><td><strong>{log.user_name || log.username || 'Cuenta eliminada'}</strong><small>@{log.username || '-'} · {log.user_email || '-'}</small></td><td><strong>{movementDescription(log)}</strong><small>Realizado por {log.user_name || log.username || 'una cuenta eliminada'}</small></td><td><details><summary>Ver cambios</summary><div className='audit-detail'><h4>Información modificada</h4><pre>{JSON.stringify(log.request_data || {}, null, 2)}</pre><h4>Resultado guardado</h4><pre>{JSON.stringify(log.response_data || {}, null, 2)}</pre><span>Código de resultado {log.status_code} · IP {log.ip_address || '-'}</span></div></details></td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}
