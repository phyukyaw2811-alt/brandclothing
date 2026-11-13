import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { GarmentItem, Language } from '../types/garment';
import { TRANSLATIONS } from '../i18n/translations';
import { processGarmentImage } from '../utils/garmentImageProcessor';

interface SpecSheetViewProps {
  garment: GarmentItem;
  onBackToViewer: () => void;
  language: Language;
}

function formatPrice(price: string, currency: GarmentItem['currency']): string {
  const num = Number(price.replace(/,/g, ''));
  if (Number.isNaN(num)) return `${price} ${currency}`;
  if (currency === 'MMK') return `${num.toLocaleString()} MMK`;
  if (currency === 'USD') return `$${num.toLocaleString()}`;
  if (currency === 'EUR') return `€${num.toLocaleString()}`;
  return `¥${num.toLocaleString()}`;
}

export function SpecSheetView({
  garment,
  onBackToViewer,
  language,
}: SpecSheetViewProps) {
  const t = TRANSLATIONS[language];
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (garment.frontImage) {
      processGarmentImage(
        garment.frontImage,
        garment.frontCalibration,
        garment.projectionMode,
        garment.baseColor
      )
        .then((res) => {
          if (!cancelled) setFrontPreview(res.canvas.toDataURL('image/png'));
        })
        .catch(() => {
          if (!cancelled) setFrontPreview(garment.frontImage);
        });
    } else {
      setFrontPreview(null);
    }

    if (garment.backImage) {
      processGarmentImage(
        garment.backImage,
        garment.backCalibration,
        garment.projectionMode,
        garment.baseColor
      )
        .then((res) => {
          if (!cancelled) setBackPreview(res.canvas.toDataURL('image/png'));
        })
        .catch(() => {
          if (!cancelled) setBackPreview(garment.backImage);
        });
    } else {
      setBackPreview(null);
    }

    return () => {
      cancelled = true;
    };
  }, [garment]);

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8 space-y-8">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <button
          type="button"
          onClick={onBackToViewer}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.navViewer}</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{t.printTechPack}</span>
        </button>
      </div>

      {/* Printable Garment Specification Sheet */}
      <article className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-10 space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-zinc-200">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
              <span className="text-zinc-900 font-semibold">{garment.brand}</span>
              {garment.collection && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{garment.collection}</span>
                </>
              )}
              {garment.designer && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{garment.designer}</span>
                </>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950">
              {garment.name}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <div className="font-mono text-2xl font-semibold text-zinc-950 tabular-nums">
              {formatPrice(garment.price, garment.currency)}
            </div>
            <div className="font-mono text-xs text-zinc-500 mt-1">{garment.sku}</div>
          </div>
        </header>

        {/* Front & Back Garment Plates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>{t.viewFront}</span>
              <span className="font-mono">000°</span>
            </div>
            <div
              className="aspect-square rounded-xl border border-zinc-200 flex items-center justify-center overflow-hidden p-6"
              style={{
                backgroundColor:
                  garment.projectionMode === 'graphic-decal'
                    ? garment.baseColor
                    : '#ececea',
              }}
            >
              {frontPreview ? (
                <img
                  src={frontPreview}
                  alt={`${garment.name} front plate`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-zinc-400">No front image uploaded</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
              <span>{t.viewBack}</span>
              <span className="font-mono">180°</span>
            </div>
            <div
              className="aspect-square rounded-xl border border-zinc-200 flex items-center justify-center overflow-hidden p-6"
              style={{
                backgroundColor:
                  garment.projectionMode === 'graphic-decal'
                    ? garment.baseColor
                    : '#ececea',
              }}
            >
              {backPreview ? (
                <img
                  src={backPreview}
                  alt={`${garment.name} back plate`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-zinc-400">No back image uploaded</span>
              )}
            </div>
          </div>
        </div>

        {/* Technical Spec Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 border-t border-zinc-200">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                {t.garmentNotes}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-800 whitespace-pre-line">
                {garment.description}
              </p>
            </div>

            {garment.careNotes && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  {t.careInstructions}
                </h2>
                <p className="text-xs leading-relaxed text-zinc-600">
                  {garment.careNotes}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 text-xs border-t lg:border-t-0 lg:border-l border-zinc-200 pt-5 lg:pt-0 lg:pl-6">
            <div className="flex justify-between py-1.5 border-b border-zinc-100 gap-4">
              <span className="text-zinc-500">{t.fabricComp}</span>
              <span className="font-medium text-zinc-900 text-right">{garment.fabric}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100 gap-4">
              <span className="text-zinc-500">{t.fabricGsm}</span>
              <span className="font-mono font-medium text-zinc-900">{garment.gsm}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100 gap-4">
              <span className="text-zinc-500">{t.fitCut}</span>
              <span className="font-medium text-zinc-900 text-right">{garment.fitCut}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100 gap-4">
              <span className="text-zinc-500">{t.printTechnique}</span>
              <span className="font-medium text-zinc-900 text-right">
                {garment.printMethod}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 gap-4">
              <span className="text-zinc-500">{t.baseFabricColor}</span>
              <span className="inline-flex items-center gap-2 font-mono text-zinc-900 uppercase">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-zinc-300"
                  style={{ backgroundColor: garment.baseColor }}
                />
                {garment.baseColor}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 gap-4">
              <span className="text-zinc-500">{t.availableSizes}</span>
              <span className="font-mono font-medium text-zinc-900">
                {garment.sizes.join(' / ') || 'One Size'}
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
