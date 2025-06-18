
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = React.memo(({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyle = `font-semibold rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 
                     transition-all duration-200 ease-in-out flex items-center justify-center
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none`;

  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = `bg-primary hover:bg-primary-dark text-white 
                     focus-visible:ring-primary dark:bg-primary-dark dark:hover:bg-primary 
                     dark:focus-visible:ring-primary-light shadow-md hover:shadow-lg`;
      break;
    case 'secondary':
      variantStyle = `bg-secondary hover:bg-secondary-dark text-white
                     focus-visible:ring-secondary dark:bg-secondary-dark dark:hover:bg-secondary
                     dark:focus-visible:ring-secondary-light shadow-md hover:shadow-lg`;
      break;
    case 'danger':
      variantStyle = `bg-error-DEFAULT hover:bg-error-dark text-white 
                     focus-visible:ring-error-DEFAULT shadow-md hover:shadow-lg`;
      break;
    case 'success':
      variantStyle = `bg-success-DEFAULT hover:bg-success-dark text-white
                        focus-visible:ring-success-DEFAULT shadow-md hover:shadow-lg`;
      break;
    case 'ghost':
      variantStyle = `bg-transparent hover:bg-primary/10 dark:hover:bg-primary-light/10 
                     text-primary dark:text-primary-light focus-visible:ring-primary`;
      break;
    case 'outline':
      variantStyle = `border-2 border-primary text-primary hover:bg-primary hover:text-white 
                     dark:border-primary-light dark:text-primary-light 
                     dark:hover:bg-primary-light dark:hover:text-card-dark 
                     focus-visible:ring-primary shadow-sm hover:shadow-md`;
      break;
  }

  let sizeStyle = '';
  let iconSizeClass = 'text-base';
  switch (size) {
    case 'xs':
      sizeStyle = 'px-2.5 py-1 text-xs';
      iconSizeClass = 'text-xs';
      break;
    case 'sm':
      sizeStyle = 'px-3 py-1.5 text-sm';
      iconSizeClass = 'text-sm';
      break;
    case 'md':
      sizeStyle = 'px-5 py-2.5 text-base';
      iconSizeClass = 'text-base';
      break;
    case 'lg':
      sizeStyle = 'px-6 py-3 text-lg';
      iconSizeClass = 'text-lg';
      break;
  }

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${widthStyle} ${className} transform hover:scale-[1.03] active:scale-[0.98]`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className={`animate-spin h-5 w-5 ${variant === 'primary' || variant === 'secondary' || variant === 'danger' || variant === 'success' ? 'text-white' : 'text-primary dark:text-primary-light'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {leftIcon && !isLoading && <span className={`mr-2 ${iconSizeClass}`}>{leftIcon}</span>}
      {!isLoading && children}
      {rightIcon && !isLoading && <span className={`ml-2 ${iconSizeClass}`}>{rightIcon}</span>}
    </button>
  );
});

export default Button;
