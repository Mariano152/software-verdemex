import React from 'react';
import { createPortal } from 'react-dom';
import './NotificationModal.css';

/**
 * Notificacion reutilizable fija en la parte superior de la vista actual.
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
  const visible = typeof isOpen === 'boolean' ? isOpen : true;

  if (!visible || typeof document === 'undefined') return null;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const fallbackTitles = {
    success: 'Exito',
    error: 'Error',
    warning: 'Atencion',
    info: 'Informacion'
  };

  return createPortal(
    <div className='notification-toast-wrapper' aria-live='polite' aria-atomic='true'>
      <div className={`notification-toast notification-${type}`} role='status'>
        <div className='notification-main'>
          <div className={`notification-icon notification-icon-${type}`}>
            {icons[type] || icons.info}
          </div>

          <div className='notification-copy'>
            <div className='notification-header'>
              <h2>{title || fallbackTitles[type] || fallbackTitles.info}</h2>
              {onClose && (
                <button
                  className='notification-close'
                  onClick={onClose}
                  type='button'
                  aria-label='Cerrar notificacion'
                >
                  ×
                </button>
              )}
            </div>

            {message && (
              <p className='notification-message'>
                {message.split('\n').map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    {idx < message.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>
        </div>

        {details && (
          <div className='notification-details'>
            {Array.isArray(details) ? (
              <ul>
                {details.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : typeof details === 'object' ? (
              <div className='details-object'>
                {Object.entries(details).map(([key, value]) => (
                  <div key={key} className='detail-row'>
                    <span className='detail-label'>{key}:</span>
                    <span className='detail-value'>{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className='details-text'>{details}</p>
            )}
          </div>
        )}

        {actionButton && (
          <div className='notification-actions'>
            <button
              className='btn btn-secondary'
              onClick={actionButton.onClick}
              type='button'
            >
              {actionButton.label}
            </button>
            {onClose && (
              <button
                className={`btn btn-${type}`}
                onClick={onClose}
                type='button'
              >
                Cerrar
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default NotificationModal;
