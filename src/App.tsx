import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS } from './engine/types';
import { canSaveToFolder, downloadZip, saveToFolder } from './export';
import { usePersistentState, usePreview, useThumbs } from './hooks';
import { loadImage, unloadImage, withHue, type LoadedImage } from './images';
import { defaultPalettes, outputsFor, readPalettes, readSettings, type Palette } from './model';
import { ImagesPanel } from './components/ImagesPanel';
import { OutputPanel } from './components/OutputPanel';
import { PalettesPanel } from './components/PalettesPanel';
import { PreviewPanel, type Background } from './components/PreviewPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { PRIORITY, pool } from './worker/pool';

const readBackground = (v: unknown): Background | null => (v === 'checker' || v === 'light' || v === 'dark' ? v : null);
const readColorId = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function App() {
  const [palettes, setPalettes] = usePersistentState('auto-recolor.palettes', readPalettes, defaultPalettes);
  const [settings, setSettings] = usePersistentState('auto-recolor.settings', readSettings, () => DEFAULT_SETTINGS);
  const [background, setBackground] = usePersistentState('auto-recolor.background', readBackground, (): Background => 'checker');
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedColorId, setSelectedColorId] = usePersistentState<string | null>('auto-recolor.selectedColor', readColorId, () => null);
  const [showMask, setShowMask] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<{ label: string; palettes: Palette[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const image = images.find(i => i.id === selectedImageId) ?? images[0] ?? null;
  const target = useMemo(() => {
    if (!image) {
      const palette = palettes.find(p => p.colors.some(c => c.id === selectedColorId)) ?? palettes[0];
      const color = palette?.colors.find(c => c.id === selectedColorId) ?? palette?.colors[0];
      return palette && color ? { palette, color, file: '' } : null;
    }
    const outs = outputsFor(image.folder, palettes);
    return outs.find(o => o.color.id === selectedColorId) ?? outs[0] ?? null;
  }, [image, palettes, selectedColorId]);

  const preview = usePreview(image, target?.color ?? null, settings, showMask);
  const thumbs = useThumbs(images, palettes, settings, image?.id ?? null);

  // ---------- images ----------
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files];
    const errors: string[] = [];
    const taken = images.map(i => i.folder);
    for (const [n, file] of list.entries()) {
      setStatus(`Loading ${n + 1} of ${list.length}…`);
      try {
        const img = await loadImage(file, taken);
        taken.push(img.folder);
        setImages(prev => [...prev, img]);
        setSelectedImageId(prev => prev ?? img.id);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    setStatus(errors.join(' '));
  }, [images]);

  const removeImage = (id: string) => {
    unloadImage(id);
    setImages(prev => prev.filter(i => i.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  const setPickedHue = (id: string, pickedHue: number | null) =>
    setImages(prev => prev.map(i => (i.id === id ? withHue({ ...i, pickedHue }) : i)));

  const pick = (x: number, y: number) => {
    if (!image) return;
    const id = image.id;
    pool.run(id, api => api.probe(id, x, y), { priority: PRIORITY.preview }).then(r => {
      if (r.ok && r.hue !== undefined) { setNote(''); setPickedHue(id, r.hue); }
      else setNote(r.reason === 'transparent' ? 'That spot is transparent. Click on the image itself.' : 'That pixel is almost grey. Click a more colorful spot.');
    }, e => console.error(e));
  };

  // ---------- palettes ----------
  const changePalettes = (next: Palette[], removed?: string) => {
    if (removed) setUndo({ label: removed, palettes });
    else setUndo(null);
    setPalettes(next);
  };

  // ---------- drag and drop anywhere ----------
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
    const enter = (e: DragEvent) => { if (hasFiles(e)) { e.preventDefault(); depth++; setDragging(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e) && --depth <= 0) { depth = 0; setDragging(false); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      void addFiles(e.dataTransfer!.files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [addFiles]);

  // ---------- export ----------
  const fileCount = images.length * palettes.reduce((n, p) => n + p.colors.length, 0);
  const progress = (done: number, total: number) => setStatus(`Saving ${done} of ${total}…`);
  const runExport = async (kind: 'zip' | 'folder') => {
    if (busy) return;
    setBusy(true);
    try {
      if (kind === 'zip') {
        const { count, name } = await downloadZip(images, palettes, settings, progress);
        setStatus(`Downloaded ${name} with ${count} files.`);
      } else {
        const result = await saveToFolder(images, palettes, settings, progress);
        setStatus(result ? `Saved ${result.count} files into ${result.name}/` : '');
      }
    } catch (e) {
      setStatus(`Saving stopped: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">Auto Recolor</div>
        <div className="export">
          <span className="status" role="status">
            {undo ? <>Removed {undo.label}. <button type="button" className="linkish" onClick={() => { setPalettes(undo.palettes); setUndo(null); }}>Undo</button></> : status}
          </span>
          {canSaveToFolder() && (
            <button type="button" className="btn" disabled={busy || !fileCount} onClick={() => void runExport('folder')}>Save to folder…</button>
          )}
          <button type="button" className="btn primary" disabled={busy || !fileCount} onClick={() => void runExport('zip')}>Download ZIP</button>
        </div>
      </header>

      <div className="layout" data-bg={background}>
        <aside className="side">
          <ImagesPanel images={images} selectedId={image?.id ?? null} onSelect={setSelectedImageId} onRemove={removeImage} onAdd={f => void addFiles(f)} />
          <PalettesPanel palettes={palettes} selectedColorId={target?.color.id ?? null} onSelectColor={setSelectedColorId} onChange={changePalettes} />
        </aside>
        <main className="main">
          <SettingsPanel settings={settings} onChange={setSettings} />
          <PreviewPanel image={image} target={target} preview={preview} settings={settings} showMask={showMask}
            background={background} note={note} onShowMask={setShowMask} onBackground={setBackground}
            onPick={pick} onResetPick={() => { if (image) { setNote(''); setPickedHue(image.id, null); } }} />
          <OutputPanel images={images} palettes={palettes} thumbs={thumbs} selectedImageId={image?.id ?? null}
            selectedColorId={target?.color.id ?? null}
            onSelect={(imageId, colorId) => { setSelectedImageId(imageId); setSelectedColorId(colorId); }} />
        </main>
      </div>
      {dragging && <div className="drop">Drop PNGs to add them</div>}
    </>
  );
}
