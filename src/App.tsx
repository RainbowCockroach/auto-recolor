import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Download, FolderDown, Image as ImageIcon, LayoutGrid, Palette as PaletteIcon, SlidersHorizontal, Undo2 } from 'lucide-react';
import { DEFAULT_SETTINGS, type Settings } from './engine/types';
import { canSaveToFolder, downloadZip, saveBlob, saveToFolder } from './export';
import { usePersistentState, usePreview, useThumbs } from './hooks';
import { useHeld, useShortcuts } from './keys';
import { loadImage, unloadImage, withHue, type LoadedImage } from './images';
import { defaultPalettes, outputsFor, readPalettes, readSettings, readSettingsFile, settingsFile, type Palette } from './model';
import { ColorPicker } from './components/ColorPicker';
import { Drawer, type DrawerTab } from './components/Drawer';
import { Gauge } from './components/Gauge';
import { ImagesPanel } from './components/ImagesPanel';
import { KeysSheet } from './components/KeysSheet';
import { OutputPanel } from './components/OutputPanel';
import { PalettesPanel } from './components/PalettesPanel';
import { NEXT_BG, PreviewPanel, type Background } from './components/PreviewPanel';
import { SettingsPanel, tuneDials, type DialKey } from './components/SettingsPanel';
import { installSounds, play } from './sound';
import { PRIORITY, pool } from './worker/pool';

const readBackground = (v: unknown): Background | null => (v === 'checker' || v === 'light' || v === 'dark' ? v : null);
const readColorId = (v: unknown): string | null => (typeof v === 'string' ? v : null);

const WIDE = '(min-width: 900px)';
function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const change = () => setWide(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, []);
  return wide;
}

type Tab = 'images' | 'colors' | 'tune' | 'results';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function App() {
  const [palettes, setPalettes] = usePersistentState('auto-recolor.palettes', readPalettes, defaultPalettes);
  const [settings, setSettings] = usePersistentState('auto-recolor.settings', readSettings, () => DEFAULT_SETTINGS);
  const [background, setBackground] = usePersistentState('auto-recolor.background', readBackground, (): Background => 'checker');
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedColorId, setSelectedColorId] = usePersistentState<string | null>('auto-recolor.selectedColor', readColorId, () => null);
  const [showMask, setShowMask] = useState(false);
  const [status, setStatus] = useState('');
  const [undo, setUndo] = useState<{ label: string; palettes: Palette[]; settings?: Settings } | null>(null);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [tuning, setTuning] = useState<DialKey | null>(null);
  // bumped on each finished download, to replay the little star burst
  const [cheer, setCheer] = useState(0);
  const [drawerTab, setDrawerTab] = useState<Tab | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const peek = useHeld('c');
  const fileInput = useRef<HTMLInputElement>(null);
  const settingsInput = useRef<HTMLInputElement>(null);
  // folder names in use, shared by drops that load at the same time so two images never get the same folder
  const folders = useRef(new Set<string>());
  const wide = useWide();

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
  const thumbs = useThumbs(images, palettes, settings, image?.id ?? null, drawerTab === 'results');

  useEffect(() => installSounds(), []);

  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(0), 900);
    return () => clearTimeout(t);
  }, [cheer]);

  // when the gauge closes, focus goes back to the dial that opened it instead of the top of the page
  const lastDial = useRef<DialKey | null>(null);
  useEffect(() => {
    if (tuning) lastDial.current = tuning;
    else if (lastDial.current) {
      document.querySelector<HTMLElement>(`.dial[data-dial="${lastDial.current}"]`)?.focus({ preventScroll: true });
      lastDial.current = null;
    }
  }, [tuning]);

  // finished messages fade on their own; "…" ones stay until replaced
  useEffect(() => {
    if (!status || status.endsWith('…')) return;
    const t = setTimeout(() => setStatus(''), 5000);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);

  // ---------- images ----------
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files];
    const errors: string[] = [];
    for (const [n, file] of list.entries()) {
      setStatus(`Loading ${n + 1} of ${list.length}…`);
      try {
        const img = await loadImage(file, folders.current);
        setImages(prev => [...prev, img]);
        play('powerup');
        setSelectedImageId(prev => prev ?? img.id);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    if (errors.length) play('error');
    setStatus(errors.join(' '));
  }, []);

  const removeImage = (id: string) => {
    const img = images.find(i => i.id === id);
    if (img) {
      folders.current.delete(img.folder);
      img.full.close();
      img.thumb.close();
    }
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
      if (r.ok && r.hue !== undefined) { play('coin'); setPickedHue(id, r.hue); }
      else {
        play('error');
        setStatus(r.reason === 'transparent' ? 'That spot is transparent. Tap the image itself.' : 'That pixel is almost grey. Tap a more colorful spot.');
      }
    }, e => console.error(e));
  };

  // ---------- palettes ----------
  const changePalettes = (next: Palette[], removed?: string) => {
    if (removed) setUndo({ label: `Removed ${removed}`, palettes });
    else setUndo(null);
    setPalettes(next);
  };

  // ---------- settings file ----------
  const saveSettings = () => {
    saveBlob(new Blob([JSON.stringify(settingsFile(palettes, settings), null, 2)], { type: 'application/json' }), 'auto-recolor-settings.json');
    play('coin');
  };

  const loadSettings = async (file: File) => {
    let loaded = null;
    try { loaded = readSettingsFile(JSON.parse(await file.text())); } catch { /* not JSON */ }
    if (!loaded) {
      play('error');
      setStatus(`${file.name} isn't a settings file.`);
      return;
    }
    setUndo({ label: `Loaded ${file.name}`, palettes, settings });
    if (loaded.palettes) setPalettes(loaded.palettes);
    if (loaded.settings) setSettings(loaded.settings);
    play('powerup');
  };
  // the drop listener below is set up once, so it reaches the latest loadSettings through this
  const loadSettingsRef = useRef(loadSettings);
  useEffect(() => { loadSettingsRef.current = loadSettings; });

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
      const files = [...e.dataTransfer!.files];
      const isJson = (f: File) => f.type === 'application/json' || f.name.toLowerCase().endsWith('.json');
      files.filter(isJson).forEach(f => void loadSettingsRef.current(f));
      void addFiles(files.filter(f => !isJson(f)));
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
  const colorCount = palettes.reduce((n, p) => n + p.colors.length, 0);
  const fileCount = images.length * colorCount;
  const progress = (done: number, total: number) => setSaving({ done, total });
  const runExport = async (kind: 'zip' | 'folder') => {
    if (saving) return;
    setSaving({ done: 0, total: fileCount });
    try {
      if (kind === 'zip') {
        const { count, name } = await downloadZip(images, palettes, settings, progress);
        setStatus(`Downloaded ${name} with ${count} files.`);
        play('coin');
        setCheer(Date.now());
      } else {
        const result = await saveToFolder(images, palettes, settings, progress);
        setStatus(result ? `Saved ${result.count} files into ${result.name}/` : '');
        if (result) { play('coin'); setCheer(Date.now()); }
      }
    } catch (e) {
      play('error');
      setStatus(`Saving stopped: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(null);
    }
  };

  const imagesPanel = <ImagesPanel images={images} selectedId={image?.id ?? null} onSelect={setSelectedImageId} onRemove={removeImage} onAdd={f => void addFiles(f)} />;
  const tabs: DrawerTab<Tab>[] = [
    { id: 'images', label: 'Images', icon: <ImageIcon size={19} />, content: imagesPanel },
    { id: 'colors', label: 'Colors', icon: <PaletteIcon size={19} />, tall: true, content: (
      <PalettesPanel palettes={palettes} selectedColorId={target?.color.id ?? null} onSelectColor={setSelectedColorId} onChange={changePalettes} />
    ) },
    { id: 'tune', label: 'Tune', icon: <SlidersHorizontal size={19} />, content: (
      <SettingsPanel settings={settings} image={image} stats={preview?.stats} focus={tuning} inlineGauge={wide} onFocus={setTuning} onChange={setSettings}
        onPickHue={hue => { if (image) setPickedHue(image.id, hue); }}
        onSaveFile={saveSettings} onLoadFile={() => settingsInput.current?.click()} />
    ) },
    { id: 'results', label: 'Results', icon: <LayoutGrid size={19} />, content: (
      <OutputPanel images={images} palettes={palettes} thumbs={thumbs} selectedImageId={image?.id ?? null}
        selectedColorId={target?.color.id ?? null}
        onSelect={(imageId, colorId) => { setSelectedImageId(imageId); setSelectedColorId(colorId); }} />
    ) },
  ];

  const exportRow = (
    <div className="export">
      <button type="button" className="rb honey wide-pill" disabled={!!saving || !fileCount}
        aria-label={saving ? `Saving ${saving.done} of ${saving.total}` : `Download ZIP, ${fileCount} files`} title="Download ZIP" aria-keyshortcuts="Control+S Meta+S"
        onClick={() => void runExport('zip')}>
        <Download size={20} />{saving ? `${saving.done}/${saving.total}` : wide ? `Download ${fileCount}` : fileCount}
        {cheer > 0 && <span key={cheer} className="burst" aria-hidden="true">{Array.from({ length: 10 }, (_, n) => <i key={n} style={{ '--n': n } as CSSProperties} />)}</span>}
      </button>
      {canSaveToFolder() && (
        <button type="button" className="rb" disabled={!!saving || !fileCount} aria-label="Save to folder" title="Save to folder" aria-keyshortcuts="Control+Shift+S Meta+Shift+S"
          onClick={() => void runExport('folder')}>
          <FolderDown size={22} />
        </button>
      )}
      {wide && <span className="count">{plural(images.length, 'image')} × {plural(colorCount, 'color')}</span>}
      {saving && <span className="progress" style={{ width: `${(saving.done / Math.max(1, saving.total)) * 100}%` }} />}
    </div>
  );

  const dials = tuneDials(settings, setSettings);
  // phones show the gauge in its own sheet, with the drawer out of the way and the picture taller
  const sheetDial = wide ? undefined : dials.find(d => d.key === tuning);

  const message = undo ? undo.label : status;

  // ---------- keyboard ----------
  const stepImage = (d: number) => {
    if (images.length < 2 || !image) return;
    const i = images.indexOf(image);
    setSelectedImageId(images[(i + d + images.length) % images.length]!.id);
    play('select');
  };
  const stepColor = (d: number) => {
    const colors = palettes.flatMap(p => p.colors);
    if (colors.length < 2) return;
    const i = Math.max(0, colors.findIndex(c => c.id === target?.color.id));
    setSelectedColorId(colors[(i + d + colors.length) % colors.length]!.id);
    play('select');
  };
  const stepPalette = (d: number) => {
    if (palettes.length < 2) return;
    const i = Math.max(0, palettes.findIndex(p => p.id === target?.palette.id));
    setSelectedColorId(palettes[(i + d + palettes.length) % palettes.length]!.colors[0]!.id);
    play('select');
  };
  const restore = () => {
    if (!undo) return;
    setPalettes(undo.palettes);
    if (undo.settings) setSettings(undo.settings);
    setUndo(null);
  };
  useShortcuts({
    ArrowUp: () => stepImage(-1),
    ArrowDown: () => stepImage(1),
    ArrowLeft: () => stepColor(-1),
    ArrowRight: () => stepColor(1),
    'shift+ArrowLeft': () => stepPalette(-1),
    'shift+ArrowRight': () => stepPalette(1),
    m: () => { if (image) { setShowMask(!showMask); play(showMask ? 'off' : 'on'); } },
    b: () => { if (image) { setBackground(NEXT_BG[background]); play('select'); } },
    'mod+o': () => fileInput.current?.click(),
    'mod+s': () => { if (fileCount) void runExport('zip'); },
    'mod+shift+s': () => { if (fileCount && canSaveToFolder()) void runExport('folder'); },
    'mod+z': () => { if (!undo) return false; restore(); play('rewind'); },
    '?': () => setKeysOpen(true),
    Escape: () => (tuning ? setTuning(null) : false),
  });

  return (
    <div className={`app${wide ? ' wide' : ''}${sheetDial ? ' tuning' : ''}`}>
      {wide && <aside className="rail">{imagesPanel}</aside>}

      <main className="center">
        <PreviewPanel image={image} target={target} preview={preview} showMask={showMask} peek={peek} background={background}
          onShowMask={setShowMask} onBackground={setBackground} onPick={pick} onAddClick={() => fileInput.current?.click()}
          images={wide ? undefined : images} onSelectImage={setSelectedImageId} />

        {wide && exportRow}

        <ColorPicker palettes={palettes} selectedColorId={target?.color.id ?? null} onSelect={setSelectedColorId}
          actions={wide ? undefined : exportRow} />
      </main>

      <Drawer tabs={wide ? tabs.filter(t => t.id !== 'images') : tabs} wide={wide} initial="tune" away={!!sheetDial} onShow={setDrawerTab} />
      {sheetDial && (
        <section className="gauge-sheet" aria-label="Adjust">
          <Gauge dials={dials} active={sheetDial} onFocus={setTuning} onClose={() => setTuning(null)} />
        </section>
      )}

      {/* always on the page, so screen readers notice when the text changes */}
      <div className="sr-only" role="status">{message}</div>
      {message && (
        <div className="toast">
          <span>{message}</span>
          {undo && (
            <button type="button" className="rb sm" data-sound="rewind" aria-label="Undo" title="Undo" aria-keyshortcuts="Control+Z Meta+Z" onClick={restore}>
              <Undo2 size={19} />
            </button>
          )}
        </div>
      )}
      <input ref={fileInput} type="file" accept="image/png" multiple hidden
        onChange={e => { if (e.target.files?.length) void addFiles(e.target.files); e.target.value = ''; }} />
      <input ref={settingsInput} type="file" accept=".json,application/json" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) void loadSettings(f); e.target.value = ''; }} />
      {keysOpen && <KeysSheet onClose={() => setKeysOpen(false)} />}
      {dragging && <div className="drop-hint">Drop PNGs to add them</div>}
    </div>
  );
}
