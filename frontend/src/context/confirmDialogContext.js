import { createContext, useContext } from 'react';

export const ConfirmDialogContext = createContext(null);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) throw new Error('useConfirmDialog debe usarse dentro de ConfirmDialogProvider');
  return context;
};
