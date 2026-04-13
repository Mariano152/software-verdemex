import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="error-page not-found">
      <div className="error-container">
        <div className="error-icon">🔍</div>
        <h1>404</h1>
        <h2>Página No Encontrada</h2>
        <p>Lo sentimos, la página que buscas no existe o ha sido removida.</p>
        <p className="error-subtext">
          Verifica la URL y asegúrate de que sea correcta.
        </p>
        
        <div className="error-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            🏠 Volver al Inicio
          </button>
          <button 
            className="btn btn-default"
            onClick={() => navigate(-1)}
          >
            ← Atrás
          </button>
        </div>

        <div className="error-suggestions">
          <p><strong>Sitios frecuentes:</strong></p>
          <ul>
            <li><a href="#" onClick={() => navigate('/vehicles')}>📦 Vehículos</a></li>
            <li><a href="#" onClick={() => navigate('/drivers')}>👥 Conductores</a></li>
            <li><a href="#" onClick={() => navigate('/orders')}>📋 Órdenes</a></li>
            <li><a href="#" onClick={() => navigate('/analytics')}>📊 Análisis</a></li>
          </ul>
        </div>
      </div>

      <div className="error-decoration">
        <div className="decoration-circle"></div>
        <div className="decoration-circle"></div>
      </div>
    </div>
  );
}

export default NotFound;
