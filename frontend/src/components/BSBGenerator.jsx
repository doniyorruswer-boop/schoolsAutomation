import React, { useState, useEffect } from 'react';
import { 
  Sparkles, FileText, CheckCircle2, Download, AlertTriangle, 
  ShieldCheck, ScanLine, Camera, Trash2, Plus, ListCheck, PenLine, Type,
  Volume2, ChevronDown, ChevronUp, CheckSquare, Square, UploadCloud, Lock,
  RefreshCw, BookOpen
} from 'lucide-react';
import { api } from '../api';
import TopicScannerModal from './TopicScannerModal';
import ConfirmModal from './ConfirmModal';
import KTPUploadModal from './KTPUploadModal';
import QuestionSwapModal from './QuestionSwapModal';
import MathText from './MathText';
import VoiceMicButton, { parseNumberFromVoice, parseSmartVoiceCommand } from './VoiceMicButton';
import { useLanguage } from '../i18n';

export default function BSBGenerator({ onAssessmentCreated, initialConfig }) {
  const { lang, t } = useLanguage();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [grade, setGrade] = useState(7);
  const [quarter, setQuarter] = useState(1);
  const [topics, setTopics] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [totalScore, setTotalScore] = useState(25);
  const [variantsCount, setVariantsCount] = useState(2);
  const [questionCount, setQuestionCount] = useState(5);
  const [customInstructions, setCustomInstructions] = useState('');
  const [textbookPages, setTextbookPages] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isKtpUploadOpen, setIsKtpUploadOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  const [swappingLoading, setSwappingLoading] = useState(false);

  const handleConfirmSwap = async ({ variantNumber, questionNumber, preferredDifficulty, customHint }) => {
    if (!result?.id) return;
    setSwappingLoading(true);
    try {
      const updated = await api.swapQuestion(result.id, {
        variant_number: variantNumber,
        question_number: questionNumber,
        preferred_difficulty: preferredDifficulty,
        custom_hint: customHint,
        lang
      });
      setResult(updated);
      setSwapTarget(null);
      setVoiceNotice(
        lang === 'ru'
          ? `Задание ${questionNumber} успешно заменено на новое!`
          : `${questionNumber}-savol muvaffaqiyatli yangisiga almashtirildi!`
      );
    } catch (err) {
      setError(err.message || "Savolni almashtirishda xatolik yuz berdi");
    } finally {
      setSwappingLoading(false);
    }
  };

  const handleKTPUploadedInBSB = async (uploadedPlan) => {
    if (uploadedPlan.subject_id) setSelectedSubject(uploadedPlan.subject_id);
    if (uploadedPlan.grade) setGrade(uploadedPlan.grade);

    const sId = uploadedPlan.subject_id || selectedSubject;
    const gr = uploadedPlan.grade || grade;
    try {
      const data = await api.getTopics(sId, gr, quarter);
      setTopics(data);
      setSelectedTopicIds(data.map(t => t.id));
      setVoiceNotice(
        lang === 'ru'
          ? `КТП учителя успешно загружен! Выбраны все ${data.length} тем.`
          : `O'qituvchi KTP si yuklandi! Barcha ${data.length} ta mavzu tanlandi.`
      );
    } catch (err) {
      console.warn("Mavzularni yangilashda xato:", err);
    }
  };

  // Ovozli boshqaruv va mavzularni kiritish
  const [inlineNewTopic, setInlineNewTopic] = useState('');
  const [addingInline, setAddingInline] = useState(false);
  const [showMultiPaste, setShowMultiPaste] = useState(false);
  const [manualText, setManualText] = useState('');
  const [voiceNotice, setVoiceNotice] = useState('');
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [deletingTopicLoading, setDeletingTopicLoading] = useState(false);

  // KTP dan kelgan konfiguratsiyani avtomatik o'rnatish
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.subject_id) setSelectedSubject(initialConfig.subject_id);
      if (initialConfig.grade) setGrade(Number(initialConfig.grade));
      if (initialConfig.quarter) setQuarter(Number(initialConfig.quarter));
      if (initialConfig.assessment_type === 'CHSB') {
        setTotalScore(40);
      } else if (initialConfig.assessment_type === 'BSB') {
        setTotalScore(25);
      }
      setVoiceNotice(
        lang === 'ru' 
          ? `Применена конфигурация из КТП: ${initialConfig.grade} класс, ${initialConfig.quarter}-я четверть`
          : `KTP dan qabul qilindi: ${initialConfig.grade}-sinf, ${initialConfig.quarter}-chorak`
      );
    }
  }, [initialConfig]);

  useEffect(() => {
    if (voiceNotice) {
      const timer = setTimeout(() => setVoiceNotice(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [voiceNotice]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [approving, setApproving] = useState(false);
  const [fontSizeScale, setFontSizeScale] = useState('large'); // 'standard' | 'large' | 'huge'

  const fontConfig = {
    standard: {
      question: 'text-base text-slate-900 font-semibold',
      header: 'text-base font-black text-slate-900',
      badge: 'text-xs px-2.5 py-0.5',
      descTitle: 'text-xs font-bold text-slate-600',
      tableTh: 'px-3.5 py-2.5 text-xs font-bold text-slate-700',
      tableTdStep: 'px-3.5 py-2.5 text-xs font-bold text-slate-500',
      tableTdDesc: 'px-3.5 py-2.5 text-sm font-medium text-slate-800',
      tableTdScore: 'px-3.5 py-2.5 text-sm font-black text-blue-700',
      answerBox: 'p-3 text-sm'
    },
    large: {
      question: 'text-lg sm:text-xl text-slate-950 font-bold leading-relaxed',
      header: 'text-lg sm:text-xl font-black text-slate-950',
      badge: 'text-sm px-3 py-1 font-bold',
      descTitle: 'text-sm font-black text-slate-700',
      tableTh: 'px-4 py-3.5 text-sm sm:text-base font-black text-slate-800',
      tableTdStep: 'px-4 py-3.5 text-sm sm:text-base font-bold text-slate-500',
      tableTdDesc: 'px-4 py-3.5 text-base sm:text-lg font-medium text-slate-900 leading-normal',
      tableTdScore: 'px-4 py-3.5 text-base sm:text-lg font-black text-blue-700',
      answerBox: 'p-4 text-base sm:text-lg font-medium'
    },
    huge: {
      question: 'text-xl sm:text-2xl text-slate-950 font-black leading-relaxed',
      header: 'text-xl sm:text-2xl font-black text-slate-950',
      badge: 'text-base px-3.5 py-1.5 font-black',
      descTitle: 'text-base font-black text-slate-800',
      tableTh: 'px-5 py-4 text-base sm:text-lg font-black text-slate-800',
      tableTdStep: 'px-5 py-4 text-base sm:text-lg font-bold text-slate-500',
      tableTdDesc: 'px-5 py-4 text-lg sm:text-xl font-medium text-slate-950 leading-relaxed',
      tableTdScore: 'px-5 py-4 text-lg sm:text-xl font-black text-blue-700',
      answerBox: 'p-5 text-lg sm:text-xl font-semibold'
    }
  };
  const currentFonts = fontConfig[fontSizeScale] || fontConfig.large;

  // Tilga qarab fanlarni saralash (O'zbekcha yoki Ruscha fanlar)
  const displayedSubjects = subjects.filter(s => {
    const isCyrillic = /[\u0400-\u04FF]/.test(s.name);
    return lang === 'ru' ? isCyrillic : !isCyrillic;
  });
  const currentSubjectList = displayedSubjects.length > 0 ? displayedSubjects : subjects;

  const loadTopics = (subjId = selectedSubject, gr = grade, q = quarter) => {
    if (!subjId) return;
    api.getTopics(subjId, gr, q)
      .then(data => {
        setTopics(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    api.getSubjects()
      .then(data => {
        setSubjects(data);
      })
      .catch(console.error);
  }, []);

  // Til o'zgarganda yoki fanlar yuklanganda avtomatik mos fanni tanlash
  useEffect(() => {
    if (currentSubjectList.length > 0) {
      const match = currentSubjectList.find(s => s.id === Number(selectedSubject));
      if (!match) {
        setSelectedSubject(currentSubjectList[0].id);
      }
    }
  }, [lang, subjects]);

  useEffect(() => {
    if (!selectedSubject) return;
    api.getTopics(selectedSubject, grade, quarter)
      .then(data => {
        setTopics(data);
        if (data.length > 0) {
          if (initialConfig?.selectAll) {
            setSelectedTopicIds(data.map(t => t.id));
          } else {
            setSelectedTopicIds([data[0].id]);
          }
        } else {
          setSelectedTopicIds([]);
        }
      })
      .catch(console.error);
  }, [selectedSubject, grade, quarter]);

  const toggleTopic = (id) => {
    setSelectedTopicIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // Mavzuni qo'lda tezkor qo'shish (katalog ro'yxatiga)
  const handleQuickAddTopic = async () => {
    const title = inlineNewTopic.trim();
    if (!title || !selectedSubject) return;

    setAddingInline(true);
    setError(null);
    try {
      const created = await api.addTopic({
        subject_id: Number(selectedSubject),
        grade: Number(grade),
        quarter: Number(quarter),
        title: title,
        chapter: lang === 'ru' ? "Добавлено учителем" : "O'qituvchi tomonidan kiritilgan"
      });

      // Ro'yxatga qo'shish va avtomatik belgilash
      setTopics(prev => {
        const exists = prev.some(t => t.id === created.id);
        return exists ? prev : [created, ...prev];
      });
      setSelectedTopicIds(prev => prev.includes(created.id) ? prev : [...prev, created.id]);
      setInlineNewTopic('');
    } catch (err) {
      setError(err.message || "Mavzuni qo'shishda xatolik");
    } finally {
      setAddingInline(false);
    }
  };

  // Ovoz orqali yangi mavzu kiritish va ro'yxatga qo'shish
  const handleVoiceAddTopic = async (text) => {
    if (!text || !selectedSubject) return;
    setVoiceNotice(`🎙️ ${text}`);
    setInlineNewTopic(text);
    try {
      setAddingInline(true);
      const created = await api.addTopic({
        subject_id: Number(selectedSubject),
        grade: Number(grade),
        quarter: Number(quarter),
        title: text,
        chapter: lang === 'ru' ? "Голосовой ввод" : "Ovozli kiritilgan"
      });
      setTopics(prev => {
        const exists = prev.some(t => t.id === created.id);
        return exists ? prev : [created, ...prev];
      });
      setSelectedTopicIds(prev => prev.includes(created.id) ? prev : [...prev, created.id]);
      setInlineNewTopic('');
    } catch (err) {
      console.warn("Mavzu avtomatik saqlanmadi:", err);
    } finally {
      setAddingInline(false);
    }
  };

  // Ovoz orqali savollar sonini belgilash
  const handleVoiceQuestionCount = (text) => {
    setVoiceNotice(`🎙️ ${text}`);
    const num = parseNumberFromVoice(text);
    if (num && num >= 1 && num <= 20) {
      setQuestionCount(num);
    }
  };

  // Ovoz orqali variantlar sonini belgilash
  const handleVoiceVariantsCount = (text) => {
    setVoiceNotice(`🎙️ ${text}`);
    const num = parseNumberFromVoice(text);
    if (num && [1, 2, 4].includes(num)) {
      setVariantsCount(num);
    } else if (num === 3) {
      setVariantsCount(4);
    }
  };

  // Ovoz orqali jami ballni belgilash
  const handleVoiceTotalScore = (text) => {
    setVoiceNotice(`🎙️ ${text}`);
    const num = parseNumberFromVoice(text);
    if (num && num >= 10 && num <= 100) {
      setTotalScore(num);
    }
  };

  // Ovoz orqali savol tuzish talabini kiritish
  const handleVoiceCustomInstructions = (text) => {
    setVoiceNotice(`🎙️ ${text}`);
    setCustomInstructions(prev => prev ? `${prev}. ${text}` : text);
  };

  // Aqlli ovozli buyruq ("7-sinf, 4 ta savol, 2 ta variant, mavzu kasrlar")
  const handleSmartVoiceCommand = async (text) => {
    if (!text) return;
    setVoiceNotice(`🎙️ Buyruq: "${text}"`);
    const parsed = parseSmartVoiceCommand(text);

    if (parsed.grade) setGrade(parsed.grade);
    if (parsed.questionCount) setQuestionCount(parsed.questionCount);
    if (parsed.variantsCount) setVariantsCount(parsed.variantsCount);

    if (parsed.topic && selectedSubject) {
      setInlineNewTopic(parsed.topic);
      try {
        const created = await api.addTopic({
          subject_id: Number(selectedSubject),
          grade: Number(parsed.grade || grade),
          quarter: Number(quarter),
          title: parsed.topic,
          chapter: lang === 'ru' ? "Голосовой ввод" : "Ovozli kiritilgan"
        });
        setTopics(prev => {
          const exists = prev.some(t => t.id === created.id);
          return exists ? prev : [created, ...prev];
        });
        setSelectedTopicIds(prev => prev.includes(created.id) ? prev : [...prev, created.id]);
        setInlineNewTopic('');
      } catch (e) {
        console.warn("Topic creation error:", e);
      }
    }
  };

  // KTP dan ko'p qatorli matnni ro'yxatga birdaniga qo'shish
  const handleApplyMultiPaste = async () => {
    const lines = manualText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0 || !selectedSubject) return;

    setAddingInline(true);
    setError(null);
    try {
      const addedIds = [];
      const newTopicsList = [...topics];

      for (const title of lines) {
        const created = await api.addTopic({
          subject_id: Number(selectedSubject),
          grade: Number(grade),
          quarter: Number(quarter),
          title: title,
          chapter: lang === 'ru' ? "Вставлено из КТП" : "KTP dan nusxalangan"
        });
        if (!newTopicsList.some(t => t.id === created.id)) {
          newTopicsList.unshift(created);
        }
        addedIds.push(created.id);
      }

      setTopics(newTopicsList);
      setSelectedTopicIds(prev => Array.from(new Set([...prev, ...addedIds])));
      setManualText('');
      setShowMultiPaste(false);
    } catch (err) {
      setError(err.message || "Mavzularni saqlashda xatolik");
    } finally {
      setAddingInline(false);
    }
  };

  // Barcha mavzularni bir vaqtda tanlash / bekor qilish
  const handleSelectAllTopics = () => {
    if (selectedTopicIds.length === topics.length) {
      setSelectedTopicIds([]);
    } else {
      setSelectedTopicIds(topics.map(t => t.id));
    }
  };

  // Mavzuni ro'yxatdan o'chirishni tasdiqlash
  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    setDeletingTopicLoading(true);
    try {
      await api.deleteTopic(topicToDelete.id);
      setTopics(prev => prev.filter(t => t.id !== topicToDelete.id));
      setSelectedTopicIds(prev => prev.filter(id => id !== topicToDelete.id));
      setTopicToDelete(null);
    } catch (err) {
      setError(err.message || "Mavzuni o'chirishda xatolik yuz berdi");
    } finally {
      setDeletingTopicLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (selectedTopicIds.length === 0) {
      setError(t('selectAtLeastOneTopic'));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const subjectObj = subjects.find(s => s.id === Number(selectedSubject));
    const title = lang === 'ru'
      ? `${grade}-й класс ${subjectObj?.name || 'Предмет'} ${quarter}-я четверть 1-СОР (БСБ)`
      : `${grade}-sinf ${subjectObj?.name || 'Fan'} ${quarter}-chorak 1-BSB`;

    try {
      const data = await api.generateBSB({
        title,
        assessment_type: 'BSB',
        subject_id: Number(selectedSubject),
        grade: Number(grade),
        quarter: Number(quarter),
        topic_ids: selectedTopicIds,
        total_max_score: Number(totalScore),
        variants_count: Number(variantsCount),
        question_count: Number(questionCount),
        custom_instructions: customInstructions.trim() || undefined,
        textbook_pages: textbookPages.trim() || undefined,
        lang: lang
      });
      setResult(data);
      if (onAssessmentCreated) onAssessmentCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!result) return;
    setApproving(true);
    try {
      const updated = await api.approveAssessment(result.id);
      setResult(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('bsbTitle')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('bsbSubtitle')}</p>
          </div>
        </div>

        {/* Ovozli kiritish haqida bildirishnoma (Toast) */}
        {voiceNotice && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 shrink-0 animate-pulse text-violet-200" />
              <span>{voiceNotice}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setVoiceNotice('')} 
              className="text-violet-200 hover:text-white ml-2 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Aqlli Ovozli Boshqaruv (Smart Voice Bar) */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50 border border-violet-200 p-3.5 sm:p-4">
          <div className="flex items-center gap-3 min-w-0">
            <VoiceMicButton
              onTranscript={handleSmartVoiceCommand}
              lang={lang}
              size="lg"
              className="shrink-0"
              buttonTitle={t('voiceSmartCommandPlaceholder')}
            />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-violet-950 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
                <span>{lang === 'ru' ? 'Быстрая голосовая настройка' : 'Tezkor Ovozli Buyruq'}</span>
              </p>
              <p className="text-xs text-slate-600 truncate">
                {t('voiceSmartCommandPlaceholder')}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="text-sm font-bold text-slate-700">{t('selectSubject')}</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
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
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
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
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
              >
                {[1, 2, 3, 4].map(q => (
                  <option key={q} value={q}>{q}{t('quarterSuffix')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Yagona va qulay mavzular bo'limi */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-800">
                  {t('officialTopics')}
                </label>
                {topics.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllTopics}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  >
                    {selectedTopicIds.length === topics.length 
                      ? (lang === 'ru' ? 'Снять все' : 'Barchasini bekor qilish') 
                      : (lang === 'ru' ? 'Выбрать все' : 'Barchasini tanlash')}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* O'z KTP faylini yuklash */}
                <button
                  type="button"
                  onClick={() => setIsKtpUploadOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-amber-600" />
                  <span>{lang === 'ru' ? 'Загрузить файл КТП' : 'KTP faylini yuklash'}</span>
                </button>

                {/* KTP dan ko'p qatorli matn nusxalash tugmasi */}
                <button
                  type="button"
                  onClick={() => setShowMultiPaste(!showMultiPaste)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  <PenLine className="h-3.5 w-3.5 text-slate-600" />
                  <span>{showMultiPaste ? t('hidePasteMultiTopicsBtn') : t('pasteMultiTopicsBtn')}</span>
                </button>

                {/* Kitobni skanerlash */}
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-indigo-600" />
                  <span>{t('scanTopicsBtn')}</span>
                </button>
              </div>
            </div>

            {/* Agar o'qituvchi yuklagan KTP mavzulari bo'lsa, qulflangan rejim ko'rsatiladi */}
            {topics.some(t => t.chapter?.includes("O'qituvchi KTP:") || t.chapter?.includes("КТП учителя:")) && (
              <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-900 animate-fade-in">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{lang === 'ru' ? 'Загруженный КТП активен: AI зафиксирован строго на этих темах' : 'Tasdiqlangan KTP rejasi faol: Tizim faqat shu mavzularga qulflangan'}</span>
              </div>
            )}

            {/* Ovozli va yozma tezkor mavzu qo'shish qatori */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inlineNewTopic}
                  onChange={(e) => setInlineNewTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddTopic();
                    }
                  }}
                  placeholder={lang === 'ru' ? "Введите тему или нажмите микрофон..." : "Yangi mavzuni yozing yoki mikrofonga ayting..."}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-11 py-2.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <VoiceMicButton
                    onTranscript={handleVoiceAddTopic}
                    lang={lang}
                    size="sm"
                    buttonTitle={t('voiceInputTooltip')}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickAddTopic}
                disabled={addingInline || !inlineNewTopic.trim()}
                className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>{t('addBtn')}</span>
              </button>
            </div>

            {/* Ko'p qatorli matn ko'chirib qo'yish (KTP) oynasi */}
            {showMultiPaste && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3 animate-fade-in">
                <p className="text-xs font-bold text-slate-700">
                  {lang === 'ru' ? "Вставьте список тем (по одной теме на строку):" : "Mavzularni har bir qatorga bittadan nusxalab qo'ying (KTP):"}
                </p>
                <textarea
                  rows={4}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={lang === 'ru' ? "Сложение и вычитание дробей\nУмножение обыкновенных дробей\nДеление дробей" : "Oddiy kasrlarni qo'shish va ayirish\nKasrlarni umumiy maxrajga keltirish\nKasrlarni ko'paytirish va bo'lish"}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm font-sans focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 bg-white"
                />
                <button
                  type="button"
                  onClick={handleApplyMultiPaste}
                  disabled={addingInline || !manualText.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('applyPastedTopicsBtn')}</span>
                </button>
              </div>
            )}

            {/* Mavzular ro'yxati (Barcha mavzular bitta toza joyda) */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1 bg-slate-50/70">
              {topics.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-400">
                  {t('noTopicsFound')}
                </p>
              ) : (
                topics.map(tItem => (
                  <div
                    key={tItem.id}
                    onClick={() => toggleTopic(tItem.id)}
                    className={`group flex items-center justify-between rounded-xl p-2.5 transition cursor-pointer border ${
                      selectedTopicIds.includes(tItem.id)
                        ? 'bg-blue-50/90 border-blue-200 text-blue-950 font-bold shadow-2xs'
                        : 'hover:bg-white border-transparent hover:border-slate-200 text-slate-700 font-medium'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTopicIds.includes(tItem.id)}
                        onChange={() => toggleTopic(tItem.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      />
                      <span className="text-sm truncate select-none">{tItem.title}</span>
                      {(tItem.chapter?.includes("O'qituvchi KTP:") || tItem.chapter?.includes("КТП учителя:")) && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.5 rounded ml-1.5 shrink-0 inline-flex items-center gap-0.5">
                          <Lock className="h-2.5 w-2.5" />
                          <span>KTP</span>
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopicToDelete(tItem);
                      }}
                      title={t('deleteTopicConfirm')}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                {lang === 'ru' ? 'Выбрано тем для заданий:' : 'Tanlangan mavzular:'} <strong className="text-blue-600">{selectedTopicIds.length}</strong> {lang === 'ru' ? 'из' : 'ta /'} {topics.length}
              </span>
              <span className="text-[11px] text-slate-400">
                {lang === 'ru' ? 'Нажмите на тему для выбора' : 'Mavzuni tanlash uchun ustiga bosing'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Jami ball - Ovozli boshqaruv bilan */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">{t('totalScore')}</label>
                <VoiceMicButton
                  onTranscript={handleVoiceTotalScore}
                  lang={lang}
                  size="sm"
                  buttonTitle="Jami ballni ayting (masalan: 25 ball)"
                />
              </div>
              <input
                type="number"
                value={totalScore}
                onChange={(e) => setTotalScore(e.target.value)}
                min="10"
                max="100"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
              />
            </div>

            {/* Savollar sonini boshqarish - Ovozli boshqaruv bilan */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">{t('questionCountLabel')}</label>
                <div className="flex items-center gap-1.5">
                  <VoiceMicButton
                    onTranscript={handleVoiceQuestionCount}
                    lang={lang}
                    size="sm"
                    buttonTitle="Savollar sonini ayting (masalan: 4 ta)"
                  />
                  <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {questionCount} {t('questionsSuffix')}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-16 rounded-xl border border-slate-300 px-2 py-2.5 text-base font-bold text-center text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                {/* Tezkor tanlov tugmalari */}
                <div className="flex-1 flex gap-1 overflow-x-auto">
                  {[3, 4, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl border transition cursor-pointer text-center whitespace-nowrap ${
                        questionCount === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {num}{num === 5 ? `*` : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Variantlar soni - Ovozli boshqaruv bilan */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">{t('variantsCount')}</label>
                <VoiceMicButton
                  onTranscript={handleVoiceVariantsCount}
                  lang={lang}
                  size="sm"
                  buttonTitle="Variantlar sonini ayting (1, 2 yoki 4)"
                />
              </div>
              <select
                value={variantsCount}
                onChange={(e) => setVariantsCount(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
              >
                <option value={1}>1 {t('variantSuffix')}</option>
                <option value={2}>2 {t('variantSuffix')} ({lang === 'ru' ? 'Стандарт' : 'Standart'})</option>
                <option value={4}>4 {t('variantSuffix')}</option>
              </select>
            </div>
          </div>

          {/* Darslik sahifalari va Qo'shimcha talablar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-700">
                  {t('textbookPagesLabel')}
                </label>
                <VoiceMicButton
                  onTranscript={(text) => setTextbookPages(text)}
                  lang={lang}
                  size="sm"
                  buttonTitle={lang === 'ru' ? "Надиктуйте страницы учебника" : "Darslik betlarini ayting"}
                />
              </div>
              <input
                type="text"
                value={textbookPages}
                onChange={(e) => setTextbookPages(e.target.value)}
                placeholder={t('textbookPagesPlaceholder')}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-700">
                  {t('customNotes')}
                </label>
                <VoiceMicButton
                  onTranscript={handleVoiceCustomInstructions}
                  lang={lang}
                  size="sm"
                  buttonTitle={lang === 'ru' ? "Надиктуйте требования к заданиям..." : "Talablarni ovoz orqali ayting..."}
                />
              </div>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder={t('customPlaceholder')}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{t('generatingBsb')}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>{t('generateBsbBtn')}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Skaner Modali */}
      <TopicScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        subjectId={selectedSubject}
        grade={grade}
        quarter={quarter}
        onTopicsAdded={() => {
          loadTopics(selectedSubject, grade, quarter);
        }}
      />

      {/* KTP Faylini Yuklash Modali */}
      <KTPUploadModal
        isOpen={isKtpUploadOpen}
        onClose={() => setIsKtpUploadOpen(false)}
        subjects={subjects}
        defaultSubjectId={selectedSubject}
        defaultGrade={grade}
        onKTPUploaded={handleKTPUploadedInBSB}
      />

      {/* Mavzuni o'chirishni tasdiqlovchi zamonaviy modal oyna */}
      <ConfirmModal
        isOpen={!!topicToDelete}
        onClose={() => !deletingTopicLoading && setTopicToDelete(null)}
        onConfirm={confirmDeleteTopic}
        title={t('deleteTopicModalTitle')}
        description={t('deleteTopicModalDesc')}
        itemName={topicToDelete?.title}
        confirmText={t('confirmDeleteBtn')}
        cancelText={t('cancelBtn')}
        isDanger={true}
        loading={deletingTopicLoading}
      />

      {/* Savol almashtirish Modali */}
      <QuestionSwapModal
        isOpen={!!swapTarget}
        onClose={() => !swappingLoading && setSwapTarget(null)}
        target={swapTarget}
        onConfirmSwap={handleConfirmSwap}
        loading={swappingLoading}
      />

      {/* Natija qismi */}
      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900">{result.title}</h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  result.status === 'APPROVED' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {result.status === 'APPROVED' ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('approvedStatus')}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('draftStatus')}
                    </>
                  )}
                </span>
                {result.content?.textbook_pages && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{t('textbookBadge')}: {result.content.textbook_pages}</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {result.grade}{t('gradeSuffix')} • {result.quarter}{t('quarterSuffix')} • {result.total_max_score} {t('scoreLabel')} • {result.variants_count} {t('variantSuffix')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {result.status === 'DRAFT' && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{approving ? t('approvingBtn') : t('approveBtn')}</span>
                </button>
              )}

              <a
                href={api.exportBSBWordUrl(result.id)}
                download
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition"
              >
                <Download className="h-4 w-4" />
                <span>{t('downloadWord')}</span>
              </a>
            </div>
          </div>

          {/* Dasturiy Validator Natijasi */}
          {result.validation_report?.is_valid && (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{t('validatorSuccess')}</span>
            </div>
          )}

          {/* Shrift o'lchami boshqaruvi */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5">
            <div className="flex items-center gap-2.5 text-slate-700 text-sm font-bold">
              <Type className="h-4 w-4 text-blue-600" />
              <span>{t('fontSizeLabel')}</span>
            </div>
            <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setFontSizeScale('standard')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                  fontSizeScale === 'standard'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('fontStandard')}
              </button>
              <button
                type="button"
                onClick={() => setFontSizeScale('large')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                  fontSizeScale === 'large'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('fontLarge')}
              </button>
              <button
                type="button"
                onClick={() => setFontSizeScale('huge')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                  fontSizeScale === 'huge'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('fontHuge')}
              </button>
            </div>
          </div>

          {/* Variantlar */}
          <div className="space-y-8">
            {result.content?.variants?.map((v, vIdx) => (
              <div key={vIdx} className="rounded-2xl border-2 border-slate-200/90 p-5 sm:p-7 bg-white shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-4">
                  <h4 className="text-xl sm:text-2xl font-black text-blue-950 flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-6 bg-blue-600 rounded-full" />
                    {v.title}
                  </h4>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm sm:text-base font-bold text-blue-800">
                    {t('totalCol')}: {v.total_score} {t('scoreLabel')}
                  </span>
                </div>

                <div className="space-y-6">
                  {v.questions?.map((q, qIdx) => (
                    <div key={qIdx} className="rounded-2xl bg-slate-50/60 hover:bg-slate-50/90 p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4 transition">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                        <span className={`font-black text-slate-900 flex items-center gap-2.5 ${currentFonts.header}`}>
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-black shadow-xs shrink-0">
                            {q.number}
                          </span>
                          <span>
                            {q.number}-{t('questionLabel')} ({q.max_score} {t('scoreLabel')}):
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSwapTarget({ variantNumber: v.variant_number, question: q })}
                            title={t('swapQuestionBtn')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 text-xs font-bold transition cursor-pointer hover:scale-105 shadow-2xs"
                          >
                            <RefreshCw className="h-3 w-3 text-blue-600" />
                            <span>{t('swapQuestionBtn')}</span>
                          </button>

                          <span className={`rounded-lg uppercase tracking-wide border ${currentFonts.badge} ${
                            q.difficulty?.toLowerCase() === 'easy' || q.difficulty?.toLowerCase() === 'oson' || q.difficulty?.toLowerCase() === 'легкий'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : q.difficulty?.toLowerCase() === 'hard' || q.difficulty?.toLowerCase() === 'qiyin' || q.difficulty?.toLowerCase() === 'сложный'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {q.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Savol matni - Katta, ravon va KaTeX formulalari bilan */}
                      <div className={`${currentFonts.question} whitespace-pre-wrap py-1.5`}>
                        <MathText text={q.text} />
                      </div>

                      {/* Deskriptorlar jadvali - Katta va qulay */}
                      {q.descriptors?.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-200">
                          <p className={`uppercase tracking-wider mb-2.5 flex items-center gap-2 ${currentFonts.descTitle}`}>
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            {t('descriptorsTitle')}
                          </p>
                          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-100/90 border-b border-slate-200">
                                <tr>
                                  <th className={`w-14 text-center font-black ${currentFonts.tableTh}`}>{t('colStep')}</th>
                                  <th className={`font-black ${currentFonts.tableTh}`}>{t('colDesc')}</th>
                                  <th className={`w-28 text-right font-black ${currentFonts.tableTh}`}>{t('colScore')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {q.descriptors.map((d, dIdx) => (
                                  <tr key={dIdx} className="hover:bg-blue-50/20 transition">
                                    <td className={`text-center ${currentFonts.tableTdStep}`}>{d.step_number}</td>
                                    <td className={currentFonts.tableTdDesc}>
                                      <MathText text={d.description} />
                                    </td>
                                    <td className={`text-right ${currentFonts.tableTdScore}`}>
                                      {d.points} <span className="text-xs font-semibold text-slate-500">{t('scoreLabel')}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Javob */}
                      {q.correct_answer && (
                        <div className={`mt-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/90 text-slate-900 shadow-2xs ${currentFonts.answerBox}`}>
                          <span className="font-black text-blue-900 mr-2">✅ {t('correctAnswerTitle')}</span>
                          <span className="text-slate-900 font-semibold">
                            <MathText text={q.correct_answer} />
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
