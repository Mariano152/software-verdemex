import * as XLSX from 'xlsx';

const normalizeText = (value) => String(value ?? '').trim();

export const normalizeLookup = (value) => normalizeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const normalizeHeader = (value) => normalizeLookup(value)
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(/[$,%\s]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBoolean = (value) => ['si', 'sí', 'true', '1', 'yes'].includes(normalizeLookup(value));

const parseDate = (value) => {
  const text = normalizeText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (!match) return '';
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  return `${year}-${String(Number(match[1])).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`;
};

const parseTime = (value) => {
  const text = normalizeText(value);
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const readRows = (workbook, expectedSheet, requiredHeaders = []) => {
  const sheetName = workbook.SheetNames.find((name) => normalizeHeader(name) === normalizeHeader(expectedSheet));
  if (!sheetName) throw new Error(`El archivo no contiene la hoja ${expectedSheet}.`);

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false
  });
  if (matrix.length < 2) throw new Error(`La hoja ${expectedSheet} no contiene registros.`);

  const headers = matrix[0].map(normalizeHeader);
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Faltan columnas obligatorias en ${expectedSheet}: ${missingHeaders.join(', ')}.`);
  }
  return matrix.slice(1)
    .map((values, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(headers.map((header, column) => [header, values[column] ?? '']))
    }))
    .filter(({ values }) => Object.values(values).some((value) => normalizeText(value)));
};

export const readExcelFile = async (file) => {
  const extension = file?.name?.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls'].includes(extension)) throw new Error('Selecciona un archivo Excel .xlsx o .xls.');
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array' });
};

export const parseDieselImport = (workbook) => readRows(workbook, 'CARGAS_DIESEL', [
  'numero_economico', 'fecha_carga', 'hora_carga', 'titulo', 'factura',
  'tipo_combustible', 'origen_carga', 'proveedor', 'kilometraje_actual',
  'litros', 'costo_total', 'm3_enviados', 'operador', 'primera_carga'
]).map(({ rowNumber, values }) => ({
  rowNumber,
  numero_economico: normalizeText(values.numero_economico),
  fecha_carga: parseDate(values.fecha_carga),
  hora_carga: parseTime(values.hora_carga),
  titulo: normalizeText(values.titulo),
  factura: normalizeText(values.factura),
  tipo_combustible: normalizeLookup(values.tipo_combustible),
  origen_carga: normalizeLookup(values.origen_carga),
  pipa_nombre: normalizeText(values.pipa_nombre),
  proveedor: normalizeText(values.proveedor),
  kilometraje_actual: parseNumber(values.kilometraje_actual),
  litros: parseNumber(values.litros),
  costo_total: parseNumber(values.costo_total),
  m3_enviados: parseNumber(values.m3_enviados),
  operador: normalizeText(values.operador),
  primera_carga: parseBoolean(values.primera_carga),
  conductor: normalizeText(values.conductor),
  observaciones: normalizeText(values.observaciones)
}));

export const parseMaintenanceImport = (workbook) => readRows(workbook, 'MANTENIMIENTOS', [
  'numero_economico', 'fecha_servicio', 'titulo', 'tipo_mantenimiento', 'costo',
  'es_cambio_aceite', 'usar_kilometraje_manual', 'kilometraje_base_aceite'
]).map(({ rowNumber, values }) => ({
  rowNumber,
  numero_economico: normalizeText(values.numero_economico),
  fecha_servicio: parseDate(values.fecha_servicio),
  titulo: normalizeText(values.titulo),
  tipo_mantenimiento: normalizeText(values.tipo_mantenimiento),
  costo: parseNumber(values.costo),
  proveedor: normalizeText(values.proveedor),
  descripcion: normalizeText(values.descripcion),
  observaciones: normalizeText(values.observaciones),
  es_cambio_aceite: parseBoolean(values.es_cambio_aceite),
  usar_kilometraje_base_manual: parseBoolean(values.usar_kilometraje_manual),
  kilometraje_base_aceite_manual: parseNumber(values.kilometraje_base_aceite)
}));

export const formatImportErrors = (errors, limit = 12) => {
  const visible = errors.slice(0, limit).map((error) => `Fila ${error.rowNumber}: ${error.message}`);
  if (errors.length > limit) visible.push(`... y ${errors.length - limit} error(es) más.`);
  return visible.join('\n');
};
