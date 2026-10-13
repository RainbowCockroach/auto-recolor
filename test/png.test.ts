import { describe, expect, test } from 'vitest';
import { encode } from 'fast-png';
import { zlibSync } from 'fflate';
import { decodePng, encodePng, toRgba8 } from '../src/engine/png';

// ---- tiny hand-made PNG writer for fixtures ----
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: number[]) => (bytes.reduce((c, b) => CRC[(c ^ b) & 0xff]! ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;
const u32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
function chunk(type: string, data: number[]): number[] {
  const body = [...type].map(ch => ch.charCodeAt(0)).concat(data);
  return [...u32(data.length), ...body, ...u32(crc32(body))];
}
const buildPng = (chunks: number[][]) => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...chunks.flat()]);

describe('png', () => {
  test('8-bit RGBA round-trips exactly, including semi-transparent pixels', () => {
    const data = new Uint8Array([255, 0, 0, 255, 10, 200, 30, 7, 0, 0, 0, 0, 1, 2, 3, 128]);
    const raster = decodePng(encodePng({ width: 2, height: 2, depth: 8, data }));
    expect(raster.depth).toBe(8);
    expect(Array.from(raster.data)).toEqual(Array.from(data));
  });

  test('16-bit stays 16-bit', () => {
    const data = new Uint16Array([65535, 1, 300, 65535, 12345, 54321, 2, 100]);
    const raster = decodePng(encodePng({ width: 2, height: 1, depth: 16, data }));
    expect(raster.depth).toBe(16);
    expect(Array.from(raster.data)).toEqual(Array.from(data));
    expect(Array.from(toRgba8(raster).slice(0, 4))).toEqual([255, 0, 1, 255]);
  });

  test('RGB without alpha becomes opaque RGBA', () => {
    const bytes = encode({ width: 2, height: 1, depth: 8, channels: 3, data: new Uint8Array([1, 2, 3, 4, 5, 6]) });
    expect(Array.from(decodePng(bytes).data)).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
  });

  test('grey + alpha is expanded to RGBA', () => {
    const bytes = encode({ width: 2, height: 1, depth: 8, channels: 2, data: new Uint8Array([50, 255, 200, 0]) });
    expect(Array.from(decodePng(bytes).data)).toEqual([50, 50, 50, 255, 200, 200, 200, 0]);
  });

  test('palette images with transparency are expanded to RGBA', () => {
    // Built by hand: fast-png 8.0.0's encoder drops the first tRNS entry, so it can't make this fixture.
    const bytes = buildPng([
      chunk('IHDR', [0, 0, 0, 3, 0, 0, 0, 1, 8, 3, 0, 0, 0]), // 3×1, 8-bit, palette
      chunk('PLTE', [255, 0, 0, 0, 255, 0, 0, 0, 255]),
      chunk('tRNS', [255, 128, 0]),
      chunk('IDAT', Array.from(zlibSync(new Uint8Array([0, 0, 1, 2])))), // filter byte + 3 indexes
      chunk('IEND', []),
    ]);
    expect(Array.from(decodePng(bytes).data)).toEqual([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0]);
  });

  test('RGB with a tRNS key color makes exactly that color transparent', () => {
    // 3 pixels wide: fast-png 8.0.0 wrongly rejects RGB tRNS on images with fewer than 3 pixels
    const bytes = buildPng([
      chunk('IHDR', [0, 0, 0, 3, 0, 0, 0, 1, 8, 2, 0, 0, 0]), // 3×1, 8-bit, RGB
      chunk('tRNS', [0, 9, 0, 9, 0, 9]),
      chunk('IDAT', Array.from(zlibSync(new Uint8Array([0, 9, 9, 9, 9, 9, 8, 1, 2, 3])))),
      chunk('IEND', []),
    ]);
    expect(Array.from(decodePng(bytes).data)).toEqual([9, 9, 9, 0, 9, 9, 8, 255, 1, 2, 3, 255]);
  });

  test('1-bit greyscale is unpacked and stretched to 8-bit', () => {
    // 10 pixels wide so rows don't end on a byte boundary
    const row = [0b10100000, 0b01000000];
    const bytes = encode({ width: 10, height: 2, depth: 1, channels: 1, data: new Uint8Array([...row, ...row]) });
    const r = decodePng(bytes);
    const greys = Array.from({ length: 20 }, (_, i) => r.data[i * 4]);
    const expected = [255, 0, 255, 0, 0, 0, 0, 0, 0, 255];
    expect(greys).toEqual([...expected, ...expected]);
  });
});
