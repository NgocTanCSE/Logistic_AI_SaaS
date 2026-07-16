import React from 'react';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  error,
  size = 'md',
  className = '',
  id,
  ...props
}) => {
  const switchId = id || `switch-${label?.replace(/\s/g, '-').toLowerCase()}`;

  const sizeClasses = {
    sm: 'w-8 h-4 after:w-3 after:h-3',
    md: 'w-10 h-5 after:w-4 after:h-4',
    lg: 'w-12 h-6 after:w-5 after:h-5',
  };

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={switchId}
        className={`relative inline-flex items-center cursor-pointer ${
          sizeClasses[size]
        }`}
      >
        <input
          type="checkbox"
          id={switchId}
          className="sr-only peer"
          {...props}
        />
        <div className={`bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all peer-checked:bg-blue-600 ${sizeClasses[size]}`} />
      </label>
      {label && (
        <label htmlFor={switchId} className="text-sm text-gray-700 cursor-pointer">
          {label}
        </label>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
