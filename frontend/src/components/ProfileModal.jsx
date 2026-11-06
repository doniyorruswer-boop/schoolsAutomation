import React, { useState, useEffect } from 'react';
import { User, School, Phone, ShieldCheck, LogOut, ArrowRight, CheckCircle2, AlertCircle, X, Lock } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import ConfirmModal from './ConfirmModal';

export default function ProfileModal({ isOpen, onClose, user, onProfileUpdated, onSwitchAccount }) {
  const { lang, t } = useLanguage();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [schoolName, setSchoolName] = useState(user?.school_name || '');
  const [phoneLoginInput, setPhoneLoginInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setSchoolName(user.school_name || '');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.updateProfile({
        full_name: fullName.trim(),
        school_name: schoolName.trim()
      });
      setMessage(lang === 'ru' ? "Данные профиля успешно сохранены!" : "Profil ma'lumotlari muvaffaqiyatli saqlandi!");
      if (onProfileUpdated) onProfileUpdated(updated);
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setError(err.message || "Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    if (!phoneLoginInput.trim()) return;

    setLoggingIn(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.phoneLogin(phoneLoginInput.trim());
      localStorage.setItem('token', res.access_token);
      setMessage(lang === 'ru' ? "Вы успешно вошли в свой личный кабинет!" : "Hisobingizga muvaffaqiyatli kirdingiz!");
      setPhoneLoginInput('');
      if (onSwitchAccount) onSwitchAccount(res.user);
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || "Kirishda xatolik yuz berdi");
    } finally {
      setLoggingIn(false);
    }
  };

  const executeLogout = async () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('token');
    const newDeviceId = 'usr_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('device_id', newDeviceId);
    
    try {
      const res = await api.initGuestSession(newDeviceId);
      localStorage.setItem('token', res.access_token);
      if (onSwitchAccount) onSwitchAccount(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all border border-slate-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Modal sarlavhasi */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{t('profileTitle')}</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t('profileSubtitle')}</p>
          </div>
        </div>

        {/* Xavfsizlik va alohidalik eslatmasi */}
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-indigo-50/70 p-3.5 text-xs font-semibold text-indigo-900 border border-indigo-100">
          <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
          <span>{t('workspacePrivateNotice')}</span>
        </div>

        {/* Bildirishnomalar */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* 1. Joriy foydalanuvchi ma'lumotlarini tahrirlash */}
        <form onSubmit={handleSaveProfile} className="mt-5 space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700">{t('teacherNameLabel')}</label>
            <div className="relative mt-1">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('teacherNamePlaceholder')}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">{t('schoolNameLabel')}</label>
            <div className="relative mt-1">
              <School className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder={t('schoolNamePlaceholder')}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
          >
            {saving ? (lang === 'ru' ? 'Сохранение...' : 'Saqlanmoqda...') : t('saveProfileBtn')}
          </button>
        </form>

        {/* 2. Boshqa hisobga o'tish yoki telefon orqali kirish */}
        <div className="mt-6 border-t border-slate-200 pt-5 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{t('switchAccountTitle')}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{t('switchAccountDesc')}</p>
          </div>

          <form onSubmit={handlePhoneLogin} className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                value={phoneLoginInput}
                onChange={(e) => setPhoneLoginInput(e.target.value)}
                placeholder={t('phoneNumPlaceholder')}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn || !phoneLoginInput.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer shrink-0"
            >
              <span>{t('loginBtn')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* 3. Chiqish tugmasi */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            {lang === 'ru' ? 'Текущий профиль' : 'Joriy hisob'}: #{user?.id}
          </span>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 transition p-1 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t('logoutBtn')}</span>
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={executeLogout}
        title={lang === 'ru' ? "Выйти из рабочего пространства?" : "Ishchi muhitdan chiqish?"}
        description={lang === 'ru' 
          ? "Вы действительно хотите выйти и открыть новое чистое рабочее пространство?" 
          : "Hozirgi hisobdan chiqib, mutlaqo yangi mustaqil ishchi muhit ochmoqchimisiz?"}
        confirmText={lang === 'ru' ? "Да, выйти" : "Ha, chiqish"}
        cancelText={t('cancelBtn')}
        isDanger={true}
      />
    </div>
  );
}
