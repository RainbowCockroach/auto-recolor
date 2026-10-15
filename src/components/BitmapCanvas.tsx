import { useEffect, useRef, type MouseEvent } from 'react';

interface Props {
  bitmap: ImageBitmap | undefined;
  /** Keep hard pixel edges when the image is shown bigger than it is (pixel art). */
  pixelated?: boolean;
  title?: string;
  /** Called with the clicked position in the bitmap's own pixels. */
  onPick?: (x: number, y: number) => void;
}

export function BitmapCanvas({ bitmap, pixelated, title, onPick }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    // a closed bitmap has no size; its replacement is on the way
    if (!canvas || !bitmap?.width) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const cx = canvas.getContext('2d');
    if (!cx) return;
    cx.clearRect(0, 0, bitmap.width, bitmap.height);
    cx.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  const pick = onPick && ((e: MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onPick(Math.floor(((e.clientX - r.left) / r.width) * e.currentTarget.width),
           Math.floor(((e.clientY - r.top) / r.height) * e.currentTarget.height));
  });

  return (
    <canvas
      ref={ref}
      title={title}
      onClick={pick}
      className={onPick ? 'pickable' : undefined}
      style={{ imageRendering: pixelated ? 'pixelated' : 'auto' }}
      hidden={!bitmap}
    />
  );
}
