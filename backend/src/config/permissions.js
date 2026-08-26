export const SUPERUSER_IDENTIFIERS = ['adminverdemex.local', 'admin@verdemex.local'];

export const PERMISSIONS = [
  'dashboard.view', 'analytics.view',
  'vehicles.view', 'vehicles.create', 'vehicles.edit', 'vehicles.delete',
  'vehicles.parameters', 'vehicles.maintenance', 'vehicles.photos', 'vehicles.documents',
  'gasoline.view', 'gasoline.manage', 'inventory.view', 'inventory.manage',
  'drivers.view', 'drivers.manage', 'drivers.rate',
  'routes.view', 'routes.manage', 'notifications.view', 'users.manage'
];

export const isSuperuser = (user) => [user?.username, user?.email]
  .some((value) => SUPERUSER_IDENTIFIERS.includes(String(value || '').toLowerCase()));

export const sanitizePermissions = (permissions) => {
  const selected = new Set(Array.isArray(permissions) ? permissions.filter((permission) => PERMISSIONS.includes(permission)) : []);
  const dependencies = {
    'vehicles.create': 'vehicles.view', 'vehicles.edit': 'vehicles.view', 'vehicles.delete': 'vehicles.view',
    'vehicles.parameters': 'vehicles.view', 'vehicles.maintenance': 'vehicles.view', 'vehicles.photos': 'vehicles.view', 'vehicles.documents': 'vehicles.view',
    'gasoline.manage': 'gasoline.view', 'inventory.manage': 'inventory.view',
    'drivers.manage': 'drivers.view', 'drivers.rate': 'drivers.view', 'routes.manage': 'routes.view'
  };
  selected.forEach((permission) => { if (dependencies[permission]) selected.add(dependencies[permission]); });
  return [...selected];
};
