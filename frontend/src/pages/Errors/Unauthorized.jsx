import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Unauthorized.css';

function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="error-page unauthorized">
      <div className="error-container">
        <div className="error-icon">🔒</div>
        <h1>403</h1>
        <h2>Acceso Denegado</h2>
        <p>No tienes permiso para acceder a este recurso.</p>
        <p className="error-subtext">
          Si crees que es un error, por favor contacta con el administrador del sistema.
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

        <div className="error-details">
          <p><strong>Motivo común:</strong> Tu rol de usuario no tiene permisos para esta sección.</p>
          <p><strong>Solución:</strong> Solicita a un administrador que eleve tus permisos de acceso.</p>
        </div>
      </div>

      <div className="error-decoration">
        <div className="decoration-circle"></div>
        <div className="decoration-circle"></div>
      </div>
    </div>
  );
}

export default Unauthorized;
