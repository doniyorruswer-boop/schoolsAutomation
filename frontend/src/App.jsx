import React, { useState, useEffect } from 'react';
import { Sparkles, FileSpreadsheet, FolderCheck, KeyRound, CheckCircle, Shield, Presentation, Globe, User as UserIcon, Calendar } from 'lucide-react';
import { api } from './api';
import Logo from './components/Logo';
import BSBGenerator from './components/BSBGenerator';
import TahlilBayonnomasi from './components/TahlilBayonnomasi';
import PresentationGenerator from './components/PresentationGenerator';
import KTPGenerator from './components/KTPGenerator';
import LicenseModal from './components/LicenseModal';
import ProfileModal from './components/ProfileModal';
import { LanguageProvider, useLanguage } from './i18n';

function MainApp() {
  const { lang, setLang, t } = useLanguage();

  const [activeTab, setActiveTab] = useState('bsb'); // 'bsb', 'tahlil', 'presentation', 'saved'
  const [currentUser, setCurrentUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [savedAssessments, setSavedAssessments] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const [bsbInitialConfig, setBsbInitialConfig] = useState(null);

  const handleNavigateToBSB = (config) => {
    setBsbInitialConfig(config);
    setActiveTab('bsb');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Har bir obunachi uchun mustaqil ishchi muhit (workspace)ni yuklash
  const initSession = async () => {
    let token = localStorage.getItem('token');
    if (!token) {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem('device_id', deviceId);
      }
      try {
        const session = await api.initGuestSession(deviceId);
        localStorage.setItem('token', session.access_token);
        setCurrentUser(session.user);
      } catch (err) {
        console.error("Session init failed:", err);
      }
    } else {
      try {
        const user = await api.getMe();
        setCurrentUser(user);
      } catch (err) {
        console.warn("Session expired or invalid, creating new device session");
        localStorage.removeItem('token');
        initSession();
        return;
      }
    }
    fetchLicense();
    fetchSaved();
  };

  const fetchLicense = () => {
    api.getLicenseStatus()
      .then(setLicenseStatus)
      .catch(console.error);
  };

  const fetchSaved = () => {
    api.getMyAssessments()
      .then(setSavedAssessments)
      .catch(console.error);
    api.getMyLessonPlans()
      .then(setSavedPlans)
      .catch(console.error);
  };

  useEffect(() => {
    initSession();
  }, []);

  const handleAccountSwitched = (newUser) => {
    setCurrentUser(newUser);
    fetchLicense();
    fetchSaved();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-12 flex flex-col font-sans text-slate-800">
      {/* Yuqori Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo size={42} />
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl flex items-center gap-2">
                <span>EduMaktab</span>
                <span className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-2 py-0.5 text-xs font-black text-white shadow-xs tracking-wider">
                  AI
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">{t('appSubtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* O'qituvchining Shaxsiy Profili (Har bir obunachiniki alohida) */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              title={lang === 'ru' ? "Личный кабинет / Сменить профиль" : "Shaxsiy kabinet / Hisobni almashtirish"}
              className="flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shrink-0">
                {(currentUser?.full_name || "O")[0].toUpperCase()}
              </div>
              <span className="max-w-[110px] sm:max-w-[150px] truncate text-slate-900 font-bold">
                {currentUser?.full_name || (lang === 'ru' ? "Учитель" : "O'qituvchi")}
              </span>
            </button>

            {/* Tilni almashtirish tugmasi (Uzbek / Russian) */}
            <div className="flex items-center rounded-full bg-slate-100 p-0.5 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setLang('uz')}
                title="O'zbek tili"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-full transition cursor-pointer ${
                  lang === 'uz'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇺🇿</span>
                <span className="hidden sm:inline">O'Z</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('ru')}
                title="Русский язык"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-full transition cursor-pointer ${
                  lang === 'ru'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇷🇺</span>
                <span className="hidden sm:inline">РУ</span>
              </button>
            </div>

            {/* Litsenziya ko'rsatkichi va Kod kiritish tugmasi */}
            {licenseStatus?.is_active ? (
              <button
                onClick={() => setIsLicenseModalOpen(true)}
                title={lang === 'ru' ? "Посмотреть лицензию или изменить код" : "Litsenziyani ko'rish yoki yangi kod kiritish"}
                className="flex items-center gap-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 border border-emerald-300 text-xs font-bold text-emerald-800 shadow-xs cursor-pointer transition"
              >
                <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{licenseStatus.plan_type} ({t('proDaysLeft', { days: licenseStatus.days_left })})</span>
              </button>
            ) : (
              <button
                onClick={() => setIsLicenseModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition cursor-pointer animate-pulse"
              >
                <KeyRound className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {licenseStatus?.trial_assessments_left > 0
                    ? `${t('trialLeft', { count: licenseStatus.trial_assessments_left })}`
                    : t('enterCode')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop tab navigatsiyasi */}
        <div className="hidden sm:block border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl gap-8 px-8">
            <button
              onClick={() => setActiveTab('bsb')}
              className={`flex items-center gap-2.5 py-4 text-sm sm:text-base font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'bsb'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-4.5 w-4.5" />
              <span>{t('tabBsb')}</span>
            </button>

            <button
              onClick={() => setActiveTab('tahlil')}
              className={`flex items-center gap-2.5 py-4 text-sm sm:text-base font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'tahlil'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="h-4.5 w-4.5" />
              <span>{t('tabTahlil')}</span>
            </button>

            <button
              onClick={() => setActiveTab('presentation')}
              className={`flex items-center gap-2.5 py-4 text-sm sm:text-base font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'presentation'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Presentation className="h-4.5 w-4.5" />
              <span>{t('tabPresentation')}</span>
            </button>

            <button
              onClick={() => setActiveTab('ktp')}
              className={`flex items-center gap-2.5 py-4 text-sm sm:text-base font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'ktp'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-4.5 w-4.5" />
              <span>{t('tabKtp')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('saved'); fetchSaved(); }}
              className={`flex items-center gap-2.5 py-4 text-sm sm:text-base font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'saved'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderCheck className="h-4.5 w-4.5" />
              <span>{t('tabSaved')} ({savedAssessments.length + savedPlans.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Asosiy kontent */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
        {activeTab === 'bsb' && (
          <BSBGenerator 
            onAssessmentCreated={() => { fetchSaved(); fetchLicense(); }} 
            initialConfig={bsbInitialConfig}
          />
        )}

        {activeTab === 'tahlil' && (
          <TahlilBayonnomasi />
        )}

        {activeTab === 'presentation' && (
          <PresentationGenerator />
        )}

        {activeTab === 'ktp' && (
          <KTPGenerator 
            onNavigateToBSB={handleNavigateToBSB}
          />
        )}

        {activeTab === 'saved' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('savedTitle')}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {lang === 'ru' 
                    ? 'Ваш личный архив созданных документов: СОР/СОЧ, КТП и поурочных планов' 
                    : 'Sizning shaxsiy yaratilgan hujjatlaringiz arxivi: BSB/CHSB, KTP va dars ishlanmalari'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3.5 py-1 text-sm font-bold text-slate-700">
                {lang === 'ru' ? 'Всего:' : 'Jami:'} {savedAssessments.length + savedPlans.length}
              </span>
            </div>

            {savedAssessments.length === 0 && savedPlans.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm sm:text-base">
                {t('noSavedDocs')}
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. BSB va CHSB Hujjatlari */}
                {savedAssessments.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>BSB / CHSB Variantlari ({savedAssessments.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {savedAssessments.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:bg-slate-100 hover:border-slate-300"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-base sm:text-lg font-bold text-slate-900">{item.title}</span>
                              {item.status === 'APPROVED' ? (
                                <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                  {t('approvedStatus')}
                                </span>
                              ) : (
                                <span className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                  {t('draftStatus')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">
                              <span className="font-semibold text-slate-700">{t('grade')}:</span> {item.grade}{t('gradeSuffix')} &nbsp;|&nbsp; 
                              <span className="font-semibold text-slate-700"> {t('totalScore')}:</span> {item.total_max_score} &nbsp;|&nbsp; 
                              <span className="font-semibold text-slate-700"> {t('variantsCount')}:</span> {item.variants_count} {t('variantSuffix')}
                            </p>
                          </div>

                          <a
                            href={api.exportBSBWordUrl(item.id)}
                            download
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
                          >
                            Word (.docx)
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. KTP va Konspekt Hujjatlari */}
                {savedPlans.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <span>{lang === 'ru' ? 'КТП и Поурочные планы' : 'KTP va Dars Ishlanmalari'} ({savedPlans.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {savedPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-emerald-50/40 p-5 transition hover:bg-emerald-50/80 hover:border-emerald-300"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-base sm:text-lg font-bold text-slate-900">{plan.title}</span>
                              <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                {(plan.plan_type === 'KTP' || plan.plan_type === 'ktp') ? 'KTP' : (lang === 'ru' ? 'Конспект' : 'Konspekt')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">
                              <span className="font-semibold text-slate-700">{t('grade')}:</span> {plan.grade}{t('gradeSuffix')} &nbsp;|&nbsp; 
                              <span className="font-semibold text-slate-700"> {lang === 'ru' ? 'Период / Тема' : 'Davr / Mavzu'}:</span> {plan.topic_title || plan.period || 'Reja'} &nbsp;|&nbsp; 
                              <span className="font-semibold text-slate-700"> {lang === 'ru' ? 'Год' : 'Yil'}:</span> {plan.school_year || '2024-2025'}
                            </p>
                          </div>

                          <a
                            href={api.exportLessonPlanWordUrl(plan.id)}
                            download
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                          >
                            Word (.docx)
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobil pastki navigatsiya */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md sm:hidden">
        <div className="grid grid-cols-5 py-2.5 text-center">
          <button
            onClick={() => setActiveTab('bsb')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'bsb' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[11px]">{lang === 'ru' ? 'СОР/СОЧ' : 'BSB'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tahlil')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'tahlil' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <FileSpreadsheet className="h-5 w-5" />
            <span className="text-[11px]">{lang === 'ru' ? 'Протокол' : 'Tahlil'}</span>
          </button>

          <button
            onClick={() => setActiveTab('presentation')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'presentation' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Presentation className="h-5 w-5" />
            <span className="text-[11px]">{lang === 'ru' ? 'Слайды' : 'Slayd'}</span>
          </button>

          <button
            onClick={() => setActiveTab('ktp')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'ktp' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[11px]">{lang === 'ru' ? 'КТП' : 'KTP'}</span>
          </button>

          <button
            onClick={() => { setActiveTab('saved'); fetchSaved(); }}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'saved' ? 'text-blue-600 font-bold' : 'text-slate-500'
            }`}
          >
            <FolderCheck className="h-5 w-5" />
            <span className="text-[11px]">{lang === 'ru' ? 'Архив' : 'Hujjatlar'}</span>
          </button>
        </div>
      </nav>

      {/* Profil Modali (Alohida hisoblar boshqaruvi) */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
        onSwitchAccount={handleAccountSwitched}
      />

      {/* Litsenziya Modali */}
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        currentLicense={licenseStatus}
        onActivated={() => {
          fetchLicense();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
