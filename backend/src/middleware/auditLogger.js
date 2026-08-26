import { auditLogModel } from '../models/auditLogModel.js';

const MODULES = [
  ['/api/gasoline-records', 'gasolina'], ['/api/maintenance-records', 'mantenimiento'],
  ['/api/inventory', 'inventario'], ['/api/vehicles', 'vehículos'], ['/api/drivers', 'conductores'],
  ['/api/routes', 'rutas'], ['/api/users', 'usuarios'], ['/api/expedientes', 'expedientes']
];
const ACTIONS = { POST: 'agregar', PUT: 'modificar', PATCH: 'modificar', DELETE: 'eliminar' };
const SENSITIVE_KEYS = ['password', 'confirmPassword', 'token', 'authorization', 'archivo_data', 'firma_archivo_data'];

const sanitize = (value, depth = 0) => {
  if (depth > 4) return '[contenido anidado]';
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 1500 ? `${value.slice(0, 1500)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !SENSITIVE_KEYS.includes(key)).slice(0, 80).map(([key, item]) => [key, sanitize(item, depth + 1)]));
  return String(value);
};

const parsePossibleJson = (value) => {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
};

const findEntityLabel = (value, depth = 0) => {
  if (!value || typeof value !== 'object' || depth > 3) return null;
  for (const key of ['titulo', 'title', 'numero_economico', 'username', 'nombre', 'placa', 'descripcion']) {
    if (String(value[key] || '').trim()) return value[key];
  }
  for (const item of Object.values(value)) {
    const found = findEntityLabel(item, depth + 1);
    if (found) return found;
  }
  return null;
};

const getTitle = (body = {}, response = {}, module = '') => {
  const basic = parsePossibleJson(body.basicInfo) || {};
  const candidates = [response?.vehicle?.numero_economico, response?.user?.username, response?.driver?.nombre, response?.route?.descripcion, response?.record?.titulo, response?.titulo, body.titulo, body.nombre, body.descripcion, basic.numero_economico, body.numero_economico, body.placa, body.username, body.origen && body.destino ? `${body.origen} → ${body.destino}` : null];
  return candidates.find((value) => String(value || '').trim()) || findEntityLabel(response) || findEntityLabel(body) || `Registro de ${module}`;
};

const getEntityId = (path, response = {}) => response?.id || response?.vehicle?.id || response?.user?.id || response?.driver?.id || response?.route?.id || response?.record?.id || path.split('?')[0].split('/').filter(Boolean).reverse().find((part) => /^[0-9a-f-]{8,}$/i.test(part)) || null;

export const auditLogger = (req, res, next) => {
  const action = ACTIONS[req.method];
  const moduleEntry = MODULES.find(([prefix]) => req.originalUrl.startsWith(prefix));
  if (!action || !moduleEntry) return next();

  let responsePayload = {};
  const originalJson = res.json.bind(res);
  res.json = (payload) => { responsePayload = sanitize(payload); return originalJson(payload); };

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 400 || !req.user) return;
    const body = sanitize(req.body || {});
    const files = req.files ? Object.fromEntries(Object.entries(req.files).map(([key, list]) => [key, list.map((file) => ({ name: file.originalname, type: file.mimetype, size: file.size }))])) : undefined;
    const account = req.authUser || req.user;
    auditLogModel.create({
      userId: req.user.id,
      userEmail: account.email || req.user.email,
      username: account.username || req.user.username,
      userName: [account.first_name || account.firstName, account.last_name || account.lastName].filter(Boolean).join(' ') || account.username || req.user.username,
      module: moduleEntry[1], action, entityType: moduleEntry[1], entityId: getEntityId(req.originalUrl, responsePayload),
      title: getTitle(req.body || {}, responsePayload, moduleEntry[1]), method: req.method, path: req.originalUrl.split('?')[0], statusCode: res.statusCode,
      requestData: files ? { ...body, archivos: files } : body, responseData: responsePayload,
      ipAddress: req.ip, userAgent: req.get('user-agent')
    }).catch((error) => console.error('No se pudo guardar auditoría:', error.message));
  });
  next();
};
