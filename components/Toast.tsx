
import React, { useEffect, useState } from 'react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = React.memo(({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start animation shortly after mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false); 
    // Wait for animation to finish before calling parent's onClose
    setTimeout(onClose, 350); // Match animation duration + a little buffer
  };

  let bgColor = 'bg-info-bgLight dark:bg-info-bgDark';
  let textColor = 'text-info-textLight dark:text-info-textDark';
  let borderColor = 'border-info-borderLight dark:border-info-borderDark';
  let iconColor = 'text-info-DEFAULT dark:text-info-light';

  switch (toast.type) {
    case 'success':
      bgColor = 'bg-success-bgLight dark:bg-success-bgDark';
      textColor = 'text-success-textLight dark:text-success-textDark';
      borderColor = 'border-success-borderLight dark:border-success-borderDark';
      iconColor = 'text-success-DEFAULT dark:text-success-light';
      break;
    case 'error':
      bgColor = 'bg-error-bgLight dark:bg-error-bgDark';
      textColor = 'text-error-textLight dark:text-error-textDark';
      borderColor = 'border-error-borderLight dark:border-error-borderDark';
      iconColor = 'text-error-DEFAULT dark:text-error-light';
      break;
    case 'warning':
      bgColor = 'bg-warning-bgLight dark:bg-warning-bgDark';
      textColor = 'text-warning-textLight dark:text-warning-textDark';
      borderColor = 'border-warning-borderLight dark:border-warning-borderDark';
      iconColor = 'text-warning-DEFAULT dark:text-warning-light';
      break;
  }

  // Default icons if not provided
  const defaultIcon = 
    toast.type === 'success' ? 'fas fa-check-circle' :
    toast.type === 'error'   ? 'fas fa-times-circle' :
    toast.type === 'warning' ? 'fas fa-exclamation-triangle' :
    toast.type === 'info'    ? 'fas fa-info-circle' : 'fas fa-bell';


  return (
    <div
      className={`
        p-4 rounded-xl shadow-2xl border-l-4 
        ${bgColor} ${textColor} ${borderColor}
        flex items-start space-x-3
        transform transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[110%]'}
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${iconColor} ${bgColor === 'bg-info-bgLight dark:bg-info-bgDark' ? '' : 'bg-opacity-20'} mt-0.5`}>
        <i className={`${toast.icon || defaultIcon} ${iconColor} text-sm fa-fw`}></i>
      </div>
      <div className="flex-1 text-sm">
        <p className={`font-semibold ${textColor}`}>{toast.message}</p>
      </div>
      <button
        onClick={handleClose}
        className={`ml-auto -mr-1 -mt-1 rounded-full p-1.5 hover:bg-black/10 dark:hover:bg-white/10
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-current
                   transition-colors duration-150`}
        aria-label="Đóng thông báo"
      >
        <i className={`fas fa-times text-sm ${textColor} opacity-70 hover:opacity-100`}></i>
      </button>
    </div>
  );
});

export default Toast;
