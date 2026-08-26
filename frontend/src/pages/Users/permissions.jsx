export const PERMISSION_GROUPS = [
  { title: 'Dashboards y reportes', items: [['dashboard.view', 'Ver dashboard principal'], ['analytics.view', 'Ver análisis y reportes']] },
  { title: 'Vehículos', items: [['vehicles.view', 'Consultar vehículos'], ['vehicles.create', 'Crear vehículos'], ['vehicles.edit', 'Editar información general'], ['vehicles.delete', 'Eliminar vehículos'], ['vehicles.parameters', 'Modificar parámetros operativos'], ['vehicles.maintenance', 'Gestionar mantenimiento y seguridad'], ['vehicles.photos', 'Gestionar fotografías'], ['vehicles.documents', 'Gestionar documentos']] },
  { title: 'Gasolina e inventario', items: [['gasoline.view', 'Consultar cargas de gasolina'], ['gasoline.manage', 'Crear, editar y eliminar cargas'], ['inventory.view', 'Consultar inventario'], ['inventory.manage', 'Modificar inventario y pipas']] },
  { title: 'Conductores', items: [['drivers.view', 'Consultar conductores'], ['drivers.manage', 'Crear y editar conductores'], ['drivers.rate', 'Calificar conductores']] },
  { title: 'Rutas', items: [['routes.view', 'Consultar rutas'], ['routes.manage', 'Crear, editar y eliminar rutas']] },
  { title: 'Administración', items: [['notifications.view', 'Ver notificaciones y bitácora de movimientos'], ['users.manage', 'Administrar otros usuarios']] }
];
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.items.map(([key]) => key));

export function PermissionSelector({ value, onChange, disabled = false }) {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (permission) => onChange(selected.includes(permission) ? selected.filter((item) => item !== permission) : [...selected, permission]);
  return <section className='form-section'><div className='permission-heading'><div><h3>Permisos del administrador</h3><p>Selecciona exactamente las funciones que podrá utilizar esta cuenta.</p></div><label className='permission-all'><input type='checkbox' checked={selected.length === ALL_PERMISSIONS.length} disabled={disabled} onChange={(event) => onChange(event.target.checked ? ALL_PERMISSIONS : [])} /> Acceso completo</label></div><div className='permission-groups'>{PERMISSION_GROUPS.map((group) => <fieldset key={group.title} disabled={disabled}><legend>{group.title}</legend>{group.items.map(([key, label]) => <label key={key} className='permission-option'><input type='checkbox' checked={selected.includes(key)} onChange={() => toggle(key)} /> <span>{label}</span></label>)}</fieldset>)}</div></section>;
}
