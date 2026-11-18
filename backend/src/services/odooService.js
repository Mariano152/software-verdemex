const DEFAULT_URL = 'https://verdemex.somoslink.com.mx/odoo';
const PAGE_SIZE = 1000;
const MAX_RECORDS = 50000;
const PAGE_CONCURRENCY = 5;

const config = () => {
  const url = String(process.env.ODOO_URL || DEFAULT_URL).replace(/\/$/, '');
  let rpcUrl = String(process.env.ODOO_RPC_URL || '').replace(/\/$/, '');
  if (!rpcUrl) {
    const parsed = new URL(url);
    rpcUrl = parsed.pathname === '/odoo' ? parsed.origin : url;
  }
  return {
    url,
    rpcUrl,
    database: process.env.ODOO_DATABASE,
    username: process.env.ODOO_USERNAME,
    apiKey: process.env.ODOO_API_KEY || process.env.ODOO_PASSWORD
  };
};

const rpc = async (service, method, args) => {
  const { rpcUrl } = config();
  const response = await fetch(`${rpcUrl}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service, method, args }, id: Date.now() })
  });
  if (!response.ok) throw new Error(`Odoo respondió HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error?.data?.message || payload.error.message || 'Error de Odoo');
  return payload.result;
};

let authCache = null;
const invoiceCache = new Map();
const INVOICE_CACHE_MS = 5 * 60 * 1000;
const authenticate = async () => {
  const settings = config();
  if (!settings.database || !settings.username || !settings.apiKey) {
    const error = new Error('La integración de Odoo no está configurada');
    error.code = 'ODOO_NOT_CONFIGURED';
    throw error;
  }
  if (authCache && authCache.expiresAt > Date.now()) return authCache.uid;
  const uid = await rpc('common', 'authenticate', [settings.database, settings.username, settings.apiKey, {}]);
  if (!uid) throw new Error('Odoo rechazó las credenciales configuradas');
  authCache = { uid, expiresAt: Date.now() + 10 * 60 * 1000 };
  return uid;
};

const execute = async (model, method, positional = [], keyword = {}) => {
  const settings = config();
  const uid = await authenticate();
  return rpc('object', 'execute_kw', [settings.database, uid, settings.apiKey, model, method, positional, keyword]);
};

const searchReadAll = async (model, domain, fields, order = 'id desc') => {
  const count = Math.min(await execute(model, 'search_count', [domain]), MAX_RECORDS);
  const offsets = Array.from({ length: Math.ceil(count / PAGE_SIZE) }, (_, index) => index * PAGE_SIZE);
  const records = [];
  for (let index = 0; index < offsets.length; index += PAGE_CONCURRENCY) {
    const batch = offsets.slice(index, index + PAGE_CONCURRENCY);
    const pages = await Promise.all(batch.map((offset) => execute(model, 'search_read', [domain], {
      fields,
      offset,
      limit: Math.min(PAGE_SIZE, count - offset),
      order
    })));
    pages.forEach((page) => records.push(...page));
  }
  return records;
};

const relation = (value) => Array.isArray(value) ? { id: value[0], name: value[1] } : null;
const number = (value) => Number(value) || 0;

export const odooService = {
  getPublicConfig() {
    const settings = config();
    return {
      configured: Boolean(settings.database && settings.username && settings.apiKey),
      url: settings.url
    };
  },

  async getSales({ from, to, states = [], includeLines = true }) {
    const domain = [];
    if (from) domain.push(['date_order', '>=', `${from} 00:00:00`]);
    if (to) domain.push(['date_order', '<=', `${to} 23:59:59`]);
    if (states.length) domain.push(['state', 'in', states]);

    const orderFields = [
      'name', 'date_order', 'state', 'partner_id', 'user_id', 'team_id', 'company_id',
      'currency_id', 'amount_untaxed', 'amount_tax', 'amount_total', 'invoice_status',
      'commitment_date', 'create_date', 'write_date', 'order_line'
    ];
    const rawOrders = await searchReadAll('sale.order', domain, orderFields, 'date_order asc, id asc');
    const orders = rawOrders.map((order) => ({
      id: order.id,
      number: order.name,
      date: order.date_order,
      state: order.state,
      customer: relation(order.partner_id),
      salesperson: relation(order.user_id),
      team: relation(order.team_id),
      company: relation(order.company_id),
      currency: relation(order.currency_id),
      untaxed: number(order.amount_untaxed),
      tax: number(order.amount_tax),
      total: number(order.amount_total),
      invoiceStatus: order.invoice_status || null,
      commitmentDate: order.commitment_date || null,
      createdAt: order.create_date,
      updatedAt: order.write_date,
      lineIds: order.order_line || []
    }));

    let lines = [];
    const lineIds = orders.flatMap((order) => order.lineIds);
    if (includeLines && lineIds.length) {
      const rawLines = await searchReadAll('sale.order.line', [['id', 'in', lineIds]], [
        'order_id', 'product_id', 'product_uom_qty', 'qty_delivered', 'qty_invoiced',
        'price_unit', 'discount', 'price_subtotal', 'price_tax', 'price_total'
      ]);
      lines = rawLines.map((line) => ({
        id: line.id,
        orderId: relation(line.order_id)?.id,
        product: relation(line.product_id),
        quantity: number(line.product_uom_qty),
        delivered: number(line.qty_delivered),
        invoiced: number(line.qty_invoiced),
        unitPrice: number(line.price_unit),
        discount: number(line.discount),
        subtotal: number(line.price_subtotal),
        tax: number(line.price_tax),
        total: number(line.price_total)
      }));
    }

    return { orders, lines, truncated: rawOrders.length >= MAX_RECORDS, fetchedAt: new Date().toISOString() };
  },

  async getCustomerInvoices({ from, to, includeLines = true, forceRefresh = false }) {
    const cacheKey = `${from || 'all'}:${to || 'all'}:${includeLines}`;
    const cached = invoiceCache.get(cacheKey);
    if (!forceRefresh && cached?.expiresAt > Date.now()) return cached.value;
    const domain = [
      ['move_type', '=', 'out_invoice'],
      ['state', '=', 'posted'],
      ['payment_state', 'in', ['paid', 'not_paid', 'partial']]
    ];
    if (from) domain.push(['invoice_date', '>=', from]);
    if (to) domain.push(['invoice_date', '<=', to]);

    const invoiceFields = [
      'name', 'invoice_date', 'invoice_date_due', 'partner_id', 'invoice_user_id',
      'team_id', 'company_id', 'currency_id', 'amount_untaxed', 'amount_tax',
      'amount_total', 'amount_residual', 'payment_state', 'x_studio_planta',
      'l10n_mx_edi_payment_policy', 'invoice_origin', 'create_date', 'write_date',
      'invoice_line_ids'
    ];
    const rawInvoices = await searchReadAll('account.move', domain, invoiceFields, 'invoice_date asc, id asc');
    const orders = rawInvoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.name,
      date: `${invoice.invoice_date} 00:00:00`,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.invoice_date_due || null,
      state: 'sale',
      paymentState: invoice.payment_state || 'not_paid',
      paymentPolicy: invoice.l10n_mx_edi_payment_policy || null,
      plant: invoice.x_studio_planta || 'Sin planta',
      origin: invoice.invoice_origin || null,
      customer: relation(invoice.partner_id),
      salesperson: relation(invoice.invoice_user_id),
      team: relation(invoice.team_id),
      company: relation(invoice.company_id),
      currency: relation(invoice.currency_id),
      untaxed: number(invoice.amount_untaxed),
      tax: number(invoice.amount_tax),
      total: number(invoice.amount_total),
      residual: Math.max(0, number(invoice.amount_residual)),
      paidAmount: Math.max(0, number(invoice.amount_total) - number(invoice.amount_residual)),
      createdAt: invoice.create_date,
      updatedAt: invoice.write_date,
      lineIds: invoice.invoice_line_ids || []
    }));

    let lines = [];
    const lineIds = orders.flatMap((invoice) => invoice.lineIds);
    if (includeLines && lineIds.length) {
      const rawLines = await searchReadAll('account.move.line', [['id', 'in', lineIds]], [
        'move_id', 'product_id', 'name', 'quantity', 'price_unit', 'discount',
        'price_subtotal', 'price_total', 'display_type'
      ]);
      lines = rawLines.filter((line) => line.display_type === 'product' || line.product_id).map((line) => ({
        id: line.id,
        orderId: relation(line.move_id)?.id,
        product: relation(line.product_id) || { id: `description-${line.id}`, name: line.name || 'Concepto sin producto' },
        quantity: number(line.quantity),
        delivered: 0,
        invoiced: number(line.quantity),
        unitPrice: number(line.price_unit),
        discount: number(line.discount),
        subtotal: number(line.price_subtotal),
        tax: number(line.price_total) - number(line.price_subtotal),
        total: number(line.price_total)
      }));
    }

    const result = {
      orders,
      lines,
      source: 'account.move',
      truncated: rawInvoices.length >= MAX_RECORDS,
      fetchedAt: new Date().toISOString()
    };
    if (invoiceCache.size >= 6) invoiceCache.delete(invoiceCache.keys().next().value);
    invoiceCache.set(cacheKey, { value: result, expiresAt: Date.now() + INVOICE_CACHE_MS });
    return result;
  }
};
