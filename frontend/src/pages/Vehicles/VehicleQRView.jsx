import { useParams, Link } from 'react-router-dom';
import { mockVehicles } from '../../data/mockData';
import './VehicleQRView.css';

export default function VehicleQRView() {
  const { id } = useParams();
  const vehicle = mockVehicles.find(v => v.id === parseInt(id));

  // Simular un código QR (en producción usarías una librería como qrcode.react)
  const qrString = vehicle ? `VERDEMEX-VEH-${vehicle.plate}-${vehicle.id}` : '';

  return (
    <div className="vehicle-qr-view">
      <div className="page-header">
        <Link to={`/vehicles/${id}`} className="btn btn-outline">← Volver</Link>
        <div>
          <h1>Código QR del Vehículo</h1>
          <p className="subtitle">Placa: {vehicle?.plate}</p>
        </div>
      </div>

      <div className="qr-container">
        <div className="card">
          <div className="card-header">Código QR</div>
          <div className="qr-content">
            <div className="qr-placeholder">
              <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                {/* Patrón simple de QR simulado */}
                <rect x="10" y="10" width="280" height="280" fill="white" stroke="#2d7a3e" strokeWidth="2"/>
                <g fill="#2d7a3e">
                  {/* Esquinas de ubicación */}
                  <rect x="20" y="20" width="60" height="60"/>
                  <rect x="30" y="30" width="40" height="40" fill="white"/>
                  <rect x="40" y="40" width="20" height="20" fill="#2d7a3e"/>
                  
                  <rect x="220" y="20" width="60" height="60"/>
                  <rect x="230" y="30" width="40" height="40" fill="white"/>
                  <rect x="240" y="40" width="20" height="20" fill="#2d7a3e"/>
                  
                  <rect x="20" y="220" width="60" height="60"/>
                  <rect x="30" y="230" width="40" height="40" fill="white"/>
                  <rect x="40" y="240" width="20" height="20" fill="#2d7a3e"/>

                  {/* Patrón central aleatorio */}
                  <rect x="100" y="100" width="15" height="15"/>
                  <rect x="130" y="100" width="15" height="15"/>
                  <rect x="160" y="100" width="15" height="15"/>
                  <rect x="100" y="130" width="15" height="15"/>
                  <rect x="160" y="130" width="15" height="15"/>
                  <rect x="100" y="160" width="15" height="15"/>
                  <rect x="130" y="160" width="15" height="15"/>
                  <rect x="160" y="160" width="15" height="15"/>
                </g>
              </svg>
            </div>
            <p className="qr-text">{qrString}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Información del Vehículo</div>
          <div className="qr-info">
            <div className="info-item">
              <span className="label">Placa</span>
              <span className="value">{vehicle?.plate}</span>
            </div>
            <div className="info-item">
              <span className="label">Modelo</span>
              <span className="value">{vehicle?.model}</span>
            </div>
            <div className="info-item">
              <span className="label">Tipo</span>
              <span className="value">{vehicle?.type}</span>
            </div>
            <div className="info-item">
              <span className="label">Capacidad</span>
              <span className="value">{vehicle?.capacity.toLocaleString()} kg</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Opciones de Impresión</div>
        <div className="print-options">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            🖨️ Imprimir Código QR
          </button>
          <button className="btn btn-outline">
            📥 Descargar como PNG
          </button>
          <button className="btn btn-outline">
            📤 Compartir
          </button>
        </div>
      </div>
    </div>
  );
}
