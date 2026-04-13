import './Dashboard.css';

export default function Dashboard() {
  const stats = [
    { label: 'Vehículos Activos', value: '42', icon: '🚚', color: 'primary' },
    { label: 'Conductores', value: '28', icon: '👨‍✈️', color: 'accent' },
    { label: 'Pedidos en Ruta', value: '15', icon: '📦', color: 'warning' },
    { label: 'Combustible Ahorrado', value: '1,250L', icon: '⛽', color: 'success' },
  ];

  const recentActivities = [
    { id: 1, type: 'Vehículo', message: 'Mantenimiento realizado a Unidad #001', time: 'Hace 30 min' },
    { id: 2, type: 'Pedido', message: 'Pedido #5412 entregado correctamente', time: 'Hace 1 hora' },
    { id: 3, type: 'Conductor', message: 'Carlos López marcó entrada a turno', time: 'Hace 2 horas' },
    { id: 4, type: 'Sistema', message: 'Reporte mensual disponible', time: 'Hace 4 horas' },
  ];

  const vehicleStatus = [
    { status: 'En ruta', count: 15, percentage: 35, color: '#27ae60' },
    { status: 'Disponible', count: 20, percentage: 47, color: '#52b788' },
    { status: 'Mantenimiento', count: 5, percentage: 12, color: '#f39c12' },
    { status: 'Inactivo', count: 2, percentage: 5, color: '#e74c3c' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Principal</h1>
        <p className="subtitle">Bienvenido al Sistema de Gestión de Flotilla</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card stat-${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Vehicle Status */}
        <div className="card">
          <div className="card-header">Estado de Vehículos</div>
          <div className="card-body">
            {vehicleStatus.map((item) => (
              <div key={item.status} className="status-item">
                <div className="status-info">
                  <span className="status-label">{item.status}</span>
                  <span className="status-count">{item.count} unidades</span>
                </div>
                <div className="status-bar">
                  <div
                    className="status-progress"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  ></div>
                </div>
                <span className="status-percentage">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">Acciones Rápidas</div>
          <div className="card-body actions-list">
            <a href="/vehicles/create" className="action-btn">
              <span className="action-icon">➕</span>
              <span className="action-text">Añadir Vehículo</span>
            </a>
            <a href="/drivers/create" className="action-btn">
              <span className="action-icon">👤</span>
              <span className="action-text">Registrar Conductor</span>
            </a>
            <a href="/orders/create" className="action-btn">
              <span className="action-icon">📝</span>
              <span className="action-text">Crear Pedido</span>
            </a>
            <a href="/analytics" className="action-btn">
              <span className="action-icon">📊</span>
              <span className="action-text">Ver Reportes</span>
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card mt-3">
        <div className="card-header">Actividad Reciente</div>
        <div className="card-body">
          <div className="activity-list">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <div className="activity-header">
                    <span className="activity-type">{activity.type}</span>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                  <p className="activity-message">{activity.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
