import React from "react";

interface ConfirmationModalProps {
  show: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  confirmBtnClass?: string;
  hideCancel?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmationModal({ 
  show, 
  title, 
  message, 
  confirmText = "Confirm",
  confirmBtnClass = "btn-primary text-white",
  hideCancel = false,
  onClose, 
  onConfirm 
}: ConfirmationModalProps) {
  if (!show) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="font-bold text-xl mb-2">{title}</h3>
        <p className="text-base-content/80 mb-4">
          {message}
        </p>
        
        <div className="modal-action">
          {!hideCancel && (
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          )}
          <button 
            className={`btn ${confirmBtnClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </div>
    </dialog>
  );
}
