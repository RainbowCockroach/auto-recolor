import { describe, expect, it } from 'vitest';
import { pixelAt } from '../src/components/BitmapCanvas';

describe('pixelAt', () => {
  // a 48×48 sprite in a tall 340×590 box: drawn 340×340, with 125px empty bands above and below
  const box = { left: 0, top: 0, width: 340, height: 590 };

  it('finds the pixel inside a letterboxed picture', () => {
    expect(pixelAt(box, 48, 48, 1, 125 + 1)).toEqual([0, 0]);
    expect(pixelAt(box, 48, 48, 339, 125 + 339)).toEqual([47, 47]);
  });

  it('gives positions outside the picture for taps on the empty bands', () => {
    expect(pixelAt(box, 48, 48, 170, 20)[1]).toBeLessThan(0);
    expect(pixelAt(box, 48, 48, 170, 580)[1]).toBeGreaterThanOrEqual(48);
  });
});
