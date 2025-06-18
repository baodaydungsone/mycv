
import React from 'react';
import { useInternalToast } from '../contexts/ToastContext'; // Use InternalToastContext
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useInternalToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 z-[200] w-full max-w-sm sm:max-w-md space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto"> {/* Allow interaction with individual toasts */}
          <Toast toast={toast} onClose={() => removeToast(toast.id)} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
