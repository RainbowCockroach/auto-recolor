// PNG in and out without going through a browser canvas. A canvas premultiplies alpha and
// may apply color management, which changes the colors of soft, semi-transparent edges.
import { decode, encode, type DecodedPng } from 'fast-png';
import type { Raster } from './types';

/** Unpacks 1/2/4-bit samples (packed per row) into one byte per sample. */
function unpackSamples(png: DecodedPng): Uint8Array | Uint16Array {
  const { width, height, channels, depth } = png;
  const data = png.data;
  if (depth >= 8) return data instanceof Uint8ClampedArray ? new Uint8Array(data.buffer, data.byteOffset, data.length) : data;
  const perRow = width * channels;
  const stride = Math.ceil((perRow * depth) / 8);
  const mask = (1 << depth) - 1;
  const out = new Uint8Array(perRow * height);
  for (let y = 0; y < height; y++) {
    for (let s = 0; s < perRow; s++) {
      const bit = s * depth;
      const byte = data[y * stride + (bit >> 3)] ?? 0;
      out[y * perRow + s] = (byte >> (8 - depth - (bit & 7))) & mask;
    }
  }
  return out;
}

export function decodePng(bytes: Uint8Array): Raster {
  const png = decode(bytes);
  const { width, height, channels, depth } = png;
  const n = width * height;
  const samples = unpackSamples(png);

  if (png.palette) {
    const out = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const entry = png.palette[samples[i] ?? 0];
      if (!entry) throw new Error('The image points to a palette color that does not exist.');
      out[i * 4] = entry[0] ?? 0;
      out[i * 4 + 1] = entry[1] ?? 0;
      out[i * 4 + 2] = entry[2] ?? 0;
      out[i * 4 + 3] = entry[3] ?? 255;
    }
    return { width, height, depth: 8, data: out };
  }

  const outDepth = depth === 16 ? 16 : 8;
  const max = outDepth === 16 ? 65535 : 255;
  const inMax = (1 << depth) - 1;
  // low-bit greyscale gets stretched to the full 8-bit range
  const scale = (v: number) => (depth < 8 ? Math.round((v * 255) / inMax) : v);
  const out = outDepth === 16 ? new Uint16Array(n * 4) : new Uint8Array(n * 4);
  const key = png.transparency; // tRNS: one grey value, or one RGB triple, that means "transparent"
  const s = (k: number) => samples[k] ?? 0;

  for (let i = 0; i < n; i++) {
    const p = i * channels, o = i * 4;
    let r: number, g: number, b: number, a: number;
    if (channels === 1 || channels === 2) {
      r = g = b = s(p);
      a = channels === 2 ? s(p + 1) : key && key.length === 1 && s(p) === key[0] ? 0 : inMax;
    } else {
      r = s(p); g = s(p + 1); b = s(p + 2);
      a = channels === 4 ? s(p + 3)
        : key && key.length === 3 && r === key[0] && g === key[1] && b === key[2] ? 0 : inMax;
    }
    out[o] = scale(r); out[o + 1] = scale(g); out[o + 2] = scale(b);
    out[o + 3] = a === inMax ? max : scale(a);
  }
  return { width, height, depth: outDepth, data: out };
}

export function encodePng(raster: Raster): Uint8Array {
  return encode({ width: raster.width, height: raster.height, data: raster.data, depth: raster.depth, channels: 4 });
}

/** 8-bit RGBA copy for showing on screen. */
export function toRgba8(raster: Raster): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(raster.data.length);
  if (raster.depth === 8) out.set(raster.data);
  else for (let i = 0; i < out.length; i++) out[i] = Math.round((raster.data[i] ?? 0) / 257);
  return out;
}
