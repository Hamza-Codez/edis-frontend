import React from 'react';

interface SegmentControlProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  disabled?: boolean;
}

export function SegmentControl({ value, onChange, options, disabled }: SegmentControlProps) {
  return (
    <div
      role="radiogroup"
      className={`inline-flex rounded-sm bg-structure p-1 border border-border ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => !disabled && onChange(option.value)}
            className={`
              flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent
              ${isSelected ? 'bg-surface text-text' : 'text-text-muted hover:text-text hover:bg-canvas'}
            `}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
