import { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

const Z_LEVELS = {
  primary: 9999,
  secondary: 10000,
  tertiary: 10001,
};

export default function ModalOverlay({
  open,
  onClose,
  children,
  level = 'primary',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = '',
}) {
  useBodyScrollLock(open);

  const handleEsc = useCallback((e) => {
    if (closeOnEsc && e.key === 'Escape') onClose?.();
  }, [closeOnEsc, onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, handleEsc]);

  if (!open) return null;

  const zIndex = Z_LEVELS[level] || Z_LEVELS.primary;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-2 sm:p-4 modal-overlay-enter ${className}`}
      style={{ zIndex }}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative modal-content-enter w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
