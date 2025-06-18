
import React, { ReactNode, useEffect, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | '2xl' | '3xl';
  footer?: ReactNode;
  containerClass?: string;
}

const Modal: React.FC<ModalProps> = React.memo(({ isOpen, onClose, title, children, size = 'md', footer, containerClass = '' }) => {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsShowing(true);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
      // Allow fade-out animation before removing from DOM
      const timer = setTimeout(() => {
        setIsShowing(false);
        document.body.style.overflow = ''; 
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = ''; // Ensure overflow is reset on unmount
    };
  }, [isOpen]);

  if (!isShowing && !isOpen) return null; // Only render if opening or open

  let sizeClass = '';
  switch (size) {
    case 'sm': sizeClass = 'max-w-sm'; break;
    case 'md': sizeClass = 'max-w-md'; break;
    case 'lg': sizeClass = 'max-w-lg'; break;
    case 'xl': sizeClass = 'max-w-xl'; break;
    case '2xl': sizeClass = 'max-w-2xl'; break;
    case '3xl': sizeClass = 'max-w-3xl'; break;
    case 'full': sizeClass = 'max-w-full h-full'; break; 
    default: sizeClass = 'max-w-md';
  }

  const animationClass = isOpen ? 'animate-fadeIn' : 'animate-fadeOut';

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose} // Close on backdrop click
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full ${sizeClass} flex flex-col max-h-[90vh] overflow-hidden ${animationClass} ${containerClass}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark flex-shrink-0">
          <h3 id="modal-title" className="text-xl lg:text-2xl font-semibold text-text-light dark:text-text-dark">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close modal"
          >
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-grow custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="p-5 border-t border-border-light dark:border-border-dark flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

export default Modal;
