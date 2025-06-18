
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClass?: string;
}

const Textarea: React.FC<TextareaProps> = React.memo(({ label, id, error, className = '', wrapperClass = '', ...props }) => {
  const baseStyle = `block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none sm:text-sm 
                     transition-colors duration-200 ease-in-out bg-transparent custom-scrollbar`; // Added custom-scrollbar
  const normalStyle = `border-gray-300 dark:border-gray-600 
                       text-gray-900 dark:text-gray-100 
                       focus:ring-2 focus:ring-primary/60 focus:border-primary 
                       dark:focus:ring-primary-light/60 dark:focus:border-primary-light
                       placeholder-gray-400 dark:placeholder-gray-500`;
  const errorStyle = `border-red-500 text-red-600 focus:ring-2 focus:ring-red-500/50 focus:border-red-500
                      placeholder-red-400 dark:placeholder-red-500`;

  return (
    <div className={`mb-4 ${wrapperClass}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={props.rows || 4}
        className={`${baseStyle} ${error ? errorStyle : normalStyle} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
});

export default Textarea;
