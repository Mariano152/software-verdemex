import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import './SalesDashboard.css';

const STATE_LABELS = { draft: 'Cotización', sent: 'Enviada', sale: 'Orden de venta', done: 'Bloqueada', cancel: 'Cancelada' };
const PAYMENT_LABELS = { paid: 'Pagado', not_paid: 'Sin pagar', partial: 'Pagado parcialmente', in_payment: 'En proceso de pago', reversed: 'Revertido', blocked: 'Bloqueado' };
const localIso = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const money = (value, currency = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
const number = (value) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value || 0);
const percent = (value) => `${value > 0 ? '+' : ''}${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
const relationName = (value) => value?.name || 'Sin asignar';
const dateLabel = (value) => value ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value.replace(' ', 'T'))) : '—';
const delta = (current, previous) => previous ? ((current - previous) / Math.abs(previous)) * 100 : (current ? 100 : 0);
const summarize = (orders) => { const subtotal = orders.reduce((sum, item) => sum + item.untaxed, 0); return { subtotal, count: orders.length, average: orders.length ? subtotal / orders.length : 0 }; };
const asDate = (value) => new Date(value.replace(' ', 'T'));
const addMonths = (date, months) => {
  const result = new Date(date); const targetMonth = result.getMonth() + months; const day = result.getDate();
  result.setDate(1); result.setMonth(targetMonth); result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
};
const monthsBetween = (earlier, later) => addMonths(earlier, 18) <= later;

const classifyCommercialHistory = (orders, lines) => {
  const effective = orders.filter((order) => ['sale', 'done'].includes(order.state) && order.customer?.id).sort((a, b) => a.date.localeCompare(b.date));
  const histories = new Map(); const orderClassification = new Map(); const events = [];
  effective.forEach((order) => {
    const customerId = order.customer.id; const date = asDate(order.date); const history = histories.get(customerId);
    let classification = 'existing'; let recognitionStart = null;
    if (!history) { classification = 'new'; recognitionStart = date; events.push({ type: 'new', date, orderId: order.id, customerId }); }
    else {
      if (history.recognitionStart && date < addMonths(history.recognitionStart, 2)) { classification = history.classification; recognitionStart = history.recognitionStart; }
      else if (monthsBetween(asDate(history.lastDate), date)) { classification = 'recovered'; recognitionStart = date; events.push({ type: 'recovered', date, orderId: order.id, customerId }); }
    }
    histories.set(customerId, { lastDate: order.date, classification, recognitionStart }); orderClassification.set(order.id, classification);
  });

  const orderById = new Map(effective.map((order) => [order.id, order])); const productStarts = new Map(); const businessEvents = [];
  lines.filter((line) => line.product?.id && orderById.has(line.orderId)).sort((a, b) => orderById.get(a.orderId).date.localeCompare(orderById.get(b.orderId).date)).forEach((line) => {
    const order = orderById.get(line.orderId); const key = `${order.customer.id}:${line.product.id}`;
    if (!productStarts.has(key)) {
      const firstDate = asDate(order.date); const isExistingClient = orderClassification.get(order.id) === 'existing';
      productStarts.set(key, { date: firstDate, eligible: isExistingClient, customerId: order.customer.id, productId: line.product.id, orderId: order.id });
      if (isExistingClient) businessEvents.push({ date: firstDate, customerId: order.customer.id, productId: line.product.id, orderId: order.id });
    }
  });
  return { effective, orderClassification, events, productStarts, businessEvents, orderById };
};
const bucket = (value, granularity) => {
  const date = new Date(value.replace(' ', 'T'));
  if (granularity === 'week') { const day = (date.getDay() + 6) % 7; date.setDate(date.getDate() - day); return { key: localIso(date), label: `Sem ${new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(date)}` }; }
  if (granularity === 'quarter') return { key: `${date.getFullYear()}-${Math.floor(date.getMonth() / 3)}`, label: `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}` };
  if (granularity === 'year') return { key: `${date.getFullYear()}`, label: `${date.getFullYear()}` };
  return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' }).format(date) };
};

function Bars({ rows, currency, valueFormatter, color = '#5B8DEF' }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <div className={`sales-bars ${rows.length > 8 ? 'sales-bars-scroll' : ''}`}>{rows.map((row) => <div className='sales-bar-row' key={row.label}><div><span>{row.label}</span><strong>{valueFormatter ? valueFormatter(row.value) : money(row.value, currency)}</strong></div><i><b style={{ width: `${Math.max(row.value / max * 100, 1)}%`, background: color }} /></i></div>)}</div>;
}
function Metric({ label, value, change, detail }) {
  return <article className='sales-metric'><span>{label}</span><strong>{value}</strong><div>{change !== null && change !== undefined && <em className={change >= 0 ? 'positive' : 'negative'}>{percent(change)}</em>}<small>{detail}</small></div></article>;
}
function ClassificationCard({ tone, label, count, revenue, detail, currency }) {
  return <article className={`sales-classification-card ${tone}`}><div><span>{label}</span><strong>{number(count)}</strong></div><p>{money(revenue, currency)} <em>subtotal</em></p><small>{detail}</small></article>;
}

export default function SalesDashboard() {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`);
  const [to, setTo] = useState(localIso(today));
  const [granularity, setGranularity] = useState('month');
  const [data, setData] = useState({ orders: [], lines: [] });
  const [filters, setFilters] = useState({ salesperson: '', team: '', customer: '', company: '', plant: '', paymentState: '' });
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(8);
  const [error, setError] = useState('');
  const loadStartedAt = useRef(0);
  const deferredFilters = useDeferredValue(filters);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true); setLoadProgress(8); setError(''); loadStartedAt.current = Date.now();
    try {
      const params = new URLSearchParams({ includeLines: 'true' });
      if (forceRefresh) params.set('refresh', 'true');
      const response = await fetch(`/api/sales?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No fue posible consultar las ventas de Odoo');
      setLoadProgress(100); setData(payload);
      localStorage.setItem('odooLoadMs', String(Date.now() - loadStartedAt.current));
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    if (!loading) return undefined;
    const expected = Math.max(8000, Number(localStorage.getItem('odooLoadMs')) || 30000);
    const timer = setInterval(() => {
      const elapsed = Date.now() - loadStartedAt.current;
      setLoadProgress(Math.min(92, Math.max(8, Math.round((elapsed / expected) * 85))));
    }, 500);
    return () => clearInterval(timer);
  }, [loading]);

  const dimensions = useMemo(() => {
    const unique = (key) => [...new Map(data.orders.map((order) => [order[key]?.id, order[key]]).filter(([id]) => id)).values()].sort((a, b) => a.name.localeCompare(b.name));
    const plants = [...new Set(data.orders.map((order) => order.plant || 'Sin planta'))].sort();
    return { salesperson: unique('salesperson'), team: unique('team'), customer: unique('customer'), company: unique('company'), plants };
  }, [data.orders]);
  const scoped = useMemo(() => data.orders.filter((order) => {
    return ['salesperson', 'team', 'customer', 'company'].every((key) => !deferredFilters[key] || String(order[key]?.id) === deferredFilters[key])
      && (!deferredFilters.plant || order.plant === deferredFilters.plant)
      && (!deferredFilters.paymentState || order.paymentState === deferredFilters.paymentState);
  }), [data.orders, deferredFilters]);
  const comparison = useMemo(() => {
    const start = new Date(`${from}T00:00:00`); const end = new Date(`${to}T23:59:59`); const span = end - start;
    const select = (a, b) => scoped.filter((order) => { const date = new Date(order.date.replace(' ', 'T')); return date >= a && date <= b; });
    const previousStart = new Date(start.getTime() - span - 1); const previousEnd = new Date(start.getTime() - 1);
    const current = select(start, end); const previous = select(previousStart, previousEnd);
    return { current, previous, now: summarize(current), before: summarize(previous), start, end, previousStart, previousEnd };
  }, [scoped, from, to]);
  const trend = useMemo(() => {
    const grouped = new Map(); comparison.current.forEach((order) => { const item = bucket(order.date, granularity); const row = grouped.get(item.key) || { ...item, value: 0, count: 0 }; row.value += order.untaxed; row.count += 1; grouped.set(item.key, row); });
    return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [comparison, granularity]);
  const rankings = useMemo(() => {
    const rank = (key) => { const map = new Map(); comparison.current.forEach((order) => map.set(relationName(order[key]), (map.get(relationName(order[key])) || 0) + order.untaxed)); return [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); };
    const ids = new Set(comparison.current.map((order) => order.id)); const products = new Map();
    data.lines.filter((line) => ids.has(line.orderId)).forEach((line) => products.set(relationName(line.product), (products.get(relationName(line.product)) || 0) + line.subtotal));
    return { customers: rank('customer'), sellers: rank('salesperson'), products: [...products].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value) };
  }, [comparison, data.lines]);
  const accounting = useMemo(() => {
    const rows = comparison.current;
    const total = rows.reduce((sum, invoice) => sum + invoice.total, 0);
    const outstandingRows = rows.filter((invoice) => ['not_paid', 'partial'].includes(invoice.paymentState));
    const outstanding = outstandingRows.reduce((sum, invoice) => sum + invoice.residual, 0);
    const collected = rows.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    const byStatus = ['paid', 'not_paid', 'partial'].map((status) => ({
      key: status,
      label: PAYMENT_LABELS[status],
      count: rows.filter((invoice) => invoice.paymentState === status).length,
      value: rows.filter((invoice) => invoice.paymentState === status).reduce((sum, invoice) => sum + invoice.total, 0)
    }));
    const plantMap = new Map();
    rows.forEach((invoice) => plantMap.set(invoice.plant || 'Sin planta', (plantMap.get(invoice.plant || 'Sin planta') || 0) + invoice.untaxed));
    const plants = [...plantMap].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    return { total, collected, outstanding, pendingCount: outstandingRows.length, byStatus, plants };
  }, [comparison]);
  const commercialHistory = useMemo(() => classifyCommercialHistory(data.orders, data.lines), [data.orders, data.lines]);
  const commercial = useMemo(() => {
    const history = commercialHistory; const currentConfirmed = comparison.current.filter((order) => ['sale', 'done'].includes(order.state) && order.customer?.id);
    const currentIds = new Set(currentConfirmed.map((order) => order.id)); const activeCustomers = new Set(currentConfirmed.map((order) => order.customer.id));
    const orderRevenue = (category) => currentConfirmed.filter((order) => history.orderClassification.get(order.id) === category).reduce((sum, order) => sum + order.untaxed, 0);
    const classifiedCustomers = (category) => new Set(currentConfirmed.filter((order) => history.orderClassification.get(order.id) === category).map((order) => order.customer.id)).size;
    const eventCount = (type) => new Set(history.events.filter((event) => event.type === type && currentIds.has(event.orderId)).map((event) => event.customerId)).size;
    let newBusinessRevenue = 0;
    data.lines.filter((line) => currentIds.has(line.orderId) && line.product?.id).forEach((line) => {
      const order = history.orderById.get(line.orderId); const start = order ? history.productStarts.get(`${order.customer.id}:${line.product.id}`) : null;
      if (order && start?.eligible && asDate(order.date) < addMonths(start.date, 2)) newBusinessRevenue += line.subtotal;
    });
    const newBusinessCount = new Set(history.businessEvents.filter((event) => currentIds.has(event.orderId)).map((event) => `${event.customerId}:${event.productId}`)).size;

    const latestByCustomer = new Map();
    history.effective.forEach((order) => { if (activeCustomers.has(order.customer.id)) latestByCustomer.set(order.customer.id, order); });
    const portfolioMap = new Map();
    latestByCustomer.forEach((order) => { const seller = relationName(order.salesperson); portfolioMap.set(seller, (portfolioMap.get(seller) || 0) + 1); });
    const portfolio = [...portfolioMap].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    const oldestConfirmed = history.effective[0]?.date || null; const coverageTarget = addMonths(new Date(`${to}T23:59:59`), -18);
    return {
      activeCustomers: activeCustomers.size,
      portfolio,
      newClients: eventCount('new'),
      newClientRevenue: orderRevenue('new'),
      recognizedNewClients: classifiedCustomers('new'),
      recoveredClients: eventCount('recovered'),
      recoveredRevenue: orderRevenue('recovered'),
      recognizedRecoveredClients: classifiedCustomers('recovered'),
      existingClients: classifiedCustomers('existing'),
      existingRevenue: Math.max(0, orderRevenue('existing') - newBusinessRevenue),
      newBusinessCount,
      newBusinessRevenue,
      oldestConfirmed,
      hasRecoveryCoverage: Boolean(oldestConfirmed && asDate(oldestConfirmed) <= coverageTarget)
    };
  }, [comparison, commercialHistory, data.lines, to]);

  const exportCsv = () => {
    const rows = [['Factura', 'Fecha', 'Vencimiento', 'Estado de pago', 'Cliente', 'Vendedor', 'Planta', 'Subtotal sin impuestos', 'Total', 'Saldo pendiente'], ...comparison.current.map((order) => [order.number, order.invoiceDate, order.dueDate, PAYMENT_LABELS[order.paymentState] || order.paymentState, relationName(order.customer), relationName(order.salesperson), order.plant, order.untaxed, order.total, order.residual])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `facturas-clientes-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const remainingSeconds = Math.max(1, Math.ceil(((Math.max(8000, Number(localStorage.getItem('odooLoadMs')) || 30000) * (100 - loadProgress)) / 100) / 1000));
  if (loading && !data.fetchedAt) return <div className='sales-state'><div className='sales-loader' /><h2>Cargando Odoo</h2><p>Obteniendo facturas, clientes, pagos y productos…</p><div className='sales-loading-progress' role='progressbar' aria-valuemin='0' aria-valuemax='100' aria-valuenow={loadProgress}><i style={{ width: `${loadProgress}%` }} /></div><small>{loadProgress}% · aproximadamente {remainingSeconds} s restantes</small></div>;
  if (error && !data.fetchedAt) return <div className='sales-state sales-error'><span>!</span><h2>No se pudo conectar con Odoo</h2><p>{error}</p><button onClick={() => load(true)}>Reintentar</button><small>Configura ODOO_DATABASE, ODOO_USERNAME y ODOO_API_KEY en el backend.</small></div>;
  const currency = comparison.current.find((order) => order.currency)?.currency?.name || 'MXN';
  const maxTrend = Math.max(...trend.map((item) => item.value), 1);
  const currentPeriodLabel = `${dateLabel(from)} al ${dateLabel(to)}`;
  const previousPeriodLabel = `${dateLabel(localIso(comparison.previousStart))} al ${dateLabel(localIso(comparison.previousEnd))}`;
  const collectedPercent = accounting.total > 0 ? Math.min(100, Math.max(0, accounting.collected / accounting.total * 100)) : 0;

  return <div className='sales-dashboard'>
    {loading && <div className='sales-refresh-progress'><div><span>Cargando datos de Odoo…</span><small>aprox. {remainingSeconds} s</small></div><i><b style={{ width: `${loadProgress}%` }} /></i></div>}
    <section className='sales-hero'><div><span>ODOO · CONTABILIDAD</span><h1>Facturas de clientes</h1><p>Facturación, cobranza, saldos pendientes y desempeño comercial conciliados desde Contabilidad.</p></div><div><button className='secondary' onClick={exportCsv} disabled={!comparison.current.length}>Exportar CSV</button><button onClick={() => load(true)} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar Odoo'}</button></div></section>
    {error && <div className='sales-inline-error'>{error}</div>}{data.truncated && <div className='sales-warning'>La consulta alcanzó 50,000 facturas. Reduce el rango de fechas.</div>}
    <section className='sales-filters'>
      <label><span>Desde</span><input type='date' value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label><label><span>Hasta</span><input type='date' value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
      {['salesperson', 'team', 'customer', 'company'].map((key) => <label key={key}><span>{{ salesperson: 'Vendedor', team: 'Equipo', customer: 'Cliente', company: 'Compañía' }[key]}</span><select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}><option value=''>Todos</option>{dimensions[key].map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>)}
      <label><span>Planta</span><select value={filters.plant} onChange={(e) => setFilters({ ...filters, plant: e.target.value })}><option value=''>Todas</option>{dimensions.plants.map((plant) => <option value={plant} key={plant}>{plant}</option>)}</select></label>
      <label><span>Estado de pago</span><select value={filters.paymentState} onChange={(e) => setFilters({ ...filters, paymentState: e.target.value })}><option value=''>Todos</option><option value='paid'>Pagado</option><option value='not_paid'>Sin pagar</option><option value='partial'>Pagado parcialmente</option></select></label>
    </section>
    <section className='sales-metrics'><Metric label='Subtotal facturado' value={money(comparison.now.subtotal, currency)} change={delta(comparison.now.subtotal, comparison.before.subtotal)} detail='sin impuestos · vs. periodo anterior' /><Metric label='Facturas' value={number(comparison.now.count)} change={delta(comparison.now.count, comparison.before.count)} detail={`${number(comparison.before.count)} en el periodo anterior`} /><Metric label='Ticket promedio' value={money(comparison.now.average, currency)} change={delta(comparison.now.average, comparison.before.average)} detail='subtotal promedio por factura · vs. anterior' /><Metric label='Subtotal periodo anterior' value={money(comparison.before.subtotal, currency)} change={null} detail={previousPeriodLabel} /></section>
    <div className='sales-comparison-note'><b>Comparación:</b> los porcentajes verdes o rojos comparan <strong>{currentPeriodLabel}</strong> contra el periodo inmediatamente anterior de la misma duración, <strong>{previousPeriodLabel}</strong>. Un porcentaje positivo indica crecimiento y uno negativo, disminución.</div>
    <section className='sales-accounting-summary'>
      <article className='sales-accounting-total'><span>Total facturado</span><strong>{money(accounting.total, currency)}</strong><small>Importe contable con impuestos</small></article>
      <article className='sales-accounting-paid'><span>Cobrado</span><strong>{money(accounting.collected, currency)}</strong><small>Total menos saldo residual</small></article>
      <article className='sales-accounting-due'><span>Falta por cobrar</span><strong>{money(accounting.outstanding, currency)}</strong><small>{number(accounting.pendingCount)} facturas sin pagar o parciales</small></article>
    </section>
    <div className='sales-split sales-accounting-charts'>
      <section className='sales-panel sales-payment-panel'><header><div><span>COBRANZA</span><h2>Pagado y pendiente</h2></div><div className='sales-collected-percent'><strong>{collectedPercent.toFixed(1)}%</strong><small>del dinero pagado</small></div></header>
        <div className='sales-payment-track' aria-label='Distribución entre cobrado y pendiente'><div className='paid' style={{ width: `${accounting.total ? accounting.collected / accounting.total * 100 : 0}%` }} /><div className='due' style={{ width: `${accounting.total ? accounting.outstanding / accounting.total * 100 : 0}%` }} /></div>
        <div className='sales-payment-legend'><div><i className='paid' /><span>Cobrado</span><strong>{money(accounting.collected, currency)}</strong></div><div><i className='due' /><span>Pendiente</span><strong>{money(accounting.outstanding, currency)}</strong></div></div>
        <div className='sales-payment-states'>{accounting.byStatus.map((row) => <div key={row.key} className={row.key}><span>{row.label}</span><strong>{number(row.count)}</strong><small>{money(row.value, currency)}</small></div>)}</div>
      </section>
      <section className='sales-panel'><header><div><span>PLANTAS</span><h2>Subtotal facturado por planta</h2></div><small>Sin impuestos</small></header>{accounting.plants.length ? <Bars rows={accounting.plants} currency={currency} color='#26A69A' /> : <div className='sales-empty'>Sin facturas en el periodo</div>}</section>
    </div>
    <section className='sales-classification-section'>
      <header><div><span>CLASIFICACIÓN COMERCIAL</span><h2>Composición y crecimiento de la cartera</h2><p>Reglas de la Política Comercial VerdeMex · reconocimiento de 2 meses · recuperación después de 18 meses.</p></div><div className='sales-portfolio-total'><small>Cartera activa</small><strong>{number(commercial.activeCustomers)}</strong><span>clientes únicos en el periodo</span></div></header>
      {!commercial.hasRecoveryCoverage && commercial.oldestConfirmed && <div className='sales-coverage-warning'><b>Cobertura histórica limitada:</b> Odoo contiene facturas publicadas desde {dateLabel(commercial.oldestConfirmed)}. Para validar clientes recuperados y descartar antecedentes de clientes nuevos se requieren al menos 18 meses previos.</div>}
      <div className='sales-classification-grid'>
        <ClassificationCard tone='blue' label='Clientes nuevos' count={commercial.newClients} revenue={commercial.newClientRevenue} detail={`${commercial.recognizedNewClients} con ingresos en reconocimiento`} currency={currency} />
        <ClassificationCard tone='purple' label='Clientes recuperados' count={commercial.recoveredClients} revenue={commercial.recoveredRevenue} detail={`${commercial.recognizedRecoveredClients} dentro de sus primeros 2 meses`} currency={currency} />
        <ClassificationCard tone='orange' label='Negocios nuevos' count={commercial.newBusinessCount} revenue={commercial.newBusinessRevenue} detail='Nuevos productos en clientes existentes' currency={currency} />
        <ClassificationCard tone='teal' label='Clientes existentes' count={commercial.existingClients} revenue={commercial.existingRevenue} detail='Cartera recurrente fuera de reconocimiento' currency={currency} />
      </div>
    </section>
    <section className='sales-panel sales-trend'><header><div><span>TENDENCIA</span><h2>Evolución de subtotales facturados</h2></div><nav>{[['week', 'Semanas'], ['month', 'Meses'], ['quarter', 'Trimestres'], ['year', 'Años']].map(([value, label]) => <button className={granularity === value ? 'active' : ''} onClick={() => setGranularity(value)} key={value}>{label}</button>)}</nav></header>{trend.length ? <div className='sales-chart'>{trend.map((row) => <div className='sales-column' key={row.key} title={`${row.label}: ${money(row.value, currency)}`}><strong>{money(row.value, currency)}</strong><i><b style={{ height: `${Math.max(row.value / maxTrend * 100, 2)}%`, background: '#5B8DEF' }} /></i><span>{row.label}</span><small>{row.count} facturas</small></div>)}</div> : <div className='sales-empty'>No hay facturas para los filtros seleccionados.</div>}</section>
    <div className='sales-stacked'><section className='sales-panel'><header><div><span>CARTERA</span><h2>Clientes activos por vendedor</h2></div><small>{filters.salesperson ? 'Vendedor seleccionado' : 'Todos los vendedores'}</small></header>{commercial.portfolio.length ? <Bars rows={commercial.portfolio} valueFormatter={(value) => `${number(value)} clientes`} color='#26A69A' /> : <div className='sales-empty'>Sin clientes activos en el periodo</div>}</section><section className='sales-panel sales-policy-note'><header><div><span>CRITERIO</span><h2>Cómo se están midiendo</h2></div></header><ul><li><b>Nuevo:</b> primera factura publicada de toda la historia.</li><li><b>Recuperado:</b> regreso tras 18 meses consecutivos sin facturación.</li><li><b>Negocio nuevo:</b> primer producto diferente facturado a un cliente existente.</li><li><b>Vigencia:</b> 2 meses fecha a fecha; sin duplicar cliente y negocio nuevo.</li></ul><small>La identificación por producto depende del catálogo registrado en Odoo.</small></section></div>
    <div className='sales-split'><section className='sales-panel'><header><div><span>CLIENTES</span><h2>Principales cuentas por subtotal</h2></div></header>{rankings.customers.length ? <Bars rows={rankings.customers} currency={currency} color='#9B6EE7' /> : <div className='sales-empty'>Sin datos</div>}</section><section className='sales-panel'><header><div><span>EQUIPO</span><h2>Subtotal por vendedor</h2></div></header>{rankings.sellers.length ? <Bars rows={rankings.sellers} currency={currency} color='#3AA9D8' /> : <div className='sales-empty'>Sin datos</div>}</section></div>
    <div className='sales-stacked sales-bottom'><section className='sales-panel'><header><div><span>PORTAFOLIO</span><h2>Productos con mayor subtotal</h2></div></header>{rankings.products.length ? <Bars rows={rankings.products} currency={currency} color='#F2A93B' /> : <div className='sales-empty'>Sin líneas de factura</div>}</section><section className='sales-panel sales-orders'><header><div><span>DETALLE</span><h2>Últimas facturas</h2></div><small>{comparison.current.length} resultados</small></header><div className='sales-table-wrap'><table><thead><tr><th>Factura</th><th>Cliente</th><th>Planta</th><th>Fecha</th><th>Vencimiento</th><th>Estado de pago</th><th>Subtotal</th><th>Saldo</th></tr></thead><tbody>{[...comparison.current].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map((order) => <tr key={order.id}><td data-label='Factura'><strong>{order.number}</strong><small>{relationName(order.salesperson)}</small></td><td data-label='Cliente'>{relationName(order.customer)}</td><td data-label='Planta'>{order.plant}</td><td data-label='Fecha'>{dateLabel(order.invoiceDate)}</td><td data-label='Vencimiento'>{dateLabel(order.dueDate)}</td><td data-label='Estado'><span className={`sales-status ${order.paymentState}`}>{PAYMENT_LABELS[order.paymentState] || order.paymentState}</span></td><td data-label='Subtotal'><strong>{money(order.untaxed, order.currency?.name || currency)}</strong></td><td data-label='Saldo'><strong>{money(order.residual, order.currency?.name || currency)}</strong></td></tr>)}</tbody></table></div></section></div>
    <footer className='sales-sync'>Última sincronización: {data.fetchedAt ? dateLabel(data.fetchedAt) : '—'} · Fuente: Odoo Contabilidad → Clientes → Facturas</footer>
  </div>;
}
