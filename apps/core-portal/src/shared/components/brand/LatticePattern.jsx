import React, { useId } from 'react';

/**
 * LatticePattern — Komponen Ornamen Islami Geometris Hairline (8-Point Star Mesh)
 * 
 * Digunakan sebagai latar tone-on-tone wibawa institusi pada panel hijau login,
 * hero greeting launcher, dan header sertifikasi/rapor.
 * 
 * Props:
 * - opacity: Tingkat transparansi pola (default: 0.08, rentang aman 0.03 - 0.14)
 * - color: Warna garis goresan SVG (default: 'currentColor')
 * - animated: Efek pergeseran lambat 60s loop ambient drift (default: true)
 * - patternSize: Ukuran kisi pola dalam pixel (default: 96)
 * - className: Tambahan styling wrapper
 */
export default function LatticePattern({
  opacity = 0.08,
  color = 'currentColor',
  animated = true,
  patternSize = 96,
  className = ''
}) {
  const patternId = useId();

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      style={{ opacity }}
    >
      <svg
        className={`w-[200%] h-[200%] ${animated ? 'ilms-drift' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={patternId}
            width={patternSize}
            height={patternSize}
            patternUnits="userSpaceOnUse"
          >
            {/* 8-Point Star Central Node */}
            <path
              d="M48 16 L56 32 L72 32 L60 44 L68 60 L48 52 L28 60 L36 44 L24 32 L40 32 Z"
              fill="none"
              stroke={color}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Tessellation Corner Nodes */}
            <path
              d="M0 48 L16 56 L16 72 L28 60 L44 68 L36 48 L44 28 L28 36 L16 24 L16 40 Z"
              fill="none"
              stroke={color}
              strokeWidth="1"
              strokeLinecap="round"
            />
            <path
              d="M96 48 L80 56 L80 72 L68 60 L52 68 L60 48 L52 28 L68 36 L80 24 L80 40 Z"
              fill="none"
              stroke={color}
              strokeWidth="1"
              strokeLinecap="round"
            />
            {/* Perimeter Connections & Micro-perforations */}
            <path
              d="M48 0 L56 16 L72 16 L60 28 L68 44 L48 36 L28 44 L36 28 L24 16 L40 16 Z"
              fill="none"
              stroke={color}
              strokeWidth="0.8"
              strokeDasharray="2 3"
            />
            <path
              d="M48 96 L56 80 L72 80 L60 68 L68 52 L48 60 L28 52 L36 68 L24 80 L40 80 Z"
              fill="none"
              stroke={color}
              strokeWidth="0.8"
              strokeDasharray="2 3"
            />
            {/* Subtle Diagonal Structure Lines */}
            <line
              x1="0"
              y1="0"
              x2={patternSize}
              y2={patternSize}
              stroke={color}
              strokeOpacity="0.4"
              strokeWidth="0.5"
            />
            <line
              x1={patternSize}
              y1="0"
              x2="0"
              y2={patternSize}
              stroke={color}
              strokeOpacity="0.4"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
