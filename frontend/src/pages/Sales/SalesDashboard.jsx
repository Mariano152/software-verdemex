import { useCallback, useEffect, useMemo, useState } from 'react';
import './SalesDashboard.css';

const STATE_LABELS = { draft: 'Cotización', sent: 'Enviada', sale: 'Orden de venta', done: 'Bloqueada', cancel: 'Cancelada' };
const CHART_COLORS = ['#5B8DEF', '#9B6EE7', '#F2A93B', '#26A69A', '#EF6C78', '#46A758', '#F07F42', '#3AA9D8'];
const localIso = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const money = (value, currency = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
const number = (value) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value || 0);
const percent = (value) => `${value > 0 ? '+' : ''}${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
const relationName = (value) => value?.name || 'Sin asignar';
const dateLabel = (value) => value ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value.replace(' ', 'T'))) : '—';
const delta = (current, previous) => previous ? ((current - previous) / Math.abs(previous)) * 100 : (current ? 100 : 0);
const summarize = (orders) => { const total = orders.reduce((sum, item) => sum + item.total, 0); return { total, count: orders.length, average: orders.length ? total / orders.length : 0, tax: orders.reduce((sum, item) => sum + item.tax, 0), untaxed: orders.reduce((sum, item) => sum + item.untaxed, 0) }; };
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
    const customerId = order.customer.id; const date = asDate(order.date); const history = histories.get(customerId) || [];
    let classification = 'existing'; let recognitionStart = null;
    if (!history.length) { classification = 'new'; recognitionStart = date; events.push({ type: 'new', date, orderId: order.id, customerId }); }
    else {
      const activeRecognition = [...history].reverse().find((item) => item.recognitionStart && date < addMonths(item.recognitionStart, 2));
      if (activeRecognition) { classification = activeRecognition.classification; recognitionStart = activeRecognition.recognitionStart; }
      else if (monthsBetween(asDate(history.at(-1).date), date)) { classification = 'recovered'; recognitionStart = date; events.push({ type: 'recovered', date, orderId: order.id, customerId }); }
    }
    const item = { ...order, classification, recognitionStart };
    history.push(item); histories.set(customerId, history); orderClassification.set(order.id, classification);
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

function Bars({ rows, currency, valueFormatter }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return <div className='sales-bars'>{rows.map((row, index) => <div className='sales-bar-row' key={row.label}><div><span>{row.label}</span><strong>{valueFormatter ? valueFormatter(row.value) : money(row.value, currency)}</strong></div><i><b style={{ width: `${Math.max(row.value / max * 100, 1)}%`, background: `linear-gradient(90deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${CHART_COLORS[(index + 1) % CHART_COLORS.length]})` }} /></i></div>)}</div>;
}
function Metric({ label, value, change, detail }) {
  return <article className='sales-metric'><span>{label}</span><strong>{value}</strong><div><em className={change >= 0 ? 'positive' : 'negative'}>{percent(change)}</em><small>{detail}</small></div></article>;
}
function ClassificationCard({ tone, label, count, revenue, detail, currency }) {
  return <article className={`sales-classification-card ${tone}`}><div><span>{label}</span><strong>{number(count)}</strong></div><p>{money(revenue, currency)}</p><small>{detail}</small></article>;
}

export default function SalesDashboard() {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`);
  const [to, setTo] = useState(localIso(today));
  const [granularity, setGranularity] = useState('month');
  const [data, setData] = useState({ orders: [], lines: [] });
  const [filters, setFilters] = useState({ state: 'sale,done', salesperson: '', team: '', customer: '', company: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ to, includeLines: 'true' });
      const response = await fetch(`/api/sales?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No fue posible consultar las ventas de Odoo');
      setData(payload);
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  }, [to]);
  useEffect(() => { load(); }, [load]);

  const dimensions = useMemo(() => {
    const unique = (key) => [...new Map(data.orders.map((order) => [order[key]?.id, order[key]]).filter(([id]) => id)).values()].sort((a, b) => a.name.localeCompare(b.name));
    return { salesperson: unique('salesperson'), team: unique('team'), customer: unique('customer'), company: unique('company') };
  }, [data.orders]);
  const scoped = useMemo(() => data.orders.filter((order) => {
    const states = filters.state ? filters.state.split(',') : [];
    return (!states.length || states.includes(order.state)) && ['salesperson', 'team', 'customer', 'company'].every((key) => !filters[key] || String(order[key]?.id) === filters[key]);
  }), [data.orders, filters]);
  const comparison = useMemo(() => {
    const start = new Date(`${from}T00:00:00`); const end = new Date(`${to}T23:59:59`); const span = end - start;
    const select = (a, b) => scoped.filter((order) => { const date = new Date(order.date.replace(' ', 'T')); return date >= a && date <= b; });
    const current = select(start, end); const previous = select(new Date(start.getTime() - span - 1), new Date(start.getTime() - 1));
    return { current, previous, now: summarize(current), before: summarize(previous) };
  }, [scoped, from, to]);
  const trend = useMemo(() => {
    const grouped = new Map(); comparison.current.forEach((order) => { const item = bucket(order.date, granularity); const row = grouped.get(item.key) || { ...item, value: 0, count: 0 }; row.value += order.total; row.count += 1; grouped.set(item.key, row); });
    return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [comparison, granularity]);
  const rankings = useMemo(() => {
    const rank = (key) => { const map = new Map(); comparison.current.forEach((order) => map.set(relationName(order[key]), (map.get(relationName(order[key])) || 0) + order.total)); return [...map].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8); };
    const ids = new Set(comparison.current.map((order) => order.id)); const products = new Map();
    data.lines.filter((line) => ids.has(line.orderId)).forEach((line) => products.set(relationName(line.product), (products.get(relationName(line.product)) || 0) + line.subtotal));
    return { customers: rank('customer'), sellers: rank('salesperson'), products: [...products].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8) };
  }, [comparison, data.lines]);
  const commercial = useMemo(() => {
    const history = classifyCommercialHistory(data.orders, data.lines); const currentConfirmed = comparison.current.filter((order) => ['sale', 'done'].includes(order.state) && order.customer?.id);
    const currentIds = new Set(currentConfirmed.map((order) => order.id)); const activeCustomers = new Set(currentConfirmed.map((order) => order.customer.id));
    const orderRevenue = (category) => currentConfirmed.filter((order) => history.orderClassification.get(order.id) === category).reduce((sum, order) => sum + order.total, 0);
    const classifiedCustomers = (category) => new Set(currentConfirmed.filter((order) => history.orderClassification.get(order.id) === category).map((order) => order.customer.id)).size;
    const eventCount = (type) => new Set(history.events.filter((event) => event.type === type && currentIds.has(event.orderId)).map((event) => event.customerId)).size;
    let newBusinessRevenue = 0;
    data.lines.filter((line) => currentIds.has(line.orderId) && line.product?.id).forEach((line) => {
      const order = history.orderById.get(line.orderId); const start = order ? history.productStarts.get(`${order.customer.id}:${line.product.id}`) : null;
      if (order && start?.eligible && asDate(order.date) < addMonths(start.date, 2)) newBusinessRevenue += line.total;
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
  }, [comparison, data.lines, data.orders, to]);

  const exportCsv = () => {
    const rows = [['Orden', 'Fecha', 'Estado', 'Cliente', 'Vendedor', 'Equipo', 'Subtotal', 'Impuestos', 'Total'], ...comparison.current.map((order) => [order.number, order.date, STATE_LABELS[order.state], relationName(order.customer), relationName(order.salesperson), relationName(order.team), order.untaxed, order.tax, order.total])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `ventas-odoo-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  if (loading && !data.fetchedAt) return <div className='sales-state'><div className='sales-loader' /><h2>Consultando ventas en Odoo</h2><p>Obteniendo pedidos, clientes y productos…</p></div>;
  if (error && !data.fetchedAt) return <div className='sales-state sales-error'><span>!</span><h2>No se pudo conectar con Odoo</h2><p>{error}</p><button onClick={load}>Reintentar</button><small>Configura ODOO_DATABASE, ODOO_USERNAME y ODOO_API_KEY en el backend.</small></div>;
  const currency = comparison.current.find((order) => order.currency)?.currency?.name || 'MXN';
  const maxTrend = Math.max(...trend.map((item) => item.value), 1);

  return <div className='sales-dashboard'>
    <section className='sales-hero'><div><span>ODOO · INTELIGENCIA COMERCIAL</span><h1>Ventas</h1><p>Compara el desempeño comercial y descubre qué clientes, productos y equipos impulsan los resultados.</p></div><div><button className='secondary' onClick={exportCsv} disabled={!comparison.current.length}>Exportar CSV</button><button onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar Odoo'}</button></div></section>
    {error && <div className='sales-inline-error'>{error}</div>}{data.truncated && <div className='sales-warning'>La consulta alcanzó 20,000 órdenes. Reduce el rango de fechas.</div>}
    <section className='sales-filters'>
      <label><span>Desde</span><input type='date' value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label><label><span>Hasta</span><input type='date' value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
      <label><span>Estado</span><select value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })}><option value='sale,done'>Ventas confirmadas</option><option value='draft,sent,sale,done'>Todo excepto canceladas</option><option value='draft,sent'>Cotizaciones</option><option value='cancel'>Canceladas</option><option value=''>Todos</option></select></label>
      {['salesperson', 'team', 'customer', 'company'].map((key) => <label key={key}><span>{{ salesperson: 'Vendedor', team: 'Equipo', customer: 'Cliente', company: 'Compañía' }[key]}</span><select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}><option value=''>Todos</option>{dimensions[key].map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>)}
    </section>
    <section className='sales-metrics'><Metric label='Venta total' value={money(comparison.now.total, currency)} change={delta(comparison.now.total, comparison.before.total)} detail='vs. periodo anterior' /><Metric label='Pedidos' value={number(comparison.now.count)} change={delta(comparison.now.count, comparison.before.count)} detail={`${number(comparison.before.count)} anteriormente`} /><Metric label='Ticket promedio' value={money(comparison.now.average, currency)} change={delta(comparison.now.average, comparison.before.average)} detail='por orden' /><Metric label='Impuestos' value={money(comparison.now.tax, currency)} change={delta(comparison.now.tax, comparison.before.tax)} detail={`${money(comparison.now.untaxed, currency)} antes de impuestos`} /></section>
    <section className='sales-classification-section'>
      <header><div><span>CLASIFICACIÓN COMERCIAL</span><h2>Composición y crecimiento de la cartera</h2><p>Reglas de la Política Comercial VerdeMex · reconocimiento de 2 meses · recuperación después de 18 meses.</p></div><div className='sales-portfolio-total'><small>Cartera activa</small><strong>{number(commercial.activeCustomers)}</strong><span>clientes únicos en el periodo</span></div></header>
      {!commercial.hasRecoveryCoverage && commercial.oldestConfirmed && <div className='sales-coverage-warning'><b>Cobertura histórica limitada:</b> Odoo contiene ventas confirmadas desde {dateLabel(commercial.oldestConfirmed)}. Para validar clientes recuperados y descartar antecedentes de clientes nuevos se requieren al menos 18 meses previos.</div>}
      <div className='sales-classification-grid'>
        <ClassificationCard tone='blue' label='Clientes nuevos' count={commercial.newClients} revenue={commercial.newClientRevenue} detail={`${commercial.recognizedNewClients} con ingresos en reconocimiento`} currency={currency} />
        <ClassificationCard tone='purple' label='Clientes recuperados' count={commercial.recoveredClients} revenue={commercial.recoveredRevenue} detail={`${commercial.recognizedRecoveredClients} dentro de sus primeros 2 meses`} currency={currency} />
        <ClassificationCard tone='orange' label='Negocios nuevos' count={commercial.newBusinessCount} revenue={commercial.newBusinessRevenue} detail='Nuevos productos en clientes existentes' currency={currency} />
        <ClassificationCard tone='teal' label='Clientes existentes' count={commercial.existingClients} revenue={commercial.existingRevenue} detail='Cartera recurrente fuera de reconocimiento' currency={currency} />
      </div>
    </section>
    <section className='sales-panel sales-trend'><header><div><span>TENDENCIA</span><h2>Evolución de ventas</h2></div><nav>{[['week', 'Semanas'], ['month', 'Meses'], ['quarter', 'Trimestres'], ['year', 'Años']].map(([value, label]) => <button className={granularity === value ? 'active' : ''} onClick={() => setGranularity(value)} key={value}>{label}</button>)}</nav></header>{trend.length ? <div className='sales-chart'>{trend.map((row, index) => <div className='sales-column' key={row.key} title={`${row.label}: ${money(row.value, currency)}`}><strong>{money(row.value, currency)}</strong><i><b style={{ height: `${Math.max(row.value / maxTrend * 100, 2)}%`, background: `linear-gradient(180deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${CHART_COLORS[(index + 1) % CHART_COLORS.length]})` }} /></i><span>{row.label}</span><small>{row.count} pedidos</small></div>)}</div> : <div className='sales-empty'>No hay ventas para los filtros seleccionados.</div>}</section>
    <div className='sales-split sales-portfolio-row'><section className='sales-panel'><header><div><span>CARTERA</span><h2>Clientes activos por vendedor</h2></div><small>{filters.salesperson ? 'Vendedor seleccionado' : 'Todos los vendedores'}</small></header>{commercial.portfolio.length ? <Bars rows={commercial.portfolio} valueFormatter={(value) => `${number(value)} clientes`} /> : <div className='sales-empty'>Sin clientes activos en el periodo</div>}</section><section className='sales-panel sales-policy-note'><header><div><span>CRITERIO</span><h2>Cómo se están midiendo</h2></div></header><ul><li><b>Nuevo:</b> primera operación confirmada de toda la historia.</li><li><b>Recuperado:</b> regreso tras 18 meses consecutivos sin operación.</li><li><b>Negocio nuevo:</b> primer producto diferente en un cliente existente.</li><li><b>Vigencia:</b> 2 meses fecha a fecha; sin duplicar cliente y negocio nuevo.</li></ul><small>La identificación por producto depende del catálogo registrado en Odoo.</small></section></div>
    <div className='sales-split'><section className='sales-panel'><header><div><span>CLIENTES</span><h2>Principales cuentas</h2></div></header>{rankings.customers.length ? <Bars rows={rankings.customers} currency={currency} /> : <div className='sales-empty'>Sin datos</div>}</section><section className='sales-panel'><header><div><span>EQUIPO</span><h2>Venta por vendedor</h2></div></header>{rankings.sellers.length ? <Bars rows={rankings.sellers} currency={currency} /> : <div className='sales-empty'>Sin datos</div>}</section></div>
    <div className='sales-split sales-bottom'><section className='sales-panel'><header><div><span>PORTAFOLIO</span><h2>Productos con mayor venta</h2></div></header>{rankings.products.length ? <Bars rows={rankings.products} currency={currency} /> : <div className='sales-empty'>Sin líneas de producto</div>}</section><section className='sales-panel sales-orders'><header><div><span>DETALLE</span><h2>Últimas órdenes</h2></div><small>{comparison.current.length} resultados</small></header><div className='sales-table-wrap'><table><thead><tr><th>Orden</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead><tbody>{[...comparison.current].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map((order) => <tr key={order.id}><td><strong>{order.number}</strong><small>{relationName(order.salesperson)}</small></td><td>{relationName(order.customer)}</td><td>{dateLabel(order.date)}</td><td><span className={`sales-status ${order.state}`}>{STATE_LABELS[order.state] || order.state}</span></td><td><strong>{money(order.total, order.currency?.name || currency)}</strong></td></tr>)}</tbody></table></div></section></div>
    <footer className='sales-sync'>Última sincronización: {data.fetchedAt ? dateLabel(data.fetchedAt) : '—'} · Fuente: Odoo Ventas</footer>
  </div>;
}
