import React, { useState } from 'react';
import {
  Copy,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Scissors,
  Sliders,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ALL_SIZES,
  DEFAULT_CALIBRATION,
  type FabricPreset,
  type GarmentItem,
  type GarmentSilhouette,
  type ImageCalibration,
  type Language,
} from '../types/garment';
import { TRANSLATIONS } from '../i18n/translations';
import { fileToDataUrl, processGarmentImage } from '../utils/garmentImageProcessor';

type InspectorTab = 'details' | 'images' | 'fabric';

interface DetailsInspectorProps {
  garment: GarmentItem;
  allGarments: GarmentItem[];
  onChange: (updated: GarmentItem) => void;
  onSelectGarment: (id: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenSpecSheet: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

const FABRIC_SWATCHES = [
  { hex: '#f2f3f5', label: 'Chalk White' },
  { hex: '#e7e2d8', label: 'Natural Ecru' },
  { hex: '#9ca3af', label: 'Heather Ash' },
  { hex: '#23252a', label: 'Washed Charcoal' },
  { hex: '#141416', label: 'Pitch Black' },
  { hex: '#1d273b', label: 'Archive Navy' },
  { hex: '#3d483b', label: 'Olive Moss' },
  { hex: '#6f2222', label: 'Vintage Burgundy' },
];

export function DetailsInspector({
  garment,
  allGarments,
  onChange,
  onSelectGarment,
  onDuplicate,
  onDelete,
  onOpenSpecSheet,
  language,
  onToggleLanguage,
}: DetailsInspectorProps) {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<InspectorTab>('details');
  const [splitRatio, setSplitRatio] = useState(0.51);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updateField = <K extends keyof GarmentItem>(key: K, value: GarmentItem[K]) => {
    onChange({
      ...garment,
      [key]: value,
      updatedAt: Date.now(),
    });
  };

  const updateCalibration = (
    side: 'front' | 'back',
    patch: Partial<ImageCalibration>
  ) => {
    if (side === 'front') {
      updateField('frontCalibration', { ...garment.frontCalibration, ...patch });
    } else {
      updateField('backCalibration', { ...garment.backCalibration, ...patch });
    }
  };

  const handleSingleUpload = async (side: 'front' | 'back', file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const nextCal: ImageCalibration = {
        ...DEFAULT_CALIBRATION,
        cropBox: undefined,
      };
      // Auto-detect base fabric color from front upload
      let nextBase = garment.baseColor;
      if (side === 'front') {
        const processed = await processGarmentImage(
          dataUrl,
          nextCal,
          garment.projectionMode,
          garment.baseColor
        );
        if (garment.projectionMode === 'full-photo') {
          nextBase = processed.detectedBaseColor;
        }
        onChange({
          ...garment,
          frontImage: dataUrl,
          frontCalibration: nextCal,
          baseColor: nextBase,
          updatedAt: Date.now(),
        });
      } else {
        onChange({
          ...garment,
          backImage: dataUrl,
          backCalibration: nextCal,
          updatedAt: Date.now(),
        });
      }
    } catch {
      setUploadError('Could not load image. Please use a valid PNG, JPG, or WebP.');
    }
  };

  const handleSplitSheetUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await fileToDataUrl(file, 1800);
      const frontCal: ImageCalibration = {
        ...DEFAULT_CALIBRATION,
        cropBox: { x: 0, y: 0.02, w: Math.min(0.65, splitRatio + 0.015), h: 0.96 },
      };
      const backCal: ImageCalibration = {
        ...DEFAULT_CALIBRATION,
        cropBox: {
          x: Math.max(0.35, splitRatio - 0.015),
          y: 0.02,
          w: Math.min(0.65, 1 - (splitRatio - 0.015)),
          h: 0.96,
        },
      };
      let nextBase = garment.baseColor;
      try {
        const processed = await processGarmentImage(
          dataUrl,
          frontCal,
          'full-photo',
          garment.baseColor
        );
        nextBase = processed.detectedBaseColor;
      } catch {
        // fallback to existing color
      }

      onChange({
        ...garment,
        projectionMode: 'full-photo',
        frontImage: dataUrl,
        backImage: dataUrl,
        frontCalibration: frontCal,
        backCalibration: backCal,
        baseColor: nextBase,
        updatedAt: Date.now(),
      });
    } catch {
      setUploadError('Could not process combined sheet image.');
    }
  };

  const handleSplitRatioAdjust = (ratio: number) => {
    setSplitRatio(ratio);
    if (garment.frontImage && garment.frontImage === garment.backImage) {
      onChange({
        ...garment,
        frontCalibration: {
          ...garment.frontCalibration,
          cropBox: { x: 0, y: 0.02, w: Math.min(0.68, ratio + 0.015), h: 0.96 },
        },
        backCalibration: {
          ...garment.backCalibration,
          cropBox: {
            x: Math.max(0.32, ratio - 0.015),
            y: 0.02,
            w: Math.min(0.68, 1 - (ratio - 0.015)),
            h: 0.96,
          },
        },
        updatedAt: Date.now(),
      });
    }
  };

  const toggleSize = (sz: string) => {
    const exists = garment.sizes.includes(sz);
    const next = exists
      ? garment.sizes.filter((s) => s !== sz)
      : [...garment.sizes, sz];
    updateField('sizes', next);
  };

  const isCombinedSheet =
    Boolean(garment.frontImage) && garment.frontImage === garment.backImage;

  return (
    <aside className="flex flex-col h-full bg-white border-t lg:border-t-0 lg:border-l border-zinc-200 text-zinc-900">
      {/* Studio Garment Switcher Bar */}
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between gap-2 bg-[#fafaf9]">
        <div className="min-w-0 flex-1">
          <label htmlFor="garment-switcher" className="sr-only">
            {t.savedWardrobe}
          </label>
          <select
            id="garment-switcher"
            value={garment.id}
            onChange={(e) => onSelectGarment(e.target.value)}
            className="w-full text-xs font-medium bg-white border border-zinc-200 rounded-lg px-2.5 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer"
          >
            {allGarments.map((g) => (
              <option key={g.id} value={g.id}>
                {g.brand ? `${g.brand} — ${g.name}` : g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleLanguage}
            title="Switch Language (English / မြန်မာ)"
            className="px-2 py-2 rounded-lg border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {language === 'en' ? 'မြန်မာ' : 'EN'}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title={t.duplicateGarment}
            aria-label={t.duplicateGarment}
            className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {allGarments.length > 1 && (
            <button
              type="button"
              onClick={onDelete}
              title={t.deleteGarment}
              aria-label={t.deleteGarment}
              className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Inspector Tabs */}
      <div className="px-4 pt-3 pb-2 border-b border-zinc-200 bg-white">
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'details'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.tabDetails}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'images'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.tabImages}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fabric')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'fabric'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.tabFabric}</span>
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                {t.garmentName}
              </label>
              <input
                type="text"
                value={garment.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t.brandLabel}
                </label>
                <input
                  type="text"
                  value={garment.brand}
                  onChange={(e) => updateField('brand', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t.designerCredit}
                </label>
                <input
                  type="text"
                  value={garment.designer}
                  onChange={(e) => updateField('designer', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t.collectionDrop}
                </label>
                <input
                  type="text"
                  value={garment.collection}
                  onChange={(e) => updateField('collection', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t.skuCode}
                </label>
                <input
                  type="text"
                  value={garment.sku}
                  onChange={(e) => updateField('sku', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t.price}
                </label>
                <input
                  type="text"
                  value={garment.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono tabular-nums text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t.currency}
                </label>
                <select
                  value={garment.currency}
                  onChange={(e) =>
                    updateField('currency', e.target.value as GarmentItem['currency'])
                  }
                  className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer"
                >
                  <option value="USD">USD</option>
                  <option value="MMK">MMK</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                    {t.fabricComp}
                  </label>
                  <input
                    type="text"
                    value={garment.fabric}
                    onChange={(e) => updateField('fabric', e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                    {t.fabricGsm}
                  </label>
                  <input
                    type="text"
                    value={garment.gsm}
                    onChange={(e) => updateField('gsm', e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                    {t.fitCut}
                  </label>
                  <input
                    type="text"
                    value={garment.fitCut}
                    onChange={(e) => updateField('fitCut', e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                    {t.printTechnique}
                  </label>
                  <input
                    type="text"
                    value={garment.printMethod}
                    onChange={(e) => updateField('printMethod', e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-zinc-600 mb-2">
                  {t.availableSizes}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SIZES.map((sz) => {
                    const active = garment.sizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleSize(sz)}
                        className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-zinc-950 text-white border-zinc-950'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t.garmentNotes}
                </label>
                <textarea
                  rows={5}
                  value={garment.description}
                  placeholder={t.garmentNotesPlaceholder}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm leading-relaxed text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  {t.careInstructions}
                </label>
                <textarea
                  rows={2}
                  value={garment.careNotes}
                  onChange={(e) => updateField('careNotes', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs leading-relaxed text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-y"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-5">
            {uploadError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {uploadError}
              </div>
            )}

            {/* Mapping Mode Selector */}
            <div>
              <span className="block text-xs font-medium text-zinc-600 mb-2">
                {t.mappingMode}
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateField('projectionMode', 'full-photo')}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    garment.projectionMode === 'full-photo'
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {t.modeFullPhoto}
                </button>
                <button
                  type="button"
                  onClick={() => updateField('projectionMode', 'graphic-decal')}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    garment.projectionMode === 'graphic-decal'
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {t.modeGraphicDecal}
                </button>
              </div>
            </div>

            {/* Single Combined Front+Back Sheet Uploader */}
            <div className="rounded-xl border border-dashed border-zinc-300 bg-[#fafaf9] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                  <Scissors className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.splitSheetBtn}</span>
                </div>
                <label className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap shrink-0">
                  <span>Upload Sheet</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSplitSheetUpload(e.target.files?.[0])}
                  />
                </label>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{t.splitSheetHint}</p>

              {isCombinedSheet && (
                <div className="pt-2 border-t border-zinc-200/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-600">
                    <span>{t.splitPosition}</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(splitRatio * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={0.6}
                    step={0.01}
                    value={splitRatio}
                    onChange={(e) => handleSplitRatioAdjust(parseFloat(e.target.value))}
                    className="w-full accent-zinc-900 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Front & Back Side Calibration Blocks */}
            {(['front', 'back'] as const).map((side) => {
              const imgUrl = side === 'front' ? garment.frontImage : garment.backImage;
              const cal =
                side === 'front' ? garment.frontCalibration : garment.backCalibration;
              const title = side === 'front' ? t.frontViewImage : t.backViewImage;
              const uploadLabel = side === 'front' ? t.uploadFront : t.uploadBack;

              return (
                <div key={side} className="pt-4 border-t border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-zinc-900">{title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          updateCalibration(side, {
                            scale: 1,
                            offsetX: 0,
                            offsetY: 0,
                            bgTolerance: 28,
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t.resetCalibration}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-24 rounded-lg border border-zinc-200 bg-[#ededeb] flex items-center justify-center overflow-hidden shrink-0">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={`${garment.name} ${side}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-900 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{uploadLabel}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleSingleUpload(side, e.target.files?.[0])
                          }
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs text-zinc-700 cursor-pointer">
                        <span>{t.autoRemoveBg}</span>
                        <input
                          type="checkbox"
                          checked={cal.removeBg}
                          onChange={(e) =>
                            updateCalibration(side, { removeBg: e.target.checked })
                          }
                          className="w-4 h-4 accent-zinc-900 rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Calibration Sliders */}
                  <div className="space-y-2.5 pt-1">
                    {cal.removeBg && (
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                          <span>{t.bgTolerance}</span>
                          <span className="font-mono tabular-nums">{cal.bgTolerance}</span>
                        </div>
                        <input
                          type="range"
                          min={8}
                          max={80}
                          step={1}
                          value={cal.bgTolerance}
                          onChange={(e) =>
                            updateCalibration(side, {
                              bgTolerance: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full accent-zinc-900 cursor-pointer"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                        <span>{t.scale}</span>
                        <span className="font-mono tabular-nums">
                          {Math.round(cal.scale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.6}
                        max={1.6}
                        step={0.02}
                        value={cal.scale}
                        onChange={(e) =>
                          updateCalibration(side, { scale: parseFloat(e.target.value) })
                        }
                        className="w-full accent-zinc-900 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                          <span>{t.offsetX}</span>
                          <span className="font-mono tabular-nums">
                            {cal.offsetX.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-0.25}
                          max={0.25}
                          step={0.01}
                          value={cal.offsetX}
                          onChange={(e) =>
                            updateCalibration(side, {
                              offsetX: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-zinc-900 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-600 mb-0.5">
                          <span>{t.offsetY}</span>
                          <span className="font-mono tabular-nums">
                            {cal.offsetY.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-0.25}
                          max={0.25}
                          step={0.01}
                          value={cal.offsetY}
                          onChange={(e) =>
                            updateCalibration(side, {
                              offsetY: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-zinc-900 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'fabric' && (
          <div className="space-y-5">
            {/* Silhouette Picker */}
            <div>
              <span className="block text-xs font-medium text-zinc-600 mb-2">
                {t.silhouette}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'oversized', label: t.silOversized, sub: 'Drop-shoulder' },
                    { id: 'classic', label: t.silClassic, sub: 'Standard cut' },
                    { id: 'longsleeve', label: t.silLongSleeve, sub: 'Ribbed cuff' },
                    { id: 'hoodie', label: t.silHoodie, sub: 'Hood & pocket' },
                  ] as { id: GarmentSilhouette; label: string; sub: string }[]
                ).map((item) => {
                  const active = garment.silhouette === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField('silhouette', item.id)}
                      className={`text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{item.label}</div>
                      <div
                        className={`text-[11px] ${
                          active ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {item.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fabric Finish Presets */}
            <div className="pt-4 border-t border-zinc-200">
              <span className="block text-xs font-medium text-zinc-600 mb-2">
                {t.fabricFinish}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'matte-jersey', label: 'Matte Jersey', sub: 'Combed cotton' },
                    { id: 'heavy-terry', label: 'Heavy Terry', sub: 'Textured loop' },
                    { id: 'vintage-wash', label: 'Vintage Wash', sub: 'Dry enzyme' },
                    { id: 'silky-interlock', label: 'Silky Interlock', sub: 'Mercerized' },
                  ] as { id: FabricPreset; label: string; sub: string }[]
                ).map((preset) => {
                  const active = garment.fabricPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateField('fabricPreset', preset.id)}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{preset.label}</div>
                      <div
                        className={`text-[11px] ${
                          active ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {preset.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Base Fabric Color */}
            <div className="pt-4 border-t border-zinc-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">
                  {t.baseFabricColor}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500 uppercase">
                    {garment.baseColor}
                  </span>
                  <input
                    type="color"
                    value={garment.baseColor}
                    aria-label={t.baseFabricColor}
                    onChange={(e) => updateField('baseColor', e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-300 cursor-pointer bg-transparent p-0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {FABRIC_SWATCHES.map((swatch) => {
                  const active =
                    garment.baseColor.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      title={swatch.label}
                      aria-label={swatch.label}
                      onClick={() => updateField('baseColor', swatch.hex)}
                      className={`w-7 h-7 rounded-full border transition-transform cursor-pointer ${
                        active
                          ? 'border-zinc-950 ring-2 ring-zinc-950 ring-offset-2 scale-105'
                          : 'border-zinc-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-zinc-200 bg-[#fafaf9]">
        <button
          type="button"
          onClick={onOpenSpecSheet}
          className="w-full py-2.5 px-4 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.openSpecSheet}</span>
        </button>
      </div>
    </aside>
  );
}
