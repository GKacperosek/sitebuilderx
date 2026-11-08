import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean };
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', loading, className = '', children, disabled, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={`button button-${variant} button-${size} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading && <Loader2 size={16} className="spin" />}{children}</button>;
});
export default Button;
