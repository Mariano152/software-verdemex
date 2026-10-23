import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';
import { ConfirmDialogContext } from './confirmDialogContext';

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    if (resolverRef.current) resolverRef.current(false);
    resolverRef.current = resolve;
    setDialog(options);
  }), []);

  const close = useCallback((result) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolver?.(result);
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={!!dialog}
        tone={dialog?.tone || 'danger'}
        eyebrow={dialog?.eyebrow || 'Confirmar acción'}
        title={dialog?.title || '¿Deseas continuar?'}
        message={dialog?.message || 'Revisa la acción antes de confirmarla.'}
        note={dialog?.note}
        confirmLabel={dialog?.confirmLabel || 'Confirmar'}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    </ConfirmDialogContext.Provider>
  );
}
