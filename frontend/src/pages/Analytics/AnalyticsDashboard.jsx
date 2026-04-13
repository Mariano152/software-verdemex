import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockVehicles, mockOrders, mockDrivers } from '../../data/mockData';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('month');

  // Calcula estadísticas
  const totalVehicles = mockVehicles.length;
  const activeVehicles = mockVehicles.filter(v => v.status === 'En ruta').length;
  const totalOrders = mockOrders.length;
  const completedOrders = mockOrders.filter(o => o.status === 'Entregado').length;
  const totalRevenue = mockOrders.reduce((sum, o) => sum + o.value, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Datos para gráficos simulados
  const vehicleStatus = {
    'En ruta': mockVehicles.filter(v => v.status === 'En ruta').length,
    'Disponible': mockVehicles.filter(v => v.status === 'Disponible').length,
    'Mantenimiento': mockVehicles.filter(v => v.status === 'Mantenimiento').length,
    'Inactivo': mockVehicles.filter(v => v.status === 'Inactivo').length,
  };

  const orderStatus = {
    'Pendiente': mockOrders.filter(o => o.status === 'Pendiente').length,
    'En tránsito': mockOrders.filter(o => o.status === 'En tránsito').length,
    'Entregado': mockOrders.filter(o => o.status === 'Entregado').length,
    'Cancelado': mockOrders.filter(o => o.status === 'Cancelado').length,
  };

  return (
    <div className="analytics-dashboard">
      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <h1>📊 Análisis y Reportes</h1>
          <p className="subtitle">Estadísticas detalladas de tu operación</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="date-range-select"
        >
          <option value="week">Esta Semana</option>
          <option value="month">Este Mes</option>
          <option value="quarter">Este Trimestre</option>
          <option value="year">Este Año</option>
        </select>
      </div>

      {/* KPI CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">🚗</div>
          <div className="kpi-info">
            <span className="kpi-label">Vehículos Activos</span>
            <span className="kpi-value">{activeVehicles}</span>
            <span className="kpi-detail">de {totalVehicles} total</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">📦</div>
          <div className="kpi-info">
            <span className="kpi-label">Pedidos Entregados</span>
            <span className="kpi-value">{completedOrders}</span>
            <span className="kpi-detail">{((completedOrders / totalOrders) * 100).toFixed(0)}% de {totalOrders}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">💰</div>
          <div className="kpi-info">
            <span className="kpi-label">Ingresos Totales</span>
            <span className="kpi-value">${(totalRevenue / 1000000).toFixed(1)}M</span>
            <span className="kpi-detail">Promedio: ${(averageOrderValue / 1000).toFixed(0)}k por orden</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">👨‍✈️</div>
          <div className="kpi-info">
            <span className="kpi-label">Conductores</span>
            <span className="kpi-value">{mockDrivers.length}</span>
            <span className="kpi-detail">Calificación promedio: 4.5⭐</span>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="charts-grid">
        {/* VEHICLE STATUS CHART */}
        <div className="chart-card">
          <h2>Estado de Vehículos</h2>
          <div className="chart-container">
            <div className="chart-bars">
              {Object.entries(vehicleStatus).map(([status, count]) => {
                const maxCount = Math.max(...Object.values(vehicleStatus));
                const percentage = (count / maxCount) * 100;
                const colors = {
                  'En ruta': '#2d7a3e',
                  'Disponible': '#3b82f6',
                  'Mantenimiento': '#f59e0b',
                  'Inactivo': '#ef4444',
                };
                return (
                  <div key={status} className="bar-item">
                    <div className="bar-label">{status}</div>
                    <div className="bar-bg">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: colors[status],
                        }}
                      ></div>
                    </div>
                    <div className="bar-value">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ORDER STATUS CHART */}
        <div className="chart-card">
          <h2>Estado de Pedidos</h2>
          <div className="chart-container">
            <div className="chart-bars">
              {Object.entries(orderStatus).map(([status, count]) => {
                const maxCount = Math.max(...Object.values(orderStatus));
                const percentage = (count / maxCount) * 100;
                const colors = {
                  'Pendiente': '#f59e0b',
                  'En tránsito': '#2d7a3e',
                  'Entregado': '#10b981',
                  'Cancelado': '#ef4444',
                };
                return (
                  <div key={status} className="bar-item">
                    <div className="bar-label">{status}</div>
                    <div className="bar-bg">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: colors[status],
                        }}
                      ></div>
                    </div>
                    <div className="bar-value">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* REPORTS SECTION */}
      <div className="reports-section">
        <h2>📋 Reportes Disponibles</h2>
        <div className="reports-grid">
          <Link to="/reports/vehicles" className="report-card">
            <span className="report-icon">🚗</span>
            <h3>Reporte de Vehículos</h3>
            <p>Análisis detallado de la flota, mantenimiento y utilización</p>
          </Link>

          <Link to="/reports/drivers" className="report-card">
            <span className="report-icon">👨‍✈️</span>
            <h3>Reporte de Conductores</h3>
            <p>Desempeño, calificaciones y estadísticas de conductores</p>
          </Link>

          <Link to="/reports/orders" className="report-card">
            <span className="report-icon">📦</span>
            <h3>Reporte de Pedidos</h3>
            <p>Análisis de entregas, ingresos y tendencias</p>
          </Link>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="summary-stats">
        <div className="stat-item">
          <span className="stat-title">Tasa de Entrega</span>
          <span className="stat-number">{totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-title">Utilización de Flota</span>
          <span className="stat-number">{totalVehicles > 0 ? ((activeVehicles / totalVehicles) * 100).toFixed(0) : 0}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-title">Valor Promedio Pedido</span>
          <span className="stat-number">${(averageOrderValue / 1000).toFixed(0)}k</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
