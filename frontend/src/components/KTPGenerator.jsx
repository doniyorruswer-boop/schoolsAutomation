import React, { useState, useEffect } from 'react';
import { 
  Calendar, BookOpen, Download, Sparkles, CheckCircle2, 
  FileText, Clock, Layers, HelpCircle, Check, ArrowRight,
  UploadCloud, ShieldCheck, Lock
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import VoiceMicButton from './VoiceMicButton';
import MathText from './MathText';
import KTPUploadModal from './KTPUploadModal';

export default function KTPGenerator({ onNavigateToBSB }) {
  const { lang, t } = useLanguage();

  const [activeSubTab, setActiveSubTab] = useState('ktp'); // 'ktp' yoki 'konspekt'
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [grade, setGrade] = useState(7);
  const [period, setPeriod] = useState('annual');
  const [hoursPerWeek, setHoursPerWeek] = useState(2);
  const [schoolYear, setSchoolYear] = useState('2024-2025');
  const [includeBsbChsb, setIncludeBsbChsb] = useState(true);

  // Konspekt uchun holatlar
  const [quarter, setQuarter] = useState(1);
  const [konspektTopic, setKonspektTopic] = useState('Oddiy va o\'nli kasrlar ustida amallar');
  const [lessonType, setLessonType] = useState(lang === 'ru' ? 'Изучение нового материала' : 'Yangi bilim beruvchi dars');
  const [methods, setMethods] = useState(lang === 'ru' ? 'Блиц-опрос, объяснение, решение практических задач' : 'Aqliy hujum, blits-savollar, amaliy mashqlar');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ktpResult, setKtpResult] = useState(null);
  const [konspektResult, setKonspektResult] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [groundingNotice, setGroundingNotice] = useState('');

  const handleKTPUploaded = (uploadedPlan) => {
    setKtpResult(uploadedPlan);
    setActiveSubTab('ktp');
    if (uploadedPlan.subject_id) setSelectedSubject(uploadedPlan.subject_id);
    if (uploadedPlan.grade) setGrade(uploadedPlan.grade);
    setGroundingNotice(
      lang === 'ru'
        ? `КТП успешно импортирован! Загружено ${uploadedPlan.content?.schedule?.length || 0} уроков. Система зафиксирована на этом плане.`
        : `KTP muvaffaqiyatli yuklandi! ${uploadedPlan.content?.schedule?.length || 0} ta dars rejasi kiritildi va tizim qulflandi.`
    );
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  // KTP jadvalidagi istalgan darsdan bir marta bosish bilan 45 daqiqalik konspekt yaratish
  const handleQuickCreateKonspekt = async (item) => {
    setActiveSubTab('konspekt');
    setKonspektTopic(item.topic_title);
    setQuarter(item.quarter);
    const lType = item.lesson_type || (lang === 'ru' ? 'Изучение нового материала' : 'Yangi bilim beruvchi dars');
    setLessonType(lType);

    setLoading(true);
    setError(null);
    setKonspektResult(null);

    try {
      const data = await api.generateKonspekt({
        subject_id: Number(selectedSubject),
        grade: Number(grade),
        quarter: Number(item.quarter),
        topic_title: item.topic_title,
        lesson_type: lType,
        methods: methods,
        lang: lang
      });
      setKonspektResult(data);
      window.scrollTo({ top: 300, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || "Konspekt generatsiyasida xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // Tilga qarab fanlarni filtrlash
  const displayedSubjects = subjects.filter(s => {
    const isCyrillic = /[\u0400-\u04FF]/.test(s.name);
    return lang === 'ru' ? isCyrillic : !isCyrillic;
  });
  const currentSubjectList = displayedSubjects.length > 0 ? displayedSubjects : subjects;

  useEffect(() => {
    api.getSubjects()
      .then(data => {
        setSubjects(data);
        if (data.length > 0) {
          const first = (lang === 'ru' 
            ? data.find(s => /[\u0400-\u04FF]/.test(s.name)) 
            : data.find(s => !/[\u0400-\u04FF]/.test(s.name))) || data[0];
          setSelectedSubject(first.id);
        }
      })
      .catch(console.error);
  }, [lang]);

  // KTP Generatsiyasi
  const handleGenerateKTP = async (e) => {
    e.preventDefault();
    if (!selectedSubject) return;

    setLoading(true);
    setError(null);
    setKtpResult(null);

    try {
      const data = await api.generateKTP({
        subject_id: Number(selectedSubject),
        grade: Number(grade),
        period: period,
        hours_per_week: Number(hoursPerWeek),
        school_year: schoolYear,
        include_bsb_chsb: includeBsbChsb,
        lang: lang
      });
      setKtpResult(data);
    } catch (err) {
      setError(err.message || "KTP generatsiyasida xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // Konspekt Generatsiyasi
  const handleGenerateKonspekt = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !konspektTopic.trim()) return;

    setLoading(true);
    setError(null);
    setKonspektResult(null);

    try {
      const data = await api.generateKonspekt({
        subject_id: Number(selectedSubject),
        grade: Number(grade),
        quarter: Number(quarter),
        topic_title: konspektTopic.trim(),
        lesson_type: lessonType,
        methods: methods,
        lang: lang
      });
      setKonspektResult(data);
    } catch (err) {
      setError(err.message || "Dars ishlanmasi generatsiyasida xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Modul Sarlavhasi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('ktpTitle')}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{t('ktpSubtitle')}</p>
            </div>
          </div>

          {/* Sub-tablar va O'z KTP faylini yuklash */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSubTab('ktp')}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                  activeSubTab === 'ktp'
                    ? 'bg-white text-amber-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>{t('subTabKtp')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('konspekt')}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition cursor-pointer ${
                  activeSubTab === 'konspekt'
                    ? 'bg-white text-amber-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>{t('subTabKonspekt')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs transition cursor-pointer hover:scale-[1.02]"
            >
              <UploadCloud className="h-4 w-4 text-amber-700" />
              <span>{t('uploadKtpFileBtn')}</span>
            </button>
          </div>
        </div>

        {groundingNotice && (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 border border-emerald-200 flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-950">
                  {groundingNotice}
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {t('ktpGroundingNotice')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGroundingNotice('')}
              className="text-emerald-700 hover:text-emerald-950 text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {/* 1. KTP FORMASI */}
        {activeSubTab === 'ktp' && (
          <form onSubmit={handleGenerateKTP} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div>
                <label className="text-sm font-bold text-slate-700">{t('selectSubject')}</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 font-medium"
                >
                  {currentSubjectList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">{t('grade')}</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 font-medium"
                >
                  {[5, 6, 7, 8, 9, 10, 11].map(g => (
                    <option key={g} value={g}>{g}{t('gradeSuffix')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">{t('periodLabel')}</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 font-medium"
                >
                  <option value="annual">{t('periodAnnual')}</option>
                  <option value="quarter_1">{t('periodQ1')}</option>
                  <option value="quarter_2">{t('periodQ2')}</option>
                  <option value="quarter_3">{t('periodQ3')}</option>
                  <option value="quarter_4">{t('periodQ4')}</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">{t('hoursPerWeekLabel')}</label>
                <select
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 font-medium"
                >
                  <option value={1}>1 {t('hoursPerWeekSuffix')} (34 {lang === 'ru' ? 'ч/год' : 'soat/yil'})</option>
                  <option value={2}>2 {t('hoursPerWeekSuffix')} (68 {lang === 'ru' ? 'ч/год' : 'soat/yil'}) - Standart</option>
                  <option value={3}>3 {t('hoursPerWeekSuffix')} (102 {lang === 'ru' ? 'ч/год' : 'soat/yil'})</option>
                  <option value={4}>4 {t('hoursPerWeekSuffix')} (136 {lang === 'ru' ? 'ч/год' : 'soat/yil'})</option>
                </select>
              </div>
            </div>

            {/* BSB va CHSB haftalarini rejalashtirish */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {t('includeBsbChsbLabel')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lang === 'ru' 
                      ? 'В расписание автоматически будут включены уроки для проведения СОР и СОЧ' 
                      : 'Rejaga BSB va CHSB nazorat ishlari o\'tkaziladigan haftalar va darslar avtomatik kiritiladi'}
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={includeBsbChsb}
                onChange={(e) => setIncludeBsbChsb(e.target.checked)}
                className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 py-3.5 text-base font-bold text-white shadow-md shadow-amber-600/25 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t('generatingKtp')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>{t('generateKtpBtn')}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. KONSPEKT FORMASI */}
        {activeSubTab === 'konspekt' && (
          <form onSubmit={handleGenerateKonspekt} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label className="text-sm font-bold text-slate-700">{t('selectSubject')}</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 font-medium"
                >
                  {currentSubjectList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">{t('grade')}</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 font-medium"
                >
                  {[5, 6, 7, 8, 9, 10, 11].map(g => (
                    <option key={g} value={g}>{g}{t('gradeSuffix')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">{t('quarter')}</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 font-medium"
                >
                  {[1, 2, 3, 4].map(q => (
                    <option key={q} value={q}>{q}{t('quarterSuffix')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dars mavzusi (Ovozli mikrofon bilan) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-700">
                  {t('lessonTopicLabel')}
                </label>
                <span className="text-xs text-slate-400">
                  {lang === 'ru' ? 'Можно продиктовать:' : 'Ovoz bilan aytish:'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={konspektTopic}
                  onChange={(e) => setKonspektTopic(e.target.value)}
                  placeholder={t('lessonTopicPlaceholder')}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-base focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 font-medium"
                  required
                />
                <VoiceMicButton
                  onTranscript={(txt) => setKonspektTopic(txt)}
                  lang={lang}
                  size="md"
                  buttonTitle="Dars mavzusini mikrofonga ayting"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">{t('lessonTypeLabel')}</label>
                <input
                  type="text"
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">{t('lessonMethodsLabel')}</label>
                <input
                  type="text"
                  value={methods}
                  onChange={(e) => setMethods(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 py-3.5 text-base font-bold text-white shadow-md shadow-amber-600/25 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t('generatingKonspekt')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>{t('generateKonspektBtn')}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* KTP NATIJASI VA WORD YUKLAB OLISH */}
      {ktpResult && activeSubTab === 'ktp' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-black text-sm shrink-0">
                  {ktpResult.content?.total_hours || ktpResult.total_hours}
                </span>
                <h3 className="text-xl font-black text-slate-900">{ktpResult.title}</h3>
                {ktpResult.content?.is_custom_upload && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-xs font-bold">
                    <Lock className="h-3 w-3" />
                    <span>{t('ktpLockedBadge')}</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {ktpResult.content?.school_year} • {ktpResult.content?.hours_per_week} {t('hoursPerWeekSuffix')} • {ktpResult.content?.schedule?.length} {lang === 'ru' ? 'уроков' : 'ta dars'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onNavigateToBSB && (
                <button
                  type="button"
                  onClick={() => {
                    const q = ktpResult.content?.schedule?.[0]?.quarter || 1;
                    onNavigateToBSB({
                      subject_id: selectedSubject,
                      grade,
                      quarter: q,
                      assessment_type: 'BSB',
                      selectAll: true
                    });
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{lang === 'ru' ? 'Создать СОР/СОЧ по этому плану' : 'Ushbu reja asosida BSB/CHSB tuzish'}</span>
                </button>
              )}

              <a
                href={api.exportLessonPlanWordUrl(ktpResult.id)}
                download
                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>{t('downloadKtpWord')}</span>
              </a>
            </div>
          </div>

          {/* KTP Jadvali (Landscape ko'rinishida) */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-100 font-black text-slate-800 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-12 text-center">№</th>
                  <th className="px-3 py-3 w-20 text-center">{lang === 'ru' ? 'Четверть' : 'Chorak'}</th>
                  <th className="px-3 py-3 w-16 text-center">{lang === 'ru' ? 'Неделя' : 'Hafta'}</th>
                  <th className="px-4 py-3">{lang === 'ru' ? 'Тема урока' : 'Dars mavzusi'}</th>
                  <th className="px-3 py-3 w-16 text-center">{lang === 'ru' ? 'Часы' : 'Soat'}</th>
                  <th className="px-3 py-3 w-32">{lang === 'ru' ? 'Тип урока' : 'Dars turi'}</th>
                  <th className="px-4 py-3">{lang === 'ru' ? 'Требования ГОСО (Цели)' : 'DTS talablari (O\'quv maqsadlari)'}</th>
                  <th className="px-3 py-3 w-20 text-center">{lang === 'ru' ? 'Примечание' : 'Izoh'}</th>
                  <th className="px-3 py-3 w-32 text-center">{lang === 'ru' ? 'Действия' : 'Amallar'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ktpResult.content?.schedule?.map((item, idx) => {
                  const isControl = item.notes in ["BSB", "CHSB"] || item.topic_title?.includes("BSB") || item.topic_title?.includes("CHSB");
                  return (
                    <tr 
                      key={idx} 
                      className={`transition ${isControl ? 'bg-amber-50/80 font-bold text-amber-950' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="px-3 py-2.5 text-center font-bold text-slate-500">{item.lesson_number}</td>
                      <td className="px-3 py-2.5 text-center">{item.quarter}-ch.</td>
                      <td className="px-3 py-2.5 text-center font-mono">{item.week_number}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        <MathText text={item.topic_title} />
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-700">{item.hours}</td>
                      <td className="px-3 py-2.5 text-slate-600">{item.lesson_type}</td>
                      <td className="px-4 py-2.5 text-slate-700 leading-normal">
                        <MathText text={item.dts_requirements} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.notes && (
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                            item.notes === 'BSB' 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {item.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickCreateKonspekt(item)}
                            title={lang === 'ru' ? "Сгенерировать поурочный план (45 мин)" : "45 daqiqalik dars ishlanmasi (konspekt) yaratish"}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-1 text-xs font-bold transition cursor-pointer shadow-2xs hover:scale-105"
                          >
                            <FileText className="h-3 w-3 text-amber-700" />
                            <span>{lang === 'ru' ? 'Конспект' : 'Konspekt'}</span>
                          </button>

                          {item.notes === 'BSB' && onNavigateToBSB && (
                            <button
                              type="button"
                              onClick={() => onNavigateToBSB({
                                subject_id: selectedSubject,
                                grade,
                                quarter: item.quarter,
                                assessment_type: 'BSB',
                                selectAll: true
                              })}
                              title={lang === 'ru' ? "Создать СОР (БСБ) задания" : "Ushbu chorak bo'yicha BSB tuzish"}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 px-2 py-1 text-xs font-bold transition cursor-pointer shadow-2xs hover:scale-105"
                            >
                              <Sparkles className="h-3 w-3 text-blue-600" />
                              <span>BSB</span>
                            </button>
                          )}

                          {item.notes === 'CHSB' && onNavigateToBSB && (
                            <button
                              type="button"
                              onClick={() => onNavigateToBSB({
                                subject_id: selectedSubject,
                                grade,
                                quarter: item.quarter,
                                assessment_type: 'CHSB',
                                selectAll: true
                              })}
                              title={lang === 'ru' ? "Создать СОЧ (ЧСБ) задания" : "Chorak yakuniy CHSB tuzish"}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2 py-1 text-xs font-bold transition cursor-pointer shadow-2xs hover:scale-105"
                            >
                              <Sparkles className="h-3 w-3 text-indigo-600" />
                              <span>CHSB</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KONSPEKT NATIJASI VA WORD YUKLAB OLISH */}
      {konspektResult && activeSubTab === 'konspekt' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-black text-sm">
                  45'
                </span>
                <h3 className="text-xl font-black text-slate-900">{konspektResult.title}</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {konspektResult.grade}{t('gradeSuffix')} • {konspektResult.content?.subject_name} • 45 {lang === 'ru' ? 'минут' : 'daqiqa'}
              </p>
            </div>

            <a
              href={api.exportLessonPlanWordUrl(konspektResult.id)}
              download
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-sm font-bold text-white shadow-md transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{t('downloadKonspektWord')}</span>
            </a>
          </div>

          {/* Dars Maqsadlari Bloki */}
          <div className="rounded-2xl bg-amber-50/40 border border-amber-200/70 p-5 space-y-3">
            <h4 className="text-sm font-black text-amber-950 uppercase tracking-wider">
              {lang === 'ru' ? 'Цели и задачи урока (ГОСО):' : 'Darsning ta\'limiy maqsadlari (DTS):'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs">
                <span className="font-bold text-amber-900 block mb-1">🎯 {lang === 'ru' ? 'Обучающая цель:' : 'Ta\'limiy maqsad:'}</span>
                <p className="text-slate-700">{konspektResult.content?.educational_goal}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs">
                <span className="font-bold text-amber-900 block mb-1">🧠 {lang === 'ru' ? 'Развивающая цель:' : 'Rivojlantiruvchi maqsad:'}</span>
                <p className="text-slate-700">{konspektResult.content?.developmental_goal}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs">
                <span className="font-bold text-amber-900 block mb-1">🌱 {lang === 'ru' ? 'Воспитательная цель:' : 'Tarbiyaviy maqsad:'}</span>
                <p className="text-slate-700">{konspektResult.content?.upbringing_goal}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs">
                <span className="font-bold text-amber-900 block mb-1">💡 {lang === 'ru' ? 'Компетенции:' : 'Kompetensiyalar:'}</span>
                <p className="text-slate-700">{konspektResult.content?.competencies}</p>
              </div>
            </div>
          </div>

          {/* Darsning 45 daqiqalik texnologik xaritasi */}
          <div className="space-y-4">
            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span>{t('stagesTitle')}</span>
            </h4>

            <div className="space-y-3">
              {konspektResult.content?.stages?.map((stage, sIdx) => (
                <div key={sIdx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600 text-white text-xs font-black">
                        {stage.stage_number}
                      </span>
                      <span>{stage.title}</span>
                    </span>
                    <span className="rounded-full bg-amber-100 text-amber-800 font-bold text-xs px-2.5 py-0.5">
                      {stage.time_minutes} {lang === 'ru' ? 'мин' : 'daqiqa'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-700 block mb-0.5">👨‍🏫 {t('stageColTeacher')}:</span>
                      <p className="text-slate-600 leading-relaxed">{stage.teacher_activity}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-700 block mb-0.5">🙋 {t('stageColStudent')}:</span>
                      <p className="text-slate-600 leading-relaxed">{stage.student_activity}</p>
                    </div>
                  </div>

                  {stage.content && (
                    <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/60 text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <span className="font-black text-amber-950 block mb-1">📖 {lang === 'ru' ? 'Содержание и примеры на доске:' : 'Dars mazmuni va namunaviy misollar:'}</span>
                      <div className="whitespace-pre-wrap font-sans">
                        <MathText text={stage.content} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Uyga vazifa */}
          {konspektResult.content?.homework && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 text-sm font-medium text-slate-900">
              <span className="font-black text-amber-950 mr-2">📌 {t('homeworkTitle')}</span>
              <span className="font-semibold text-slate-800">{konspektResult.content.homework}</span>
            </div>
          )}
        </div>
      )}

      {/* KTP Faylini Yuklash Modali */}
      <KTPUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        subjects={subjects}
        defaultSubjectId={selectedSubject}
        defaultGrade={grade}
        onKTPUploaded={handleKTPUploaded}
      />
    </div>
  );
}
