import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileText, CheckCircle2, ShieldCheck, 
  AlertCircle, Sparkles, Lock, ArrowRight 
} from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';

export default function KTPUploadModal({ 
  isOpen, 
  onClose, 
  subjects, 
  defaultSubjectId, 
  defaultGrade = 7, 
  onKTPUploaded 
}) {
  const { lang, t } = useLanguage();

  const [selectedSubject, setSelectedSubject] = useState(defaultSubjectId || '');
  const [grade, setGrade] = useState(defaultGrade || 7);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // Modal ochilganda qiymatlarni sinxronlashtirish
  React.useEffect(() => {
    if (defaultSubjectId) setSelectedSubject(defaultSubjectId);
    if (defaultGrade) setGrade(defaultGrade);
    setFile(null);
    setError(null);
  }, [isOpen, defaultSubjectId, defaultGrade]);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f) => {
    const ext = f.name.toLowerCase().split('.').pop();
    if (!['docx', 'xlsx', 'xls', 'pdf'].includes(ext)) {
      setError(
        lang === 'ru'
          ? "Пожалуйста, выберите файл Word (.docx), Excel (.xlsx) или PDF (.pdf)"
          : "Iltimos, Word (.docx), Excel (.xlsx) yoki PDF (.pdf) formatidagi fayl tanlang"
      );
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError(t('selectFileFirst'));
      return;
    }
    if (!selectedSubject) {
      setError(lang === 'ru' ? "Выберите предмет" : "Iltimos, fanni tanlang");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_id', selectedSubject);
    formData.append('grade', grade);
    formData.append('lang', lang);

    try {
      const data = await api.uploadKTPFile(formData);
      if (onKTPUploaded) {
        onKTPUploaded(data);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Faylni tahlil qilishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Tilga qarab fanlarni saralash
  const displayedSubjects = subjects.filter(s => {
    const isCyrillic = /[\u0400-\u04FF]/.test(s.name);
    return lang === 'ru' ? isCyrillic : !isCyrillic;
  });
  const currentSubjectList = displayedSubjects.length > 0 ? displayedSubjects : subjects;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-amber-50/60 to-white">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {t('uploadKtpModalTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Word (.docx), Excel (.xlsx), PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleUpload} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Fan va sinf tanlash */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('selectSubject')}
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                {currentSubjectList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('grade')}
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                {[5, 6, 7, 8, 9, 10, 11].map(g => (
                  <option key={g} value={g}>{g}{t('gradeSuffix')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fayl yuklash Drag & Drop maydoni */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {lang === 'ru' ? "Файл календарного плана:" : "KTP Reja fayli:"}
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1.5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
                isDragging 
                  ? 'border-amber-500 bg-amber-50/70' 
                  : file 
                    ? 'border-emerald-500 bg-emerald-50/40' 
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.xlsx,.xls,.pdf"
                onChange={handleFileInput}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-2">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-black text-slate-900 max-w-xs truncate">
                    {file.name}
                  </p>
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    {formatFileSize(file.size)} • {lang === 'ru' ? 'Готов к импорту' : 'Yuklashga tayyor'}
                  </p>
                  <span className="mt-3 text-[11px] font-semibold text-slate-400 underline">
                    {lang === 'ru' ? 'Нажмите, чтобы заменить файл' : 'Boshqa fayl tanlash uchun bosing'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-2">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {t('dropKtpFileHint')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('supportedKtpFormats')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Grounding Kafolati Eslatmasi */}
          <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  {lang === 'ru' ? '100% Фиксация на вашем плане (Grounding):' : '100% Qat\'iy qulflash (Grounding kafolati):'}
                </h4>
                <p className="text-xs font-medium text-amber-900/90 mt-1 leading-relaxed">
                  {t('ktpGroundingNotice')}
                </p>
              </div>
            </div>
          </div>

          {/* Modal tugmalari */}
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
              disabled={loading || !file}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-sm font-bold text-white shadow-md shadow-amber-600/25 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{lang === 'ru' ? 'Анализ и фиксация...' : 'Tahlil qilinmoqda va qulflanmoqda...'}</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>{lang === 'ru' ? 'Импортировать и зафиксировать' : 'Yuklash va tizimga qulflash'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
