import { useEffect, useRef, type ReactNode } from 'react';
import { Eye, Info, RotateCcw, X } from 'lucide-react';
import { play } from '../sound';

// pictures made by scripts/guide-images.ts
const src = (name: string) => `${import.meta.env.BASE_URL}guide/${name}.png`;

interface FigProps { name: string; alt: string; value?: string; def?: boolean; note?: string }

function Fig({ name, alt, value, def, note }: FigProps) {
  return (
    <figure>
      <img src={src(name)} alt={alt} width={48} height={48} />
      {(value || note) && (
        <figcaption>
          {value && (def ? <span className="def">{value}</span> : value)}
          {note && <small>{note}</small>}
        </figcaption>
      )}
    </figure>
  );
}

const Tip = ({ children }: { children: ReactNode }) => <div className="tip"><Info size={20} /><span>{children}</span></div>;
const Kind = ({ children }: { children: ReactNode }) => <span className="kind">{children}</span>;

/** Full-screen explanation of the Tune tab, every control shown on the same sprite. */
export function Guide({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) { d.showModal(); play('open'); }
  }, []);

  return (
    <dialog ref={ref} className="guide" aria-label="Guide" onClose={onClose}>
      <button type="button" className="rb guide-close" data-sound="close" aria-label="Close" title="Close" onClick={() => ref.current?.close()}><X size={22} /></button>
      <div className="guide-inner">
        <header>
          <h1>What the Tune tab does</h1>
          <p className="lead">Auto Recolor finds the main color in your picture and repaints it in every palette color. The shading stays. Here is every control, shown on the same cupcake.</p>
        </header>

        <section className="card">
          <h2>The main color</h2>
          <p>The biggest colorful area in your picture. Here, the green scoop. Everything below changes that green and leaves the rest alone.</p>
          <div className="shelf five">
            <Fig name="original" alt="The original: a green scoop with yellow candies in a terracotta cup" value="Your picture" note="main color: green" />
            <Fig name="hero-pink" alt="Recolored pink" value="Pink" />
            <Fig name="hero-blue" alt="Recolored blue" value="Blue" />
            <Fig name="hero-navy" alt="Recolored navy" value="Navy" />
            <Fig name="hero-cream" alt="Recolored cream" value="Cream" />
          </div>
          <p className="note">Picked the wrong one? Tap the original, then tap the color you want. Or pick from the colors found in the image, at the top of Tune.</p>
        </section>

        <section className="card">
          <h2>Only the main color <Kind>switch</Kind></h2>
          <p>Should the other colors change too?</p>
          <div className="shelf two">
            <figure>
              <img src={src('scope-main')} alt="Only the scoop turned pink" width={48} height={48} />
              <figcaption><span className="sw" aria-hidden="true" /> On<small>only the scoop</small></figcaption>
            </figure>
            <figure>
              <img src={src('scope-whole')} alt="Scoop, cup and candies all turned pink; the grey rim stayed grey" width={48} height={48} />
              <figcaption><span className="sw off" aria-hidden="true" /> Off<small>cup and candies too</small></figcaption>
            </figure>
          </div>
          <Tip>Grey, white and black never change. The rim stays grey either way.</Tip>
        </section>

        <section className="card">
          <h2>Hue range <Kind>dial</Kind></h2>
          <p>How far a color can drift from the main color and still count. Mask view (<Eye size={16} className="inline-icon" aria-label="the eye button" />) shows it: color gets repainted, grey is left alone.</p>
          <div className="shelf">
            <Fig name="range-8-mask" alt="Mask at 8 degrees: only the middle green counts" value="±8°" note="too narrow: top and shadows left out" />
            <Fig name="range-25-mask" alt="Mask at 25 degrees: the whole scoop counts" value="±25°" def note="the whole scoop" />
            <Fig name="range-45-mask" alt="Mask at 45 degrees: the scoop and the candies count" value="±45°" note="candies come along" />
            <Fig name="range-8" alt="Result at 8 degrees: pink middle, green top and shadows" note="top and shadows stay green" />
            <Fig name="range-25" alt="Result at 25 degrees: pink scoop, yellow candies" note="all pink" />
            <Fig name="range-45" alt="Result at 45 degrees: pink scoop and pink candies" note="candies pink too" />
          </div>
          <Tip>Shadows or highlights left behind? <b>Turn it up.</b> A neighbor color got caught? <b>Turn it down.</b> Greyed out when the switch is off: everything counts anyway.</Tip>
        </section>

        <section className="card">
          <h2>Style <span className="kind modes">Natural · Legacy · Stylized</span></h2>
          <p>Three ways to put the new color on. On middle colors like blue they look about the same. Light and dark colors show the difference.</p>
          <div className="shelf">
            <div className="colhead">Natural</div><div className="colhead">Legacy</div><div className="colhead">Stylized</div>
            <div className="rowhead"><span className="dot" style={{ background: '#4f8fe0' }} />Blue</div>
            <Fig name="mode-natural-blue" alt="Natural, blue" />
            <Fig name="mode-legacy-blue" alt="Legacy, blue" />
            <Fig name="mode-stylized-blue" alt="Stylized, blue" />
            <div className="rowhead"><span className="dot" style={{ background: '#f2e6b0' }} />Cream</div>
            <Fig name="mode-natural-cream" alt="Natural, cream: shading stays" note="shading stays" />
            <Fig name="mode-legacy-cream" alt="Legacy, cream: flat and washed out" note="flat, washed out" />
            <Fig name="mode-stylized-cream" alt="Stylized, cream: dark warm shadows" note="dark warm shadows" />
            <div className="rowhead"><span className="dot" style={{ background: '#2c3a66' }} />Navy</div>
            <Fig name="mode-natural-navy" alt="Natural, navy: shading stays" note="shading stays" />
            <Fig name="mode-legacy-navy" alt="Legacy, navy: shadows squashed together" note="shadows squashed" />
            <Fig name="mode-stylized-navy" alt="Stylized, navy: cool shadows, warm light" note="cool shadows, warm light" />
          </div>
          <p><b>Natural</b> is a repaint by hand. Your shading stays as drawn: a shadow 30% darker stays 30% darker. Use this nearly always.</p>
          <p><b>Legacy</b> is the old Natural. Light colors go flat, dark colors squash the shadows. Only for matching files you exported before.</p>
          <p><b>Stylized</b> is a gradient map. Your shading colors are swapped for a ramp: cool dark shadows, your color, warm bright highlights. Poster-like.</p>
        </section>

        <section className="card">
          <h2>Strength <Kind>dial</Kind></h2>
          <p>Layer opacity. 100% is the full new color, 50% is halfway.</p>
          <div className="shelf">
            <Fig name="strength-100" alt="Strength 100%: fully blue" value="100%" def />
            <Fig name="strength-60" alt="Strength 60%: blue-green" value="60%" />
            <Fig name="strength-25" alt="Strength 25%: green with a hint of blue" value="25%" />
          </div>
          <Tip>Turn it down for a tint.</Tip>
        </section>

        <section className="card">
          <h2>Brightness <Kind>dial</Kind></h2>
          <p>How much of the new color's brightness the picture takes. Shown with cream, a very light color.</p>
          <div className="shelf">
            <Fig name="match-100" alt="Brightness 100%: as light as cream" value="100%" def note="exactly cream" />
            <Fig name="match-50" alt="Brightness 50%: halfway" value="50%" note="halfway" />
            <Fig name="match-0" alt="Brightness 0%: dark olive, as dark as the original green" value="0%" note="keeps the green's own darkness" />
          </div>
          <p className="note">At 0% only the hue changes. Not in Stylized.</p>
        </section>

        <section className="card">
          <h2>Hue variety <Kind>dial</Kind></h2>
          <p>Shading is rarely one hue. This scoop has yellow lights and teal shadows. This keeps that drift, flattens it or pushes it. Shown in orange, where it is easy to see.</p>
          <div className="shelf">
            <Fig name="variety-0" alt="Hue variety 0%: one flat orange" value="0%" note="one flat hue" />
            <Fig name="variety-100" alt="Hue variety 100%: yellow lights, red shadows" value="100%" def note="as drawn: yellow lights, red shadows" />
            <Fig name="variety-150" alt="Hue variety 150%: shadows go olive" value="150%" note="more" />
          </div>
          <Tip>It can only scale drift that is already there. One-hue shading? Then it does almost nothing. Not in Stylized, which has its own drift: Shadow shift.</Tip>
        </section>

        <section className="card">
          <h2>Saturation <Kind>dial</Kind></h2>
          <p>How vivid the new color is. 100% is the palette color as is.</p>
          <div className="shelf">
            <Fig name="sat-30" alt="Saturation 30%: dusty pink" value="30%" note="dusty" />
            <Fig name="sat-100" alt="Saturation 100%: the palette pink" value="100%" def />
            <Fig name="sat-160" alt="Saturation 160%: hot pink" value="160%" note="vivid" />
          </div>
          <p className="note">Not in Stylized.</p>
        </section>

        <section className="card">
          <h2>Contrast <Kind>dial</Kind></h2>
          <p>How strong the shading is. 100% is as drawn.</p>
          <div className="shelf">
            <Fig name="contrast-40" alt="Contrast 40%: soft shading" value="40%" note="soft" />
            <Fig name="contrast-100" alt="Contrast 100%: as drawn" value="100%" def note="as drawn" />
            <Fig name="contrast-160" alt="Contrast 160%: deep shadows, bright highlights" value="160%" note="punchy" />
          </div>
          <p className="note">Not in Legacy. In Stylized it sets how dark the shadows and how bright the highlights get.</p>
        </section>

        <section className="card">
          <h2>Shadow shift <Kind>dial</Kind></h2>
          <p>Stylized only. Shadows lean to blue, highlights to yellow, like sunlight. This is how far. Shown in orange.</p>
          <div className="shelf">
            <Fig name="shift-0" alt="Shadow shift 0 degrees: plain brown shadows" value="0°" note="just darker and lighter" />
            <Fig name="shift-10" alt="Shadow shift 10 degrees: shadows a little redder" value="10°" def note="a little" />
            <Fig name="shift-40" alt="Shadow shift 40 degrees: red shadows, yellow highlights" value="40°" note="red shadows, yellow lights" />
          </div>
          <Tip>Orange shadows lean through red on their way to blue. Blue shadows are already blue, so there the change is small.</Tip>
        </section>

        <section className="card">
          <h2>Going back</h2>
          <p>The <RotateCcw size={16} className="inline-icon" aria-label="Reset all" /> next to the style puts every dial back to the values marked <span className="def">like this</span>. Tap a dial for the big gauge; double-tap it to reset just that one.</p>
        </section>
      </div>
    </dialog>
  );
}
