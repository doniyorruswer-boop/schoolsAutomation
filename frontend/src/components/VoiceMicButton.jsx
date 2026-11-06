import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export function parseNumberFromVoice(text) {
  if (!text) return null;
  const t = String(text).toLowerCase().trim();

  // 1. Agar to'g'ridan-to'g'ri raqam bo'lsa
  const match = t.match(/\b\d+\b/);
  if (match) return parseInt(match[0], 10);

  // 2. O'zbekcha so'zlar
  if (t.includes('bitta') || t.includes('bir')) return 1;
  if (t.includes('ikkita') || t.includes('ikki')) return 2;
  if (t.includes('uchta') || t.includes('uch')) return 3;
  if (t.includes("to'rtta") || t.includes('torta') || t.includes('tort') || t.includes("to'rt")) return 4;
  if (t.includes('beshta') || t.includes('besh')) return 5;
  if (t.includes('oltita') || t.includes('olti')) return 6;
  if (t.includes('yettita') || t.includes('yetti')) return 7;
  if (t.includes('sakkizta') || t.includes('sakkiz')) return 8;
  if (t.includes("to'qqizta") || t.includes('toqqiz') || t.includes("to'qqiz")) return 9;
  if (t.includes("o'nta") || t.includes('onta') || t.includes("o'n") || t.includes('on')) return 10;
  if (t.includes('yigirma besh')) return 25;
  if (t.includes('yigirma')) return 20;
  if (t.includes("o'ttiz")) return 30;
  if (t.includes('qirq')) return 40;
  if (t.includes('ellik')) return 50;

  // 3. Ruscha so'zlar
  if (t.includes('один') || t.includes('одно') || t.includes('перв')) return 1;
  if (t.includes('два') || t.includes('две') || t.includes('втор')) return 2;
  if (t.includes('три') || t.includes('трет')) return 3;
  if (t.includes('четыре')) return 4;
  if (t.includes('пять')) return 5;
  if (t.includes('шесть')) return 6;
  if (t.includes('семь')) return 7;
  if (t.includes('восемь')) return 8;
  if (t.includes('девять')) return 9;
  if (t.includes('десять')) return 10;
  if (t.includes('двадцать пять')) return 25;
  if (t.includes('двадцать')) return 20;
  if (t.includes('тридцать')) return 30;
  if (t.includes('сорок')) return 40;
  if (t.includes('пятьдесят')) return 50;

  return null;
}

export function parseSmartVoiceCommand(text) {
  if (!text) return {};
  const t = String(text).toLowerCase().trim();
  const result = {};

  // Sinf: masalan "7-sinf", "7 sinf", "7 класс"
  const gradeMatch = t.match(/\b(5|6|7|8|9|10|11)\s*(?:-?\s*(?:sinf|класс|class))\b/);
  if (gradeMatch) {
    result.grade = parseInt(gradeMatch[1], 10);
  }

  // Savollar soni: "4 ta savol", "5 заданий", "3 savol"
  const qMatch = t.match(/\b(\d+)\s*(?:ta\s*)?(?:savol|topshiriq|задани[йяе])\b/);
  if (qMatch) {
    result.questionCount = parseInt(qMatch[1], 10);
  } else {
    // So'z bilan aytilgan bo'lsa
    if (t.includes('uchta savol') || t.includes('три задания')) result.questionCount = 3;
    if (t.includes('to\'rtta savol') || t.includes('четыре задания')) result.questionCount = 4;
    if (t.includes('beshta savol') || t.includes('пять заданий')) result.questionCount = 5;
    if (t.includes('o\'nta savol') || t.includes('десять заданий')) result.questionCount = 10;
  }

  // Variantlar soni: "2 ta variant", "1 вариант", "2 варианта"
  const vMatch = t.match(/\b(\d+)\s*(?:ta\s*)?(?:variant|вариант[а]?)\b/);
  if (vMatch) {
    result.variantsCount = parseInt(vMatch[1], 10);
  } else {
    if (t.includes('bitta variant') || t.includes('один вариант')) result.variantsCount = 1;
    if (t.includes('ikkita variant') || t.includes('два варианта')) result.variantsCount = 2;
    if (t.includes('to\'rtta variant') || t.includes('четыре варианта')) result.variantsCount = 4;
  }

  // Mavzu qismi: "mavzu ..." yoki "тема ..." dan keyingi qism
  const topicMatch = t.match(/(?:mavzu|mavzusi|тема|темы)\s*[:\-]?\s*(.+)$/i);
  if (topicMatch) {
    result.topic = topicMatch[1].trim();
  }

  return result;
}

export default function VoiceMicButton({ 
  onTranscript, 
  lang = 'uz', 
  className = '', 
  buttonTitle = "Ovozli kiritish (gapiring...)",
  size = 'md'
}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(lang === 'ru' 
        ? "Ваш браузер не поддерживает голосовой ввод (Web Speech API). Пожалуйста, используйте Google Chrome, Яндекс Браузер или Microsoft Edge." 
        : "Brauzeringiz ovozli kiritishni qo'llab-quvvatlamaydi. Iltimos, Google Chrome yoki Microsoft Edge brauzeridan foydalaning.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'ru' ? 'ru-RU' : 'uz-UZ';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && onTranscript) {
          onTranscript(transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'h-8 w-8 rounded-lg' 
    : size === 'lg' 
    ? 'h-11 w-11 rounded-2xl' 
    : 'h-9 w-9 rounded-xl';

  const iconSizes = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? (lang === 'ru' ? "Слушаю... Нажмите для остановки" : "Tinglanmoqda... To'xtatish uchun bosing") : buttonTitle}
      className={`relative inline-flex items-center justify-center transition-all cursor-pointer select-none ${sizeClasses} ${
        isListening
          ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200 shadow-md shadow-rose-500/30'
          : 'bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 border border-slate-200'
      } ${className}`}
    >
      {isListening ? (
        <span className="flex items-center justify-center">
          <Mic className={`${iconSizes} animate-bounce`} />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-600 animate-ping" />
        </span>
      ) : (
        <Mic className={iconSizes} />
      )}
    </button>
  );
}
