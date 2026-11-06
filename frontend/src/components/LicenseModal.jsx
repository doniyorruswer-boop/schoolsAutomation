import React, { useState } from 'react';
import { KeyRound, CheckCircle, AlertCircle, X, Shield, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import ConfirmModal from './ConfirmModal';

export default function LicenseModal({ isOpen, onClose, onActivated, currentLicense }) {
  const { lang, t } = useLanguage();

  const [keyCode, setKeyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!keyCode.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.activateLicense(keyCode.trim());
      setSuccess(lang === 'ru' ? "Лицензия успешно активирована!" : "Litsenziya muvaffaqiyatli faollashtirildi!");
      setTimeout(() => {
        setSuccess(null);
        setKeyCode('');
        onActivated(res);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeResetForTesting = async () => {
    setShowResetConfirm(false);
    setResetting(true);
    setError(null);
    try {
      await api.resetTestLicense();
      setSuccess(lang === 'ru' 
        ? "Лицензия сброшена! Теперь вы можете ввести новый код."
        : "Litsenziya tozalandi! Endi yangi foydalanuvchi sifatida kod kiritishingiz mumkin.");
      setTimeout(() => {
        setSuccess(null);
        onActivated(null);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-7 sm:p-8 shadow-2xl transition-all border border-slate-100">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shrink-0">
            <KeyRound className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{t('licModalTitle')}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{t('licModalSubtitle')}</p>
          </div>
        </div>

        {/* Hozirgi holat */}
        {currentLicense?.is_active ? (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  {lang === 'ru' ? 'Активный тариф' : 'Faol obuna'}: {currentLicense.plan_type}
                </p>
                <p className="text-xs text-emerald-700">
                  {lang === 'ru' 
                    ? `Осталось дней: ${currentLicense.days_left}` 
                    : `Qolgan muddat: ${currentLicense.days_left} kun`}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-200/60 px-3 py-1 rounded-lg">
              {t('licActive')}
            </span>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-xs sm:text-sm text-amber-800 font-medium">
              {lang === 'ru'
                ? "У вас пока нет активной лицензии. Введите код для снятия всех ограничений."
                : "Sizda hozircha faol litsenziya yo'q. To'liq imkoniyatlardan foydalanish uchun kodni kiriting."}
            </div>
          </div>
        )}

        {/* Xatolik yoki muvaffaqiyat */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm font-bold text-red-600 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-sm font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Forma */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700">{t('licInputLabel')}</label>
            <input
              type="text"
              value={keyCode}
              onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
              placeholder={t('licInputPlaceholder')}
              className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-lg font-mono font-bold tracking-wider text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 placeholder:font-normal"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{t('activatingBtn')}</span>
              </>
            ) : (
              <>
                <KeyRound className="h-5 w-5" />
                <span>{t('activateBtn')}</span>
              </>
            )}
          </button>
        </form>

        {/* Sinov kodlari namoyishi */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {t('testKeysLabel')}
          </p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => { setKeyCode('EDU-TEST-2026-PRO1'); setError(null); }}
              className="w-full text-left font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-50 p-2 rounded-xl transition flex justify-between items-center cursor-pointer"
            >
              <span>EDU-TEST-2026-PRO1</span>
              <span className="text-[11px] font-sans text-slate-500">{lang === 'ru' ? '1 месяц PRO' : '1 oylik PRO'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setKeyCode('EDU-MAKTAB-7777-YEAR'); setError(null); }}
              className="w-full text-left font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-50 p-2 rounded-xl transition flex justify-between items-center cursor-pointer"
            >
              <span>EDU-MAKTAB-7777-YEAR</span>
              <span className="text-[11px] font-sans text-slate-500">{lang === 'ru' ? '1 год PRO' : '1 yillik PRO'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setKeyCode('EDU-2026-TRIAL-PRO'); setError(null); }}
              className="w-full text-left font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-50 p-2 rounded-xl transition flex justify-between items-center cursor-pointer"
            >
              <span>EDU-2026-TRIAL-PRO</span>
              <span className="text-[11px] font-sans text-slate-500">{lang === 'ru' ? '1 месяц PRO' : '1 oylik PRO'}</span>
            </button>
          </div>

          {/* Sinov holatiga qaytarish (Reset) */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">{lang === 'ru' ? 'Для тестирования:' : 'Sinov maqsadida:'}</span>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={resetting}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 transition p-1 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span>{t('resetTestBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={executeResetForTesting}
        title={lang === 'ru' ? "Сбросить лицензию?" : "Litsenziyani tozalash?"}
        description={lang === 'ru'
          ? "Вы уверены, что хотите сбросить лицензию для тестового пользователя?"
          : "Haqiqatan ham litsenziyani tozalab, yangi o'qituvchi holatiga o'tmoqchimisiz?"}
        confirmText={lang === 'ru' ? "Да, сбросить" : "Ha, tozalash"}
        cancelText={t('cancelBtn')}
        isDanger={true}
        loading={resetting}
      />
    </div>
  );
}
