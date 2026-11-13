/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type {
  AppView,
  BackdropTheme,
  GarmentItem,
  GarmentSilhouette,
  Language,
} from './types/garment';
import { TRANSLATIONS } from './i18n/translations';
import {
  loadActiveGarmentId,
  loadSavedGarments,
  saveActiveGarmentId,
  saveGarments,
} from './utils/storage';
import {
  GarmentViewport3D,
  type GarmentViewportHandle,
} from './components/GarmentViewport3D';
import { DetailsInspector } from './components/DetailsInspector';
import { AddGarmentModal } from './components/AddGarmentModal';
import { LookbookGrid } from './components/LookbookGrid';
import { SpecSheetView } from './components/SpecSheetView';

export default function App() {
  const [garments, setGarments] = useState<GarmentItem[]>(() => loadSavedGarments());
  const [activeId, setActiveId] = useState<string>(() => {
    const initial = loadSavedGarments();
    return loadActiveGarmentId(initial[0]?.id ?? '');
  });
  const [view, setView] = useState<AppView>('viewer');
  const [backdrop, setBackdrop] = useState<BackdropTheme>('concrete');
  const [language, setLanguage] = useState<Language>('en');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const viewportRef = useRef<GarmentViewportHandle>(null);

  const activeGarment = useMemo(
    () => garments.find((g) => g.id === activeId) ?? garments[0],
    [garments, activeId]
  );

  // Persist changes to localStorage
  useEffect(() => {
    saveGarments(garments);
  }, [garments]);

  useEffect(() => {
    if (activeGarment?.id) {
      saveActiveGarmentId(activeGarment.id);
    }
  }, [activeGarment?.id]);

  const handleUpdateGarment = (updated: GarmentItem) => {
    setGarments((prev) =>
      prev.map((g) => (g.id === updated.id ? updated : g))
    );
  };

  const handleSilhouetteChange = (silhouette: GarmentSilhouette) => {
    if (!activeGarment) return;
    handleUpdateGarment({
      ...activeGarment,
      silhouette,
      updatedAt: Date.now(),
    });
  };

  const handleCreateGarment = (newGarment: GarmentItem) => {
    setGarments((prev) => [newGarment, ...prev]);
    setActiveId(newGarment.id);
    setView('viewer');
  };

  const handleDuplicateGarment = () => {
    if (!activeGarment) return;
    const copy: GarmentItem = {
      ...activeGarment,
      id: `garment-${Date.now()}`,
      name: `${activeGarment.name} (Copy)`,
      sku: `${activeGarment.sku}-CPY`,
      updatedAt: Date.now(),
    };
    setGarments((prev) => [copy, ...prev]);
    setActiveId(copy.id);
  };

  const handleDeleteGarment = () => {
    if (!activeGarment || garments.length <= 1) return;
    const remaining = garments.filter((g) => g.id !== activeGarment.id);
    setGarments(remaining);
    setActiveId(remaining[0].id);
  };

  const t = TRANSLATIONS[language];

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F4F2] text-[#141413]">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="no-print h-[60px] bg-white border-b border-zinc-200 px-5 sm:px-6 flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setView('viewer');
          }}
          className="font-display text-lg font-bold tracking-tight text-zinc-950 whitespace-nowrap shrink-0"
        >
          ATELIER 360
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
          <button
            type="button"
            onClick={() => setView('viewer')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              view === 'viewer'
                ? 'text-zinc-950 border-zinc-950'
                : 'border-transparent hover:text-zinc-950'
            }`}
          >
            {t.navViewer}
          </button>
          <button
            type="button"
            onClick={() => setView('lookbook')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              view === 'lookbook'
                ? 'text-zinc-950 border-zinc-950'
                : 'border-transparent hover:text-zinc-950'
            }`}
          >
            {t.navLookbook}
          </button>
          <button
            type="button"
            onClick={() => setView('spec-sheet')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              view === 'spec-sheet'
                ? 'text-zinc-950 border-zinc-950'
                : 'border-transparent hover:text-zinc-950'
            }`}
          >
            {t.navSpecSheet}
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addGarment}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {view === 'viewer' && activeGarment && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_410px] xl:grid-cols-[1fr_440px] lg:h-[calc(100vh-60px)]">
            {/* Unobstructed 3D Garment Stage */}
            <section className="relative h-[58vh] min-h-[420px] lg:h-full">
              <GarmentViewport3D
                ref={viewportRef}
                garment={activeGarment}
                backdrop={backdrop}
                onBackdropChange={setBackdrop}
                onSilhouetteChange={handleSilhouetteChange}
                language={language}
              />
            </section>

            {/* Right Docked Details & Image Studio Inspector */}
            <div className="lg:h-full lg:overflow-hidden">
              <DetailsInspector
                garment={activeGarment}
                allGarments={garments}
                onChange={handleUpdateGarment}
                onSelectGarment={(id) => setActiveId(id)}
                onDuplicate={handleDuplicateGarment}
                onDelete={handleDeleteGarment}
                onOpenSpecSheet={() => setView('spec-sheet')}
                language={language}
                onToggleLanguage={() =>
                  setLanguage((l) => (l === 'en' ? 'mm' : 'en'))
                }
              />
            </div>
          </div>
        )}

        {view === 'lookbook' && (
          <div className="flex-1">
            <LookbookGrid
              garments={garments}
              activeId={activeGarment?.id ?? ''}
              onSelect={(id) => {
                setActiveId(id);
                setView('viewer');
              }}
              onAddNew={() => setIsAddModalOpen(true)}
              language={language}
            />
          </div>
        )}

        {view === 'spec-sheet' && activeGarment && (
          <div className="flex-1">
            <SpecSheetView
              garment={activeGarment}
              onBackToViewer={() => setView('viewer')}
              language={language}
            />
          </div>
        )}
      </main>

      {/* Add Custom Garment Modal */}
      <AddGarmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateGarment}
        language={language}
      />
    </div>
  );
}
