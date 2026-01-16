import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'icon';
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  type = 'button',
  title,
  className = '',
}) => {
  const baseClasses = 'px-3 py-2 border-none rounded-md font-semibold transition-colors duration-200';

  const variantClasses: Record<string, string> = {
    primary: disabled
      ? 'bg-gray-400 text-white cursor-not-allowed'
      : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer',
    success: 'px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer',
    icon: 'bg-gray-100 text-base font-normal hover:bg-gray-200 cursor-pointer',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
