import React, { useEffect, useRef } from 'react';
import { drawBarcodeToCanvas } from '../utils/barcodeHelper';

export default function BarcodeCanvas({
  barcode,
  barWidth = 1.8,
  barHeight = 45,
  fontSize = 11,
  showText = true,
  className = ''
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && barcode) {
      drawBarcodeToCanvas(canvasRef.current, barcode, {
        barWidth,
        barHeight,
        fontSize,
        showText,
        padding: 6
      });
    }
  }, [barcode, barWidth, barHeight, fontSize, showText]);

  if (!barcode) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`rounded border border-slate-200 shadow-2xs ${className}`}
    />
  );
}
