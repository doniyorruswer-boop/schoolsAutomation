import React, { useState } from 'react';
import { X, RefreshCw, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';
import VoiceMicButton from './VoiceMicButton';
import MathText from './MathText';
import { useLanguage } from '../i18n';

export default function QuestionSwapModal({
  isOpen,
  onClose,
  target, // { variantNumber, question }
  onConfirmSwap,
  loading = false
}) {
  const { lang, t } = useLanguage();
  const [customHint, setCustomHint] = useState('');
  const [difficulty, setDifficulty] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setCustomHint('');
      setDifficulty(target?.question?.difficulty || '');
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const { variantNumber, question } = target;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmSwap({
      variantNumber,
      questionNumber: question.number,
      preferredDifficulty: difficulty || question.difficulty,
      customHint: customHint.trim() || undefined
    });
  };

  const handleVoiceHint = (text) => {
    setCustomHint(prev => prev ? `${prev}. ${text}` : text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {t('swapQuestionModalTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {variantNumber}-{lang === 'ru' ? 'й вариант' : 'variant'} • {question.number}-{lang === 'ru' ? 'е задание' : 'savol'} ({question.max_score} {t('scoreLabel')})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Joriy savol qisqacha ko'rinishi */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {lang === 'ru' ? 'Текущее задание (будет заменено):' : 'Hozirgi savol (almashtiriladi):'}
            </span>
            <p className="text-sm font-semibold text-slate-800 line-clamp-3">
              <MathText text={question.text} />
            </p>
          </div>

          {/* O'qituvchi istagi / ko'rsatmasi */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('customHintLabel')}
              </label>
              <VoiceMicButton
                onTranscript={handleVoiceHint}
                lang={lang}
                size="sm"
                buttonTitle="Istagingizni mikrofonga ayting"
              />
            </div>
            <textarea
              rows={2}
              value={customHint}
              onChange={(e) => setCustomHint(e.target.value)}
              placeholder={t('customHintPlaceholder')}
              className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Qiyinlik darajasi tanlovi */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {lang === 'ru' ? 'Сложность нового задания:' : 'Yangi savol qiyinlik darajasi:'}
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {[
                { id: 'EASY', label: lang === 'ru' ? 'Легкое' : 'Osonroq' },
                { id: 'MEDIUM', label: lang === 'ru' ? 'Среднее' : "O'rtacha" },
                { id: 'HARD', label: lang === 'ru' ? 'Сложное' : 'Murakkabroq' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                    difficulty === d.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Eslatma: Ball o'zgarmaydi */}
          <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-3.5 text-xs text-blue-900 flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              {lang === 'ru' 
                ? `Балл нового задания останется строго ${question.max_score} баллов, общий итог варианта не изменится.` 
                : `Yangi savolning maksimal bali qat'iy ravishda ${question.max_score} ball saqlanadi, variant umumiy bali o'zgarmaydi.`}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t('swappingQuestion')}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>{t('confirmSwapBtn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
