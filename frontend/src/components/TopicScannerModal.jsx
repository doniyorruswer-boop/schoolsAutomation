import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, FileText, CheckCircle2, AlertCircle, X, Sparkles, ScanLine, RefreshCw, SwitchCamera, Video, VideoOff } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../i18n';

export default function TopicScannerModal({ isOpen, onClose, subjectId, grade, quarter, onTopicsAdded }) {
  const { lang, t } = useLanguage();

  const [activeTab, setActiveTab] = useState('camera'); // 'camera' or 'file'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [scannedTopics, setScannedTopics] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);

  // Kamera boshqaruvi
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mobileInputRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (orqa) yoki 'user' (old)
  const [cameraLoading, setCameraLoading] = useState(false);

  // Modal ochilganda yoki yopilganda kamerani boshqarish
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !previewUrl && scannedTopics.length === 0) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, previewUrl, scannedTopics.length, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(t('cameraErrorMsg'));
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn("Camera access failed:", err);
      setCameraActive(false);
      setError(t('cameraErrorMsg'));
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Jonli kameradan suratga olish (Snapshot capture)
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Video haqiqiy o'lchamlari
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(blob => {
      if (blob) {
        const capturedFile = new File([blob], `scan_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(capturedFile);
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
        // Rasm olingach avtomatik skanerlash
        triggerScanWithFile(capturedFile);
      }
    }, 'image/jpeg', 0.95);
  };

  const retakePhoto = () => {
    setFile(null);
    setPreviewUrl(null);
    setScannedTopics([]);
    setError(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setScannedTopics([]);
      if (selected.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selected));
      } else {
        setPreviewUrl(null);
      }
      stopCamera();
    }
  };

  const triggerScanWithFile = async (fileToScan) => {
    const targetFile = fileToScan || file;
    if (!targetFile) {
      setError(t('uploadPromptTitle'));
      return;
    }

    setScanning(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', targetFile);
    if (subjectId) formData.append('subject_id', subjectId);
    formData.append('grade', grade);

    try {
      const data = await api.scanTopics(formData);
      if (!data || data.length === 0) {
        throw new Error(lang === 'ru' 
          ? "Не удалось распознать темы из документа. Попробуйте сделать более четкий снимок."
          : "Hujjatdan mavzularni ajratib bo'lmadi. Rasm aniqroq bo'lishini tekshiring.");
      }
      setScannedTopics(data);
      setSelectedIndices(data.map((_, idx) => idx)); // Standart hammasi tanlanadi
    } catch (err) {
      setError(err.message || (lang === 'ru' ? "Ошибка сканирования" : "Skanerlashda xatolik yuz berdi"));
    } finally {
      setScanning(false);
    }
  };

  const toggleSelect = (idx) => {
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleSaveAndApply = async () => {
    const topicsToSave = scannedTopics.filter((_, idx) => selectedIndices.includes(idx));
    if (topicsToSave.length === 0) {
      setError(t('selectAtLeastOneScanned'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = await api.saveScannedTopics({
        subject_id: Number(subjectId),
        grade: Number(grade),
        quarter: Number(quarter),
        topics: topicsToSave
      });
      onTopicsAdded(saved);
      onClose();
    } catch (err) {
      setError(err.message || (lang === 'ru' ? "Ошибка сохранения" : "Saqlashda xatolik yuz berdi"));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white p-5 sm:p-7 shadow-2xl transition-all border border-slate-100 overflow-hidden">
        
        {/* Yuqori qism: Sarlavha va Yopish */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shrink-0">
              <ScanLine className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                {t('scannerTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {t('scannerSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Xatolik xabari */}
        {error && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 border border-red-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Tab tugmalari (Kamera vs Fayl) faqat natija chiqmagan paytda */}
        {scannedTopics.length === 0 && !previewUrl && (
          <div className="mt-3 flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => { setActiveTab('camera'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition ${
                activeTab === 'camera'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="h-4.5 w-4.5" />
              <span>{t('tabCamera')}</span>
            </button>
            <button
              onClick={() => { setActiveTab('file'); stopCamera(); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition ${
                activeTab === 'file'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="h-4.5 w-4.5" />
              <span>{t('tabFile')}</span>
            </button>
          </div>
        )}

        {/* Markaziy qism */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* 1-HOLAT: Jonli Kamera ko'rinishi */}
          {activeTab === 'camera' && !previewUrl && scannedTopics.length === 0 && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex flex-col items-center justify-center border-2 border-indigo-400/40 shadow-inner">
              {/* Yashirin video va canvas elementlari */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Kamera faol bo'lmaganda yoki yuklanayotganda */}
              {!cameraActive && (
                <div className="text-center p-6 space-y-3">
                  {cameraLoading ? (
                    <div className="space-y-2 text-indigo-300">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-indigo-400 border-t-transparent" />
                      <p className="text-xs font-semibold">{t('startCameraBtn')}...</p>
                    </div>
                  ) : (
                    <>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-indigo-400">
                        <VideoOff className="h-7 w-7" />
                      </div>
                      <p className="text-xs text-slate-300 max-w-sm">
                        {t('cameraAimHint')}
                      </p>
                      <button
                        onClick={startCamera}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow"
                      >
                        {t('startCameraBtn')}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Kamera faol bo'lganda: Skaner nishoni va animatsiyasi */}
              {cameraActive && (
                <>
                  {/* To'rttala burchak ramkasi */}
                  <div className="absolute inset-8 pointer-events-none border-2 border-dashed border-indigo-400/70 rounded-2xl">
                    {/* Skaner lazer nuri */}
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-pulse top-1/2" />
                  </div>

                  {/* Ko'rsatma */}
                  <div className="absolute top-3 inset-x-0 mx-auto w-fit rounded-full bg-black/60 backdrop-blur-md px-3.5 py-1 text-[11px] font-semibold text-white pointer-events-none">
                    {t('cameraAimHint')}
                  </div>

                  {/* Pastki boshqaruv tugmalari */}
                  <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
                    <button
                      onClick={toggleFacingMode}
                      title={t('switchCameraBtn')}
                      className="rounded-full bg-black/50 backdrop-blur-md p-3 text-white hover:bg-black/75 transition"
                    >
                      <SwitchCamera className="h-5 w-5" />
                    </button>

                    {/* Asosiy suratga olish tugmasi */}
                    <button
                      onClick={captureFrame}
                      className="flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-indigo-600/50 hover:scale-105 active:scale-95 transition"
                    >
                      <Camera className="h-5 w-5" />
                      <span>{t('snapAndScanBtn')}</span>
                    </button>

                    <button
                      onClick={stopCamera}
                      title={t('stopCameraBtn')}
                      className="rounded-full bg-black/50 backdrop-blur-md p-3 text-white hover:bg-black/75 transition"
                    >
                      <VideoOff className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobil brauzerlarda telefon kamerasini to'g'ridan-to'g'ri ochish opsiyasi */}
          {activeTab === 'camera' && !previewUrl && scannedTopics.length === 0 && (
            <div className="text-center pt-1">
              <input
                ref={mobileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => mobileInputRef.current?.click()}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300"
              >
                📱 {t('mobileCameraBtn')}
              </button>
            </div>
          )}

          {/* 2-HOLAT: Fayl yuklash ko'rinishi */}
          {activeTab === 'file' && !previewUrl && scannedTopics.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 sm:p-8 text-center hover:border-indigo-400 transition">
              <div className="space-y-3">
                <div className="flex justify-center gap-3 text-indigo-500">
                  <Camera className="h-8 w-8" />
                  <Upload className="h-8 w-8" />
                </div>
                <p className="text-base font-bold text-slate-800">
                  {t('uploadPromptTitle')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('uploadFormatsHint')}
                </p>
                
                <label className="mt-3 inline-flex items-center gap-2 cursor-pointer rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition">
                  <Upload className="h-4.5 w-4.5" />
                  <span>Fayl tanlash / Выбрать файл</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 3-HOLAT: Olingan surat yoki tanlangan fayl ko'rinishi */}
          {previewUrl && scannedTopics.length === 0 && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 p-2 text-center">
                <img
                  src={previewUrl}
                  alt="Scanned preview"
                  className="mx-auto max-h-60 rounded-xl object-contain shadow-xs"
                />
                <button
                  onClick={retakePhoto}
                  className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white hover:bg-black/90 transition shadow"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t('retakeBtn')}</span>
                </button>
              </div>

              {/* Skanerlash tugmasi */}
              <button
                onClick={() => triggerScanWithFile(file)}
                disabled={scanning}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 py-3.5 text-base font-black text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {scanning ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{t('scanningInProgress')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>{t('scanFileBtn')}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 4-HOLAT: Skanerlangan mavzular ro'yxati */}
          {scannedTopics.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900">
                  {t('detectedTopicsTitle')} ({scannedTopics.length} ta):
                </span>
                <button
                  onClick={retakePhoto}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t('uploadAnotherBtn')}</span>
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 p-3 space-y-2 bg-slate-50">
                {scannedTopics.map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 rounded-xl p-3 bg-white border border-slate-200/80 hover:border-indigo-300 cursor-pointer transition shadow-2xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndices.includes(idx)}
                      onChange={() => toggleSelect(idx)}
                      className="mt-1 h-4.5 w-4.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      {item.chapter && (
                        <p className="text-xs text-indigo-600 font-semibold">{item.chapter}</p>
                      )}
                      {item.learning_objectives && (
                        <p className="text-[11px] text-slate-500">{item.learning_objectives}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={handleSaveAndApply}
                disabled={saving || selectedIndices.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-base font-black text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {saving ? (
                  <span>{t('savingBtn')}</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{t('saveAndApplyBtn', { count: selectedIndices.length })}</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
