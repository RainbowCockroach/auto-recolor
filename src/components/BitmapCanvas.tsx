import { useEffect, useRef, type MouseEvent } from 'react';

interface Props {
  bitmap: ImageBitmap | undefined;
  /** Keep hard pixel edges when the image is shown bigger than it is (pixel art). */
  pixelated?: boolean;
  title?: string;
  /** Called with the clicked position in the bitmap's own pixels. */
  onPick?: (x: number, y: number) => void;
}

type Box = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

/** The image pixel under a screen point. The picture is drawn with object-fit: contain, so it sits centered with empty bands around it. */
export function pixelAt(box: Box, width: number, height: number, clientX: number, clientY: number): [number, number] {
  const scale = Math.min(box.width / width, box.height / height);
  const left = box.left + (box.width - width * scale) / 2;
  const top = box.top + (box.height - height * scale) / 2;
  return [Math.floor((clientX - left) / scale), Math.floor((clientY - top) / scale)];
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
    const [x, y] = pixelAt(e.currentTarget.getBoundingClientRect(), e.currentTarget.width, e.currentTarget.height, e.clientX, e.clientY);
    onPick(x, y);
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
