import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  indeterminate,
  className = '',
  id,
  ...props
}) => {
  const checkboxId = id || `checkbox-${label?.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        id={checkboxId}
        className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        } ${className}`}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate || false;
        }}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className="text-sm text-gray-700 cursor-pointer">
          {label}
        </label>
      )}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
};
