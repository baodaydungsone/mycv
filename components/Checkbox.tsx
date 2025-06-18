
import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  wrapperClass?: string;
  description?: string;
}

const Checkbox: React.FC<CheckboxProps> = React.memo(({ label, id, checked, onChange, className = '', wrapperClass = '', description, ...props }) => {
  return (
    <div className={`mb-3 ${wrapperClass}`}>
      <div className="flex items-start">
        <div className="flex items-center h-5 mt-0.5">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className={`h-5 w-5 text-primary dark:text-primary-light border-gray-300 dark:border-gray-600 rounded 
                        focus:ring-2 focus:ring-offset-0 focus:ring-primary dark:focus:ring-primary-light 
                        transition duration-150 ease-in-out cursor-pointer ${className}`}
            {...props}
          />
        </div>
        <div className="ml-2.5 text-sm">
          <label htmlFor={id} className="font-medium text-text-light dark:text-text-dark cursor-pointer">
            {label}
          </label>
          {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
  );
});

export default Checkbox;
