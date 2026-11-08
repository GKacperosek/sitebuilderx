import { forwardRef, type SelectHTMLAttributes } from 'react';
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = '', children, ...props }, ref) { return <select ref={ref} className={`input select ${className}`} {...props}>{children}</select>; });
export default Select;
