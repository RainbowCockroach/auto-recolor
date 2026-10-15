import { useEffect, useRef, useState } from 'react';

export const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

/** Every shortcut, for the Keys sheet. `keys` are what to show; several mean "any of these". */
export const SHORTCUTS: { group: string; items: { keys: string[]; label: string }[] }[] = [
  { group: 'Browse', items: [
    { keys: ['←', '→'], label: 'Previous / next color' },
    { keys: ['⇧ ←', '⇧ →'], label: 'Previous / next palette' },
    { keys: ['↑', '↓'], label: 'Previous / next image' },
  ] },
  { group: 'Look', items: [
    { keys: ['C'], label: 'Hold to see the original' },
    { keys: ['F'], label: 'View big' },
    { keys: ['+', '−', '0'], label: 'Zoom in, out, fit (view big)' },
    { keys: ['M'], label: 'Show what gets recolored' },
    { keys: ['B'], label: 'Change background' },
    { keys: ['I'], label: 'Pick the color to replace' },
  ] },
  { group: 'Files', items: [
    { keys: [`${MOD} O`], label: 'Add PNGs' },
    { keys: [`${MOD} S`], label: 'Download ZIP' },
    { keys: [`${MOD} ⇧ S`], label: 'Save to folder' },
    { keys: [`${MOD} Z`], label: 'Undo' },
  ] },
  { group: 'Other', items: [
    { keys: ['Esc'], label: 'Close, cancel' },
    { keys: ['?'], label: 'These keys' },
  ] },
];

/** Combo name of a key press: "mod+shift+s", "ArrowUp", "shift+ArrowUp", "?", "f". */
function comboOf(e: KeyboardEvent) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  // shift is part of typing symbols like ? and +, so it only counts for letters and named keys
  const shift = e.shiftKey && (k.length > 1 || /[a-z]/.test(k));
  return `${e.ctrlKey || e.metaKey ? 'mod+' : ''}${shift ? 'shift+' : ''}${k}`;
}

/** Keys belong to whatever is being typed into, and to dialogs other than the image viewer. */
function ignored(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing || e.altKey) return true;
  const el = e.target instanceof HTMLElement ? e.target : null;
  if (!el) return false;
  if (el.isContentEditable || el.matches('input, textarea, select')) return true;
  const dialog = el.closest('dialog');
  return !!dialog && !dialog.classList.contains('viewer');
}

type Handler = (e: KeyboardEvent) => void | false;

/** Page-wide shortcuts. A handler returning false leaves the key alone (no preventDefault). */
export function useShortcuts(map: Record<string, Handler>, enabled = true) {
  const mapRef = useRef(map);
  useEffect(() => { mapRef.current = map; });
  useEffect(() => {
    if (!enabled) return;
    const down = (e: KeyboardEvent) => {
      if (ignored(e)) return;
      const run = mapRef.current[comboOf(e)];
      // holding an arrow keeps stepping; holding anything else does it once
      if (!run || (e.repeat && !e.key.startsWith('Arrow'))) return;
      if (run(e) !== false) e.preventDefault();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [enabled]);
}

/** True while `key` is held down (outside text fields). */
export function useHeld(key: string) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (comboOf(e) === key && !ignored(e)) setHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key.toLowerCase() === key) setHeld(false); };
    const off = () => setHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', off);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', off);
    };
  }, [key]);
  return held;
}
