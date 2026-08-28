import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = true,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure the element is in the DOM and visible
      setTimeout(() => cancelRef.current?.focus(), 0);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div 
        className="w-full max-w-md rounded-md border border-border bg-surface p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 shrink-0 rounded-sm p-2 ${isDestructive ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>
            <AlertCircle size={20} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-space-grotesk text-lg font-bold text-text">{title}</h3>
            <p className="text-sm leading-relaxed text-text-muted">{message}</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-md border border-control-border bg-control px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-control-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-text-on-accent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDestructive 
                ? 'bg-danger hover:bg-danger-hover focus:ring-danger' 
                : 'bg-accent hover:bg-accent-hover focus:ring-accent'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
