import React, { useEffect, useState } from 'react';
import { Plus, RotateCw } from 'lucide-react';
import type { GarmentItem, Language } from '../types/garment';
import { TRANSLATIONS } from '../i18n/translations';
import { processGarmentImage } from '../utils/garmentImageProcessor';

interface LookbookGridProps {
  garments: GarmentItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAddNew: () => void;
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

function ProcessedThumbnail({
  garment,
  side,
}: {
  garment: GarmentItem;
  side: 'front' | 'back';
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const src = side === 'front' ? garment.frontImage : garment.backImage;
  const cal = side === 'front' ? garment.frontCalibration : garment.backCalibration;

  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setDataUrl(null);
      return;
    }
    processGarmentImage(src, cal, garment.projectionMode, garment.baseColor)
      .then((res) => {
        if (!cancelled) {
          setDataUrl(res.canvas.toDataURL('image/png'));
        }
      })
      .catch(() => {
        if (!cancelled) setDataUrl(src);
      });
    return () => {
      cancelled = true;
    };
  }, [src, cal, garment.projectionMode, garment.baseColor]);

  if (!dataUrl) {
    return (
      <div
        className="w-full h-full flex items-center justify-center text-xs text-zinc-400"
        style={{ backgroundColor: garment.baseColor }}
      >
        <span>{garment.brand}</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`${garment.name} ${side}`}
      referrerPolicy="no-referrer"
      className="w-full h-full object-contain p-5 transition-transform duration-200 group-hover:scale-[1.03]"
    />
  );
}

export function LookbookGrid({
  garments,
  activeId,
  onSelect,
  onAddNew,
  language,
}: LookbookGridProps) {
  const t = TRANSLATIONS[language];
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});

  const toggleFlip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-zinc-200 mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-950">
            {t.navLookbook}
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            {garments.length} {garments.length === 1 ? 'garment' : 'garments'} in studio
            archive — select any piece to inspect in 360° 3D.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addGarment}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {garments.map((item) => {
          const isBack = Boolean(flippedIds[item.id]);
          const isActive = item.id === activeId;
          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(item.id);
                }
              }}
              className={`group rounded-xl border bg-white overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col ${
                isActive ? 'border-zinc-950 shadow-sm' : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <div
                className="relative aspect-[4/4.3] w-full overflow-hidden border-b border-zinc-100"
                style={{
                  backgroundColor:
                    item.projectionMode === 'graphic-decal'
                      ? item.baseColor
                      : '#e8e8e6',
                }}
              >
                <ProcessedThumbnail
                  garment={item}
                  side={isBack ? 'back' : 'front'}
                />

                <button
                  type="button"
                  onClick={(e) => toggleFlip(e, item.id)}
                  title="Flip Front / Back"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/90 text-zinc-900 border border-zinc-200 text-[11px] font-medium hover:bg-white transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{isBack ? t.viewBack : t.viewFront}</span>
                </button>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    <span>{item.brand || 'ATELIER'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.gsm}</span>
                    {isActive && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-zinc-950 font-semibold">Active</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-display text-base font-semibold text-zinc-950 mt-1 line-clamp-1">
                    {item.name}
                  </h2>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs">
                  <span className="text-zinc-500 truncate">{item.fitCut}</span>
                  <span className="font-mono font-semibold text-zinc-950 tabular-nums shrink-0">
                    {formatPrice(item.price, item.currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Garment Tile */}
        <button
          type="button"
          onClick={onAddNew}
          className="rounded-xl border border-dashed border-zinc-300 bg-[#fafaf9] hover:border-zinc-500 hover:bg-white transition-colors min-h-[340px] flex flex-col items-center justify-center gap-3 p-6 text-center cursor-pointer"
        >
          <div className="w-11 h-11 rounded-full bg-zinc-900 text-white flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-zinc-950">
              {t.addGarment}
            </div>
            <div className="text-xs text-zinc-500 mt-1 max-w-[220px]">
              Upload front and back shirt photos to inspect in 360° 3D
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
