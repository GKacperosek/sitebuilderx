import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
type ToastType = 'success' | 'error' | 'info';
const Context = createContext<{ toast: (message: string, type?: ToastType) => void } | undefined>(undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: string; message: string; type: ToastType }[]>([]);
  const toast = useCallback((message: string, type: ToastType = 'info') => { const id = crypto.randomUUID(); setItems(old => [...old.slice(-3), { id, message, type }]); setTimeout(() => setItems(old => old.filter(item => item.id !== id)), 5500); }, []);
  return <Context.Provider value={{ toast }}>{children}<div className="toast-stack" aria-live="polite">{items.map(item => { const Icon = item.type === 'success' ? CheckCircle2 : item.type === 'error' ? AlertCircle : Info; return <div key={item.id} className={`toast toast-${item.type}`} role={item.type === 'error' ? 'alert' : 'status'}><Icon size={19} /><span>{item.message}</span><button className="icon-button" onClick={() => setItems(old => old.filter(t => t.id !== item.id))} aria-label="Dismiss / Zamknij"><X size={15} /></button></div>; })}</div></Context.Provider>;
}
export function useToast() { const value = useContext(Context); if (!value) throw new Error('useToast requires ToastProvider'); return value; }
