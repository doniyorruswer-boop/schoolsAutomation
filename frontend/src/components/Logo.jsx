import React from 'react';

export default function Logo({ size = 44, className = '' }) {
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md transition-transform duration-200 hover:scale-105"
      >
        <defs>
          {/* Asosiy fon gradienti: Boy ko'kdan binafsharang tusga */}
          <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="45%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>

          {/* Oltin AI Yulduzcha gradienti */}
          <linearGradient id="star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Qavariq soya effekti */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e3a8a" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Yumaloq ramka (Squircle) */}
        <rect
          width="56"
          height="56"
          rx="16"
          fill="url(#bg-grad)"
          filter="url(#glow)"
        />

        {/* Ichki nafis kontur */}
        <rect
          x="1"
          y="1"
          width="54"
          height="54"
          rx="15"
          stroke="white"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />

        {/* Ochiq Kitob (Ta'lim ramzi) */}
        <path
          d="M13 39C17 37 22 36.5 28 38.5C34 36.5 39 37 43 39V22C39 20 34 19.5 28 21.5C22 19.5 17 20 13 22V39Z"
          fill="white"
          fillOpacity="0.15"
        />
        <path
          d="M13 39C17 37 22 36.5 28 38.5C34 36.5 39 37 43 39V22C39 20 34 19.5 28 21.5C22 19.5 17 20 13 22V39Z"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M28 21.5V38.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Bitiruvchi qalpog'i (Akademik muvaffaqiyat) */}
        <path
          d="M28 11L41 16.5L28 22L15 16.5L28 11Z"
          fill="white"
        />
        <path
          d="M37 19.5V25C37 26.8 33 28.5 28 28.5C23 28.5 19 26.8 19 25V19.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Qalpoq chochog'i (Tassel) */}
        <path
          d="M41 17V24"
          stroke="#FDE047"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="41" cy="24.5" r="1.5" fill="#FDE047" />

        {/* AI Yulduzchasi (Sun'iy intellekt / Ilhom porlashi) */}
        <path
          d="M44 8L45.2 11.5L49 12.5L45.2 13.8L44 17L42.8 13.8L39 12.5L42.8 11.5L44 8Z"
          fill="url(#star-grad)"
        />
      </svg>
    </div>
  );
}
