
import React from 'react';

interface DropdownOption {
  value: string | number;
  label: string;
}

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: DropdownOption[];
  error?: string;
  wrapperClass?: string;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = React.memo(({ label, id, options, error, className = '', wrapperClass = '', ...props }) => {
  const baseStyle = `block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none sm:text-sm 
                     appearance-none bg-no-repeat bg-right 
                     transition-colors duration-200 ease-in-out bg-transparent`;
  const normalStyle = `border-gray-300 dark:border-gray-600 
                       text-gray-900 dark:text-gray-100 
                       focus:ring-2 focus:ring-primary/60 focus:border-primary 
                       dark:focus:ring-primary-light/60 dark:focus:border-primary-light
                       placeholder-gray-400 dark:placeholder-gray-500`;
  const errorStyle = `border-red-500 text-red-600 focus:ring-2 focus:ring-red-500/50 focus:border-red-500
                      placeholder-red-400 dark:placeholder-red-500`;
  
  // Custom arrow styling using background image (SVG)
  const customArrow = `bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M10%2012.586l-4.293-4.293a1%201%200%2010-1.414%201.414l5%205a1%201%200%20001.414%200l5-5a1%201%200%2000-1.414-1.414L10%2012.586z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%23f3f4f6%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M10%2012.586l-4.293-4.293a1%201%200%2010-1.414%201.414l5%205a1%201%200%20001.414%200l5-5a1%201%200%2000-1.414-1.414L10%2012.586z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25em_1.25em] bg-[center_right_0.75rem] pr-8`;


  return (
    <div className={`mb-4 ${wrapperClass}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`${baseStyle} ${customArrow} ${error ? errorStyle : normalStyle} ${className}`}
        {...props}
      >
        {props.placeholder && <option value="" disabled className="text-gray-400 dark:text-gray-500">{props.placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value} className="text-text-light dark:text-text-dark bg-card-light dark:bg-card-dark">
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
});

export default Dropdown;
