import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '680px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="bl-modal-backdrop" onClick={onClose}>
      <div
        className="bl-modal"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bl-modal-header">
          <h3 className="bl-modal-title">{title}</h3>
          <button
            className="bl-btn bl-btn-ghost bl-btn-sm"
            style={{ padding: '6px', borderRadius: '50%' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="bl-modal-body">{children}</div>
        {footer && <div className="bl-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
