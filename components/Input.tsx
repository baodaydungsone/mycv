
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClass?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input: React.FC<InputProps> = React.memo(({ label, id, error, className = '', wrapperClass = '', leftIcon, rightIcon, ...props }) => {
  const baseStyle = `block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none sm:text-sm 
                     transition-colors duration-200 ease-in-out bg-transparent`;
  const normalStyle = `border-gray-300 dark:border-gray-600 
                       text-gray-900 dark:text-gray-100 
                       focus:ring-2 focus:ring-primary/60 focus:border-primary 
                       dark:focus:ring-primary-light/60 dark:focus:border-primary-light 
                       placeholder-gray-400 dark:placeholder-gray-500`;
  const errorStyle = `border-red-500 text-red-600 focus:ring-2 focus:ring-red-500/50 focus:border-red-500
                      placeholder-red-400 dark:placeholder-red-500`;
  
  const hasLeftIcon = Boolean(leftIcon);
  const hasRightIcon = Boolean(rightIcon);

  return (
    <div className={`mb-4 ${wrapperClass}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {hasLeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={`${baseStyle} ${error ? errorStyle : normalStyle} ${hasLeftIcon ? 'pl-10' : ''} ${hasRightIcon ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {hasRightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500">
            {rightIcon} 
            {/* If it's a button, set pointer-events-auto on the icon's container */}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
});

export default Input;
