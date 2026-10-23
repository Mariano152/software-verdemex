import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  eyebrow = 'Confirmar acción',
  fileName,
  count,
  itemLabel = 'registros',
  confirmLabel = 'Confirmar',
  note = 'Los registros aparecerán en el historial y podrás verlos, editarlos o eliminarlos.',
  tone = 'success',
  loading = false,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className='confirm-dialog-overlay' role='presentation' onMouseDown={() => !loading && onCancel?.()}>
      <section
        className={`confirm-dialog confirm-dialog-${tone}`}
        role='dialog'
        aria-modal='true'
        aria-labelledby='confirm-dialog-title'
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className='confirm-dialog-icon' aria-hidden='true'>
          <svg viewBox='0 0 24 24' focusable='false'>
            <path d='M7 3h7l5 5v13H7z' />
            <path d='M14 3v5h5M10 13h6M10 17h6' />
          </svg>
        </div>

        <div className='confirm-dialog-copy'>
          <span className='confirm-dialog-eyebrow'>{eyebrow}</span>
          <h2 id='confirm-dialog-title'>{title}</h2>
          <p>{message}</p>
        </div>

        {(fileName || count !== undefined) && (
          <div className='confirm-dialog-summary'>
            {fileName && <div><span>Archivo</span><strong title={fileName}>{fileName}</strong></div>}
            {count !== undefined && <div><span>Listos para importar</span><strong>{count} {itemLabel}</strong></div>}
          </div>
        )}

        {note && <div className='confirm-dialog-note'>{note}</div>}

        <div className='confirm-dialog-actions'>
          <button type='button' className='confirm-dialog-cancel' onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type='button' className='confirm-dialog-submit' onClick={onConfirm} disabled={loading}>
            {loading ? <span className='confirm-dialog-spinner' aria-hidden='true' /> : null}
            {loading ? 'Importando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
