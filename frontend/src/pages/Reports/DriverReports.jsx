import React from 'react';
import { Link } from 'react-router-dom';
import { mockDrivers } from '../../data/mockData';
import './Reports.css';

const DriverReports = () => {
  const averageRating = mockDrivers.length > 0 
    ? (mockDrivers.reduce((sum, d) => sum + d.rating, 0) / mockDrivers.length).toFixed(1)
    : 0;
  const totalTrips = mockDrivers.reduce((sum, d) => sum + d.totalTrips, 0);
  const averageTrips = mockDrivers.length > 0 ? (totalTrips / mockDrivers.length).toFixed(0) : 0;

  return (
    <div className="report-page">
      <div className="report-header">
        <div>
          <h1>👨‍✈️ Reporte de Conductores</h1>
          <p className="subtitle">Desempeño y estadísticas de conductores</p>
        </div>
        <Link to="/analytics" className="btn btn-secondary">
          ← Volver a Analytics
        </Link>
      </div>

      {/* STATS */}
      <div className="report-stats">
        <div className="stat-box">
          <span className="stat-label">Total Conductores</span>
          <p className="stat-value">{mockDrivers.length}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Rating Promedio</span>
          <p className="stat-value">{averageRating}⭐</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Viajes Totales</span>
          <p className="stat-value">{totalTrips}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Viajes Promedio</span>
          <p className="stat-value">{averageTrips}</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Rating</th>
              <th>Viajes</th>
              <th>Experiencia</th>
              <th>Licencia Vence</th>
            </tr>
          </thead>
          <tbody>
            {mockDrivers.map(driver => (
              <tr key={driver.id}>
                <td><strong>{driver.name}</strong></td>
                <td>{driver.email}</td>
                <td>{driver.phone}</td>
                <td>
                  <span className="badge" style={{backgroundColor: driver.status === 'Activo' ? '#2d7a3e' : '#6b7280'}}>
                    {driver.status}
                  </span>
                </td>
                <td>{driver.rating.toFixed(1)}⭐</td>
                <td>{driver.totalTrips}</td>
                <td>{driver.experience} años</td>
                <td>{driver.licenseExpiry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriverReports;
