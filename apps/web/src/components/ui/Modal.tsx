import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
export function Modal({ open, onClose, title, children, className = '', footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; className?: string; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); const id = useId(); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,button,select,textarea,[tabindex="0"]')?.focus(), 20);
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || []).filter(el => el.offsetParent !== null);
        const first = elements[0]; const last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', handler); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={`modal ${className}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}><header className="modal-header"><h2 id={id}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close / Zamknij"><X size={20} /></button></header><div className="modal-content">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}</div></div>, document.body);
}
export default Modal;
