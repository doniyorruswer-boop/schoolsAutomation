import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Tasdiqlash",
  description = "Haqiqatan ham bu amalni bajarmoqchimisiz?",
  itemName = null,
  confirmText = "O'chirish",
  cancelText = "Bekor qilish",
  isDanger = true,
  loading = false
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Orqa fon (Backdrop with blur) */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => !loading && onClose()}
      />

      {/* Modal Oynasi (Card) */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 transition-all animate-scale-up">
        {/* Yopish tugmasi (X) */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          {/* Belgi (Icon) */}
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
            isDanger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {isDanger ? <Trash2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg font-black text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-normal">
              {description}
            </p>

            {/* O'chirilayotgan element nomi */}
            {itemName && (
              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-bold text-slate-800 break-words flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate">{itemName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tugmalar (Buttons) */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
            }`}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Kutilmoqda...</span>
              </>
            ) : (
              <>
                {isDanger && <Trash2 className="h-4 w-4" />}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
