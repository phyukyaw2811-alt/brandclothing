import React, { useState } from 'react';
import { Image as ImageIcon, Scissors, Upload, X } from 'lucide-react';
import {
  DEFAULT_CALIBRATION,
  type GarmentItem,
  type GarmentSilhouette,
  type Language,
  type ProjectionMode,
} from '../types/garment';
import { TRANSLATIONS } from '../i18n/translations';
import { fileToDataUrl, processGarmentImage } from '../utils/garmentImageProcessor';

interface AddGarmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (garment: GarmentItem) => void;
  language: Language;
}

export function AddGarmentModal({
  isOpen,
  onClose,
  onCreate,
  language,
}: AddGarmentModalProps) {
  const t = TRANSLATIONS[language];
  const [uploadMode, setUploadMode] = useState<'separate' | 'sheet'>('separate');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<GarmentItem['currency']>('USD');
  const [fabric, setFabric] = useState('100% Combed Heavyweight Cotton');
  const [gsm, setGsm] = useState('280 GSM');
  const [description, setDescription] = useState('');
  const [silhouette, setSilhouette] = useState<GarmentSilhouette>('oversized');
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('full-photo');
  const [baseColor, setBaseColor] = useState('#f2f3f5');
  const [frontDataUrl, setFrontDataUrl] = useState<string | null>(null);
  const [backDataUrl, setBackDataUrl] = useState<string | null>(null);
  const [sheetDataUrl, setSheetDataUrl] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.51);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = async (
    file: File | undefined,
    target: 'front' | 'back' | 'sheet'
  ) => {
    if (!file) return;
    setErrorMsg(null);
    try {
      const url = await fileToDataUrl(file, target === 'sheet' ? 1800 : 1600);
      if (target === 'front') setFrontDataUrl(url);
      else if (target === 'back') setBackDataUrl(url);
      else setSheetDataUrl(url);
    } catch {
      setErrorMsg('Failed to read image file. Please select a PNG, JPG, or WebP.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `garment-${Date.now()}`;

    let finalFront = frontDataUrl;
    let finalBack = backDataUrl;
    let frontCal = { ...DEFAULT_CALIBRATION };
    let backCal = { ...DEFAULT_CALIBRATION };
    let finalMode = projectionMode;
    let detectedColor = baseColor;

    if (uploadMode === 'sheet' && sheetDataUrl) {
      finalFront = sheetDataUrl;
      finalBack = sheetDataUrl;
      finalMode = 'full-photo';
      frontCal = {
        ...DEFAULT_CALIBRATION,
        cropBox: { x: 0, y: 0.02, w: Math.min(0.66, splitRatio + 0.015), h: 0.96 },
      };
      backCal = {
        ...DEFAULT_CALIBRATION,
        cropBox: {
          x: Math.max(0.34, splitRatio - 0.015),
          y: 0.02,
          w: Math.min(0.66, 1 - (splitRatio - 0.015)),
          h: 0.96,
        },
      };
    }

    if (finalFront && finalMode === 'full-photo') {
      try {
        const res = await processGarmentImage(
          finalFront,
          frontCal,
          'full-photo',
          baseColor
        );
        detectedColor = res.detectedBaseColor;
      } catch {
        // use manual color
      }
    }

    const newGarment: GarmentItem = {
      id,
      name: name.trim() || 'Untitled Custom Shirt',
      brand: brand.trim() || 'CUSTOM ATELIER',
      collection: 'Custom Studio Upload',
      designer: 'Studio Creator',
      sku: `AT-${String(Date.now()).slice(-4)}`,
      price: price.trim() || '45',
      currency,
      fabric: fabric.trim() || '100% Cotton',
      gsm: gsm.trim() || '260 GSM',
      fitCut:
        silhouette === 'oversized'
          ? 'Boxy Oversized'
          : silhouette === 'hoodie'
            ? 'Relaxed Boxy Hoodie'
            : silhouette === 'longsleeve'
              ? 'Drop-Shoulder Long Sleeve'
              : 'Classic Regular Fit',
      printMethod: 'Screenprint / Custom Graphic',
      sizes: ['S', 'M', 'L', 'XL'],
      careNotes: 'Machine wash cold inside-out. Hang dry.',
      description:
        description.trim() ||
        'Custom garment uploaded for 360-degree front and back inspection.',
      silhouette,
      fabricPreset: silhouette === 'hoodie' ? 'heavy-terry' : 'matte-jersey',
      projectionMode: finalMode,
      baseColor: detectedColor,
      frontImage: finalFront,
      backImage: finalBack,
      frontCalibration: frontCal,
      backCalibration: backCal,
      updatedAt: Date.now(),
    };

    onCreate(newGarment);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-garment-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-zinc-200 shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-200">
          <div>
            <h2
              id="add-garment-title"
              className="font-display text-xl font-semibold text-zinc-950"
            >
              {t.modalTitle}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">{t.modalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Upload Style Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-lg">
            <button
              type="button"
              onClick={() => setUploadMode('separate')}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                uploadMode === 'separate'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {t.separateUpload}
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('sheet')}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                uploadMode === 'sheet'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {t.singleSheetUpload}
            </button>
          </div>

          {uploadMode === 'separate' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-[#fafaf9] hover:border-zinc-500 p-4 h-44 cursor-pointer transition-colors overflow-hidden">
                  {frontDataUrl ? (
                    <img
                      src={frontDataUrl}
                      alt="Front upload preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-800">
                        {t.frontViewImage}
                      </span>
                      <span className="text-[11px] text-zinc-500">PNG / JPG / WebP</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0], 'front')}
                  />
                </label>

                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-[#fafaf9] hover:border-zinc-500 p-4 h-44 cursor-pointer transition-colors overflow-hidden">
                  {backDataUrl ? (
                    <img
                      src={backDataUrl}
                      alt="Back upload preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-800">
                        {t.backViewImage}
                      </span>
                      <span className="text-[11px] text-zinc-500">PNG / JPG / WebP</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0], 'back')}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span>{t.mappingMode}:</span>
                  <button
                    type="button"
                    onClick={() => setProjectionMode('full-photo')}
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer ${
                      projectionMode === 'full-photo'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-white text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {t.modeFullPhoto}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectionMode('graphic-decal')}
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer ${
                      projectionMode === 'graphic-decal'
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-white text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {t.modeGraphicDecal}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span>{t.baseFabricColor}:</span>
                  <input
                    type="color"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-[#fafaf9] hover:border-zinc-500 p-4 h-48 cursor-pointer transition-colors overflow-hidden">
                {sheetDataUrl ? (
                  <>
                    <img
                      src={sheetDataUrl}
                      alt="Combined front and back sheet preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-600 pointer-events-none"
                      style={{ left: `${splitRatio * 100}%` }}
                    />
                  </>
                ) : (
                  <>
                    <Scissors className="w-5 h-5 text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-800">
                      {t.splitSheetBtn}
                    </span>
                    <span className="text-[11px] text-zinc-500">{t.splitSheetHint}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0], 'sheet')}
                />
              </label>

              {sheetDataUrl && (
                <div>
                  <div className="flex justify-between text-xs text-zinc-600 mb-1">
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
                    onChange={(e) => setSplitRatio(parseFloat(e.target.value))}
                    className="w-full accent-zinc-900 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Garment Details Fields */}
          <div className="pt-4 border-t border-zinc-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {t.garmentName}
                </label>
                <input
                  type="text"
                  value={name}
                  placeholder="e.g. Midnight Archive Tee"
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {t.brandLabel}
                </label>
                <input
                  type="text"
                  value={brand}
                  placeholder="e.g. NOVA XXVI"
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {t.silhouette}
                </label>
                <select
                  value={silhouette}
                  onChange={(e) => setSilhouette(e.target.value as GarmentSilhouette)}
                  className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer"
                >
                  <option value="oversized">{t.silOversized}</option>
                  <option value="classic">{t.silClassic}</option>
                  <option value="longsleeve">{t.silLongSleeve}</option>
                  <option value="hoodie">{t.silHoodie}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {t.fabricGsm}
                </label>
                <input
                  type="text"
                  value={gsm}
                  onChange={(e) => setGsm(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {t.price}
                </label>
                <input
                  type="text"
                  value={price}
                  placeholder="48"
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {t.currency}
                </label>
                <select
                  value={currency}
                  onChange={(e) =>
                    setCurrency(e.target.value as GarmentItem['currency'])
                  }
                  className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer"
                >
                  <option value="USD">USD</option>
                  <option value="MMK">MMK</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                {t.fabricComp}
              </label>
              <input
                type="text"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                {t.garmentNotes}
              </label>
              <textarea
                rows={3}
                value={description}
                placeholder={t.garmentNotesPlaceholder}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{t.createAndView}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
