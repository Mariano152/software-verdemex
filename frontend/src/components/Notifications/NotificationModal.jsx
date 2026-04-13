import React from 'react';
import './NotificationModal.css';

/**
 * Modal de Notificaciones Reutilizable
 * Propósito: Mostrar mensajes de éxito, error, advertencia e información
 *
 * Props:
 * - type: 'success' | 'error' | 'warning' | 'info' (default: 'info')
 * - title: string - Título del modal
 * - message: string - Mensaje a mostrar
 * - details?: any - Detalles adicionales (array, objeto)
 * - isOpen: boolean - Mostrar/ocultar modal
 * - onClose: function - Callback al cerrar
 * - actionButton?: {label: string, onClick: function} - Botón de acción adicional
 */
export function NotificationModal({
  type = 'info',
  title,
  message,
  details,
  isOpen,
  onClose,
  actionButton
}) {
  if (!isOpen) return null;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className="notification-overlay">
      <div className={`notification-modal notification-${type}`}>
        <div className="notification-header">
          <div className={`notification-icon notification-icon-${type}`}>
            {icons[type]}
          </div>
          <h2>{title}</h2>
        </div>

        <p className="notification-message">{message}</p>

        {details && (
          <div className="notification-details">
            {Array.isArray(details) ? (
              <ul>
                {details.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : typeof details === 'object' ? (
              <div className="details-object">
                {Object.entries(details).map(([key, value]) => (
                  <div key={key} className="detail-row">
                    <span className="detail-label">{key}:</span>
                    <span className="detail-value">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="details-text">{details}</p>
            )}
          </div>
        )}

        <div className="notification-actions">
          {actionButton && (
            <button
              className="btn btn-secondary"
              onClick={actionButton.onClick}
              type="button"
            >
              {actionButton.label}
            </button>
          )}
          <button
            className={`btn btn-${type}`}
            onClick={onClose}
            type="button"
          >
            {actionButton ? 'Cerrar' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationModal;
