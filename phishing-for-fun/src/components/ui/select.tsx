import React from 'react';

export function Select({ value, onValueChange, children }: any) {
  // Simple wrapper — expects native select usage in markup
  return (
    <div>
      <select value={value} onChange={(e) => onValueChange?.(e.target.value)} className="rounded-md border px-3 py-2">
        {children}
      </select>
    </div>
  );
}

export function SelectTrigger({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}

export function SelectItem({ value, children }: { value: string; children?: React.ReactNode }) {
  return <option value={value}>{children || value}</option>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>;
}

export default Select;
