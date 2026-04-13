import React from 'react';
import { Link } from 'react-router-dom';
import { mockVehicles } from '../../data/mockData';
import './Reports.css';

const VehicleReports = () => {
  const totalCapacity = mockVehicles.reduce((sum, v) => sum + v.capacity, 0);
  const totalMileage = mockVehicles.reduce((sum, v) => sum + v.mileage, 0);
  const averageMileage = mockVehicles.length > 0 ? (totalMileage / mockVehicles.length).toFixed(0) : 0;

  return (
    <div className="report-page">
      <div className="report-header">
        <div>
          <h1>🚗 Reporte de Vehículos</h1>
          <p className="subtitle">Análisis detallado de la flota</p>
        </div>
        <Link to="/analytics" className="btn btn-secondary">
          ← Volver a Analytics
        </Link>
      </div>

      {/* STATS */}
      <div className="report-stats">
        <div className="stat-box">
          <span className="stat-label">Total Vehículos</span>
          <p className="stat-value">{mockVehicles.length}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Capac. Combinada</span>
          <p className="stat-value">{(totalCapacity / 1000).toFixed(0)}T</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Km Acumulados</span>
          <p className="stat-value">{(totalMileage / 1000).toFixed(0)}k</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Km Promedio</span>
          <p className="stat-value">{(averageMileage / 1000).toFixed(0)}k</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Modelo</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Km</th>
              <th>Combustible</th>
              <th>Capacidad</th>
              <th>Año</th>
            </tr>
          </thead>
          <tbody>
            {mockVehicles.map(vehicle => (
              <tr key={vehicle.id}>
                <td><strong>{vehicle.plate}</strong></td>
                <td>{vehicle.model}</td>
                <td>{vehicle.type}</td>
                <td>
                  <span className="badge" style={{backgroundColor: vehicle.status === 'En ruta' ? '#2d7a3e' : '#6b7280'}}>
                    {vehicle.status}
                  </span>
                </td>
                <td>{vehicle.mileage.toLocaleString()}</td>
                <td>{vehicle.fuelLevel}%</td>
                <td>{vehicle.capacity.toLocaleString()} kg</td>
                <td>{vehicle.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleReports;
