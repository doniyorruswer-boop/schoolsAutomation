import React, { useState, useEffect } from 'react';
import { 
  Presentation, Sparkles, Download, CheckCircle2, ChevronRight, ChevronLeft, 
  Image as ImageIcon, ImageOff, Edit3, Eye, Plus, Trash2, Sliders 
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';
import MathText from './MathText';

export default function PresentationGenerator() {
  const { lang, t } = useLanguage();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectName, setSelectedSubjectName] = useState('Algebra');
  const [grade, setGrade] = useState(7);
  const [topicTitle, setTopicTitle] = useState('Kasr sonlar bilan ishlash');
  const [slideCount, setSlideCount] = useState(5);
  const [includeImages, setIncludeImages] = useState(true);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [presentation, setPresentation] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // Tilga qarab fanlarni saralash (O'zbekcha yoki Ruscha)
  const displayedSubjects = subjects.filter(s => {
    const isCyrillic = /[\u0400-\u04FF]/.test(s.name);
    return lang === 'ru' ? isCyrillic : !isCyrillic;
  });
  const currentSubjectList = displayedSubjects.length > 0 ? displayedSubjects : subjects;

  useEffect(() => {
    api.getSubjects()
      .then(data => {
        setSubjects(data);
      })
      .catch(console.error);
  }, []);

  // Til o'zgarganda avtomatik mos fanni va mavzu misolini tanlash
  useEffect(() => {
    if (currentSubjectList.length > 0) {
      setSelectedSubjectName(currentSubjectList[0].name);
    }
    if (lang === 'ru') {
      if (topicTitle === 'Kasr sonlar bilan ishlash' || !topicTitle) {
        setTopicTitle('Сложение и вычитание обыкновенных дробей');
      }
    } else {
      if (topicTitle === 'Сложение и вычитание обыкновенных дробей' || !topicTitle) {
        setTopicTitle('Kasr sonlar bilan ishlash');
      }
    }
  }, [lang, subjects]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topicTitle.trim()) {
      setError(lang === 'ru' ? "Пожалуйста, введите тему урока!" : "Iltimos, mavzu nomini kiriting!");
      return;
    }

    setLoading(true);
    setError(null);
    setPresentation(null);
    setCurrentSlideIndex(0);
    setIsEditing(false);

    try {
      const data = await api.generatePresentation({
        subject_name: selectedSubjectName,
        grade: Number(grade),
        topic_title: topicTitle.trim(),
        slide_count: Number(slideCount),
        include_images: includeImages,
        lang: lang
      });
      setPresentation(data);
    } catch (err) {
      setError(err.message || (lang === 'ru' ? "Ошибка создания презентации" : "Taqdimot yaratishda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPptx = async () => {
    if (!presentation) return;
    setDownloading(true);
    try {
      const payload = {
        ...presentation,
        include_images: includeImages
      };
      await api.exportPptx(payload);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  // Slayd matnlarini tahrirlash funksiyalari
  const updateCurrentSlide = (field, value) => {
    setPresentation(prev => {
      const newSlides = [...prev.slides];
      newSlides[currentSlideIndex] = {
        ...newSlides[currentSlideIndex],
        [field]: value
      };
      return { ...prev, slides: newSlides };
    });
  };

  const updateBulletPoint = (bulletIndex, text) => {
    setPresentation(prev => {
      const newSlides = [...prev.slides];
      const newBullets = [...newSlides[currentSlideIndex].bullet_points];
      newBullets[bulletIndex] = text;
      newSlides[currentSlideIndex] = {
        ...newSlides[currentSlideIndex],
        bullet_points: newBullets
      };
      return { ...prev, slides: newSlides };
    });
  };

  const addBulletPoint = () => {
    setPresentation(prev => {
      const newSlides = [...prev.slides];
      const defaultText = lang === 'ru' ? "Новое правило или тезис урока..." : "Yangi ma'lumot yoki qoida...";
      const newBullets = [...(newSlides[currentSlideIndex].bullet_points || []), defaultText];
      newSlides[currentSlideIndex] = {
        ...newSlides[currentSlideIndex],
        bullet_points: newBullets
      };
      return { ...prev, slides: newSlides };
    });
  };

  const removeBulletPoint = (bulletIndex) => {
    setPresentation(prev => {
      const newSlides = [...prev.slides];
      const newBullets = newSlides[currentSlideIndex].bullet_points.filter((_, idx) => idx !== bulletIndex);
      newSlides[currentSlideIndex] = {
        ...newSlides[currentSlideIndex],
        bullet_points: newBullets
      };
      return { ...prev, slides: newSlides };
    });
  };

  const currentSlide = presentation?.slides?.[currentSlideIndex];

  return (
    <div className="space-y-8">
      {/* Forma qismi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <Presentation className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('presTitle')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('presSubtitle')}</p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="text-sm font-bold text-slate-700">{t('selectSubject')}</label>
              <select
                value={selectedSubjectName}
                onChange={(e) => setSelectedSubjectName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 font-medium"
              >
                {currentSubjectList.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">{t('grade')}</label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 font-medium"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                  <option key={g} value={g}>{g}{t('gradeSuffix')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">{t('slideCountLabel')}</label>
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 font-medium"
              >
                <option value={5}>5 {t('slideSuffix')} ({lang === 'ru' ? 'Стандарт 45 мин' : 'Standart 45 min'})</option>
                <option value={7}>7 {t('slideSuffix')} ({lang === 'ru' ? 'Подробно' : 'Batafsil'})</option>
                <option value={10}>10 {t('slideSuffix')} ({lang === 'ru' ? 'Полный курс' : 'Keng qamrovli'})</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">{t('topicTitleLabel')}</label>
            <input
              type="text"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder={t('topicTitlePlaceholder')}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 font-medium"
              required
            />
          </div>

          {/* Rasm ON / OFF tugmasi (Toggle) */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              {includeImages ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <ImageIcon className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                  <ImageOff className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {lang === 'ru' 
                    ? "Добавление AI-иллюстраций в слайды PowerPoint" 
                    : "PowerPoint slaydlariga AI rasmlarini joylash"}
                </p>
                <p className="text-xs text-slate-500">
                  {includeImages 
                    ? (lang === 'ru' ? "Включено: К каждому слайду генерируется тематическая иллюстрация" : "Yoqilgan (ON): Har bir slaydga mos tushuvchi ta'limiy illyustratsiya chiziladi")
                    : (lang === 'ru' ? "Отключено: Только структурированный текст и формулы без картинок" : "O'chirilgan (OFF): Rasmlarsiz, faqat toza matnli keng slaydlar bo'ladi")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIncludeImages(!includeImages)}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                includeImages ? 'bg-violet-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  includeImages ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-violet-600 py-3.5 text-base font-bold text-white shadow-md shadow-violet-500/25 hover:bg-violet-700 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{t('generatingPres')}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>{t('generatePresBtn')}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Natija va Gamma uslubidagi interaktiv ko'rish & tahrirlash */}
      {presentation && currentSlide && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-900">{presentation.title}</h3>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                  {presentation.slides.length} {t('slideSuffix')}
                </span>
                {includeImages ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    <span>AI Rasm</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <ImageOff className="h-3 w-3" />
                    <span>{lang === 'ru' ? 'Без картинок' : 'Rasmsiz'}</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                {presentation.grade}{t('gradeSuffix')} {presentation.subject} {lang === 'ru' ? 'для интерактивной доски и проектора' : 'darsi uchun tayyor ko\'rgazmali material'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border transition cursor-pointer ${
                  isEditing 
                    ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                <span>{isEditing ? (lang === 'ru' ? "Режим просмотра" : "Ko'rish rejimi") : (lang === 'ru' ? "Редактировать текст" : "Matnni tahrirlash")}</span>
              </button>

              <button
                onClick={handleDownloadPptx}
                disabled={downloading}
                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-sm font-bold text-white shadow-md transition cursor-pointer"
              >
                {downloading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{lang === 'ru' ? 'Создание .pptx...' : 'Fayl tayyorlanmoqda...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>{t('downloadPptx')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Slayd Kartasi (Gamma uslubi) */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-10 text-white shadow-xl min-h-[460px] flex flex-col justify-between border border-slate-700">
            {/* Slayd yuqori qismi: Metadata & Raqami */}
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-violet-400">
                {presentation.subject} | {presentation.grade}{t('gradeSuffix')}
              </span>
              <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-mono font-bold text-slate-300 border border-slate-700">
                {currentSlideIndex + 1} / {presentation.slides.length}
              </span>
            </div>

            {/* Slayd mazmuni: Ikki ustunli (Matn + Rasm) yoki Yagona keng matn */}
            <div className="my-auto py-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              {/* Matn ustuni */}
              <div className={`${includeImages && currentSlide.image_prompt ? 'md:col-span-7' : 'md:col-span-12'} space-y-5`}>
                
                {/* Sarlavha (Ko'rish yoki Tahrirlash) */}
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                      {t('titlePlaceholder')}
                    </label>
                    <input
                      type="text"
                      value={currentSlide.title}
                      onChange={(e) => updateCurrentSlide('title', e.target.value)}
                      className="w-full rounded-xl bg-slate-800/90 border border-amber-400/60 px-4 py-2 text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      value={currentSlide.subtitle || ''}
                      onChange={(e) => updateCurrentSlide('subtitle', e.target.value)}
                      placeholder={t('subtitlePlaceholder')}
                      className="w-full rounded-xl bg-slate-800/70 border border-slate-600 px-4 py-1.5 text-sm text-slate-300 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <h4 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                      <MathText text={currentSlide.title} />
                    </h4>
                    {currentSlide.subtitle && (
                      <p className="mt-1.5 text-base sm:text-lg text-violet-300 font-medium">
                        <MathText text={currentSlide.subtitle} />
                      </p>
                    )}
                  </div>
                )}

                {/* Tezislar ro'yxati (Bullet points) */}
                <div className="rounded-2xl bg-white/5 backdrop-blur-sm p-6 border border-white/10 space-y-3.5">
                  {currentSlide.bullet_points?.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-3.5 group">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-violet-400 shrink-0 shadow-xs" />
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => updateBulletPoint(bIdx, e.target.value)}
                            className="flex-1 rounded-lg bg-slate-800/90 border border-slate-600 px-3 py-1.5 text-base text-white focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => removeBulletPoint(bIdx)}
                            className="text-slate-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-normal">
                          <MathText text={bullet} />
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Yangi tezis qo'shish (faqat tahrirlash rejimida) */}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={addBulletPoint}
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t('addBulletBtn')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rasm ustuni (Agar yoqilgan bo'lsa) */}
              {includeImages && currentSlide.image_prompt && (
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="relative group w-full overflow-hidden rounded-2xl border-2 border-violet-500/30 bg-slate-900/60 shadow-2xl">
                    <img
                      src={`https://image.pollinations.ai/prompt/${encodeURIComponent(currentSlide.image_prompt + ' educational 3d clean')}`}
                      alt={currentSlide.title}
                      className="w-full h-56 sm:h-64 object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-2.5 left-3 right-3 text-[11px] font-mono text-slate-300 truncate">
                      💡 {currentSlide.image_prompt}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Slayd pastki qismi: Brend va interfaol navigatsiya */}
            <div className="flex items-center justify-between border-t border-slate-700/60 pt-4">
              <span className="text-xs text-slate-400 font-medium">
                EduMaktab AI • {lang === 'ru' ? 'Адаптировано для интерактивной доски' : 'Interfaol doska uchun moslangan'}
              </span>

              {/* Oldingi / Keyingi navigatsiya tugmalari */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                  className="flex items-center gap-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40 transition cursor-pointer border border-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>{t('prevSlide')}</span>
                </button>

                {/* Sahifa indikator nuqtalari */}
                <div className="flex items-center gap-1 px-2">
                  {presentation.slides.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setCurrentSlideIndex(dotIdx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        dotIdx === currentSlideIndex 
                          ? 'w-6 bg-violet-400' 
                          : 'w-2 bg-slate-600 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentSlideIndex === presentation.slides.length - 1}
                  onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                  className="flex items-center gap-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40 transition cursor-pointer border border-slate-700"
                >
                  <span>{t('nextSlide')}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
