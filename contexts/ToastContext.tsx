
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ToastMessage, ToastContextType } from '../types';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts(prevToasts => [newToast, ...prevToasts]); // Add new toasts at the beginning for typical top-right display

    // Auto-dismiss toast
    const duration = toast.duration || 7000; // Default 7 seconds
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Provide toasts as well if ToastContainer is a child of this context directly
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* ToastContainer could also be placed here if it consumes toasts directly from this context */}
      {/* For now, it will be placed in App.tsx to consume toasts from this context via useToast if needed, or have toasts passed */}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// This is for the ToastContainer to access the toasts array if needed
// It's a bit of a workaround for not having a direct 'getToasts' in the context for other components
// An alternative is for ToastContainer to be a direct child and receive 'toasts' as a prop.
// Or, ToastContext could expose 'toasts' and 'removeToast' if ToastContainer isn't part of App.tsx's direct render tree.

// Let's adjust context to provide toasts and remove function for ToastContainer
interface FullToastContextType extends ToastContextType {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}
const InternalToastContext = createContext<FullToastContextType | undefined>(undefined);

export const InternalToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const defaultIcon = 
        toast.type === 'success' ? 'fas fa-check-circle' :
        toast.type === 'error'   ? 'fas fa-times-circle' :
        toast.type === 'warning' ? 'fas fa-exclamation-triangle' :
        toast.type === 'info'    ? 'fas fa-info-circle' : undefined;

    const newToast: ToastMessage = { ...toast, id, icon: toast.icon || defaultIcon };
    setToasts(prevToasts => [newToast, ...prevToasts]);

    const duration = toast.duration || 7000; // Changed to 7 seconds
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);
  
  return (
    <InternalToastContext.Provider value={{ addToast, toasts, removeToast }}>
      {children}
    </InternalToastContext.Provider>
  );
};

export const useInternalToast = () => {
    const context = useContext(InternalToastContext);
    if (context === undefined) {
        throw new Error('useInternalToast must be used within an InternalToastProvider');
    }
    return context;
};

// Export useToast that only exposes addToast for general use
export const usePublicToast = (): Pick<FullToastContextType, 'addToast'> => {
    const { addToast } = useInternalToast();
    return { addToast };
};
