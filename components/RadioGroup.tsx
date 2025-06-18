
import React from 'react';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  label?: string;
  inline?: boolean;
  wrapperClass?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = React.memo(({ name, options, selectedValue, onChange, label, inline = false, wrapperClass = '' }) => {
  return (
    <div className={`mb-4 ${wrapperClass}`}>
      {label && <legend className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">{label}</legend>}
      <div className={`${inline ? 'flex flex-wrap items-center gap-x-4 gap-y-2' : 'space-y-2'}`}>
        {options.map(option => (
          <div key={option.value} className={`flex items-start ${inline ? '' : ''}`}>
             <div className="flex items-center h-5 mt-0.5">
                <input
                  id={`${name}-${option.value}`}
                  name={name}
                  type="radio"
                  value={option.value}
                  checked={selectedValue === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-5 w-5 text-primary dark:text-primary-light border-gray-300 dark:border-gray-600 
                            focus:ring-2 focus:ring-offset-0 focus:ring-primary dark:focus:ring-primary-light 
                            transition duration-150 ease-in-out cursor-pointer"
                />
            </div>
            <div className="ml-2.5 text-sm">
                <label htmlFor={`${name}-${option.value}`} className="font-medium text-text-light dark:text-text-dark cursor-pointer">
                {option.label}
                </label>
                {option.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default RadioGroup;
