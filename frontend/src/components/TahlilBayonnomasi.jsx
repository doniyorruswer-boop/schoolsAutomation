import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Upload, Download, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';

export default function TahlilBayonnomasi() {
  const { lang, t } = useLanguage();

  const [file, setFile] = useState(null);
  const [subjectName, setSubjectName] = useState(lang === 'ru' ? 'Алгебра' : 'Algebra');
  const [className, setClassName] = useState('7-A');
  const [assessmentTitle, setAssessmentTitle] = useState(lang === 'ru' ? '1-СОР (БСБ)' : '1-BSB');
  const [maxScore, setMaxScore] = useState(100);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tahlilResult, setTahlilResult] = useState(null);

  useEffect(() => {
    if (lang === 'ru') {
      if (subjectName === 'Algebra') setSubjectName('Алгебра');
      if (assessmentTitle === '1-BSB') setAssessmentTitle('1-СОР (БСБ)');
    } else {
      if (subjectName === 'Алгебра') setSubjectName('Algebra');
      if (assessmentTitle === '1-СОР (БСБ)') setAssessmentTitle('1-BSB');
    }
  }, [lang]);

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!file) {
      setError(t('uploadExcelPrompt'));
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_name', subjectName);
    formData.append('class_name', className);
    formData.append('assessment_title', assessmentTitle);
    formData.append('max_score', maxScore);

    try {
      const data = await api.processExcel(formData);
      setTahlilResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportWord = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_name', subjectName);
    formData.append('class_name', className);
    formData.append('assessment_title', assessmentTitle);
    formData.append('max_score', maxScore);

    try {
      const response = await fetch('/api/v1/tahlil/export-word', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });
      if (!response.ok) throw new Error("Yuklab olishda xatolik yuz berdi");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tahlil_Bayonnomasi_${className}_${subjectName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{t('tahlilTitle')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('tahlilSubtitle')}</p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleProcess} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="text-sm font-bold text-slate-700">{t('selectSubject')}</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 font-medium"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">{t('grade')}</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="7-A"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 font-medium"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                {lang === 'ru' ? 'Название оценивания' : 'Baholash turi'}
              </label>
              <input
                type="text"
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                placeholder="1-BSB yoki 1-CHSB"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 font-medium"
                required
              />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center hover:border-emerald-400 transition">
            <div className="space-y-3">
              <Upload className="mx-auto h-10 w-10 text-emerald-500" />
              <p className="text-base font-bold text-slate-700">
                {file ? file.name : t('uploadExcelPrompt')}
              </p>
              <p className="text-xs text-slate-400">
                {t('uploadExcelFormats')}
              </p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-5 file:py-2.5 file:text-sm file:font-bold file:text-white file:cursor-pointer hover:file:bg-emerald-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{t('processingExcel')}</span>
              </>
            ) : (
              <>
                <BarChart3 className="h-5 w-5" />
                <span>{lang === 'ru' ? 'Анализировать и Рассчитать Статистику' : 'Tahlil Qilish va Hisoblash'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {tahlilResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {tahlilResult.class_name} • {tahlilResult.subject_name} ({tahlilResult.assessment_title})
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {lang === 'ru' ? 'Автоматический расчет по шкале оценивания МОиШО РУз' : 'Vazirlik baholash shkalasi bo\'yicha avtomatik hisoblangan ko\'rsatkichlar'}
              </p>
            </div>

            <button
              onClick={handleExportWord}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition"
            >
              <Download className="h-4 w-4" />
              <span>{t('downloadTahlilWord')}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
              <p className="text-xs font-semibold text-slate-500">{t('totalStudents')}</p>
              <p className="mt-2 text-2xl font-black text-slate-800">
                {tahlilResult.statistics.total_students}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center">
              <p className="text-xs font-semibold text-slate-500">{t('participated')}</p>
              <p className="mt-2 text-2xl font-black text-slate-800">
                {tahlilResult.statistics.participated_students}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100 text-center">
              <p className="text-xs font-bold text-emerald-800">{t('masteryRate')}</p>
              <p className="mt-2 text-2xl font-black text-emerald-600">
                {tahlilResult.statistics.mastery_percentage}%
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 text-center">
              <p className="text-xs font-bold text-blue-800">{t('qualityRate')}</p>
              <p className="mt-2 text-2xl font-black text-blue-600">
                {tahlilResult.statistics.quality_percentage}%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
            <h4 className="text-sm font-bold text-slate-800 mb-3">{t('gradeDistTitle')}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-emerald-600">{t('grade5')}:</span>
                <span className="float-right font-bold text-slate-900">{tahlilResult.statistics.count_5} {t('studentsSuffix')}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-blue-600">{t('grade4')}:</span>
                <span className="float-right font-bold text-slate-900">{tahlilResult.statistics.count_4} {t('studentsSuffix')}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-amber-600">{t('grade3')}:</span>
                <span className="float-right font-bold text-slate-900">{tahlilResult.statistics.count_3} {t('studentsSuffix')}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-red-600">{t('grade2')}:</span>
                <span className="float-right font-bold text-slate-900">{tahlilResult.statistics.count_2} {t('studentsSuffix')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
