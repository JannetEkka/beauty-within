import { useEffect, useMemo, useState } from 'react';
import { getCast, getStatus, makePortrait, preparePhoto, tryOn, type CastEntry, type Frame, type Status, type TryOn } from './api';
import { skinStory } from './domain/care';
import hairTemplates from '../fixtures/hair-templates.json';
import { HAIR_BY_SHAPE, HAIR_SHADES, hairColours, pickStyles, shadeFromName, withHair, type HairShade } from './domain/hair';
import { pickOutfits } from './domain/outfits';
import { lipTints } from './domain/lip';
import { paletteFor, readPalette } from './domain/palette';
import type { Portrait } from './domain/types';

interface Current {
  portrait: Portrait;
  photo: string;
  /** Hair colour as she confirms it; YouCam's hair read is a starting point. */
  hair: HairShade;
}

export default function App() {
  const [status, setStatus] = useState<Status>();
  const [cast, setCast] = useState<CastEntry[]>([]);
  const [current, setCurrent] = useState<Current>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    getStatus().then(setStatus).catch(() => setStatus({ live: false }));
    getCast().then(setCast).catch((e) => setError(String(e.message)));
  }, []);

  return (
    <div className="page">
      <header className="top">
        <h1>Beauty Within</h1>
        <p className="lede">You’re already beautiful. This finds the hair, the clothes and the one lip tint that show it, on your own photo, with nothing about your face retouched.</p>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      {!current ? (
        <Start cast={cast} status={status} onPick={setCurrent} onError={setError} />
      ) : (
        <PortraitView key={current.portrait.id} current={current} onBack={() => setCurrent(undefined)} />
      )}
      <footer>
        <p>Powered by the YouCam API: AI Skin Analysis, AI Facial Color Tones Analyzer, AI Face Analyzer, AI Hairstyle, AI Hair Color, AI Clothes and AI Makeup Virtual Try-On. Skin smoothing is switched off on every makeup call, and nothing reshapes the face.</p>
        <p>Sample photos are YouCam’s own API samples. Food and nutrient notes are general information for adult women, not medical advice.</p>
      </footer>
    </div>
  );
}

function Start({ cast, status, onPick, onError }: { cast: CastEntry[]; status?: Status; onPick: (c: Current) => void; onError: (e?: string) => void }) {
  const [file, setFile] = useState<File>();
  return (
    <section>
      <h2>Choose a portrait</h2>
      <div className="cast">
        {cast.map((c) => (
          <button key={c.id} className="castcard" onClick={() => onPick({ portrait: c.portrait, photo: c.photo, hair: c.hair })} aria-label="Open this sample portrait">
            <img src={c.photo} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="card own">
        <h2>Or use your own photo</h2>
        <p className="muted">From the chest up, facing the camera, in daylight. Then frame your face so it fills the square.</p>
        {!file && (
          <label className={`primary file ${status?.live ? '' : 'disabled'}`}>
            Choose a photo
            <input type="file" accept="image/jpeg,image/png" disabled={!status?.live} onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
          </label>
        )}
        {status && !status.live && <p className="muted small">{status.reason ?? 'Live portraits are paused on this demo; the sample portraits work.'}</p>}
        {file && <Framer file={file} onCancel={() => setFile(undefined)} onDone={onPick} onError={onError} />}
      </div>
    </section>
  );
}

function Framer({ file, onCancel, onDone, onError }: { file: File; onCancel: () => void; onDone: (c: Current) => void; onError: (e?: string) => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [frame, setFrame] = useState<Frame>({ cx: 0.5, cy: 0.33, size: 0.4 });
  const [busy, setBusy] = useState(false);
  async function go() {
    onError(undefined);
    setBusy(true);
    try {
      const { photo, face } = await preparePhoto(file, frame);
      const r = await makePortrait(photo, face);
      onDone({ portrait: r.portrait, photo: r.photo, hair: shadeFromName(r.portrait.tone.hairName) ?? 'Black' });
    } catch (e) {
      onError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="framer">
      <div className="frame-wrap">
        <img src={url} alt="Your photo" />
        <div className="frame-box" style={{ left: `${(frame.cx - frame.size / 2) * 100}%`, top: `${(frame.cy - frame.size / 2) * 100}%`, width: `${frame.size * 100}%`, aspectRatio: '1' }} />
      </div>
      <div className="sliders">
        <label>Left / right <input type="range" min={0.2} max={0.8} step={0.01} value={frame.cx} onChange={(e) => setFrame({ ...frame, cx: +e.target.value })} /></label>
        <label>Up / down <input type="range" min={0.15} max={0.7} step={0.01} value={frame.cy} onChange={(e) => setFrame({ ...frame, cy: +e.target.value })} /></label>
        <label>Size <input type="range" min={0.2} max={0.9} step={0.01} value={frame.size} onChange={(e) => setFrame({ ...frame, size: +e.target.value })} /></label>
        <div className="row">
          <button className="primary" onClick={go} disabled={busy}>{busy ? 'Reading your colours…' : 'Read my colours'}</button>
          <button onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Swatch({ hex, size = 28, label }: { hex?: string; size?: number; label?: string }) {
  if (!hex) return null;
  return <span className="swatch" style={{ background: hex, width: size, height: size }} title={label ?? hex} aria-label={label ?? hex} role="img" />;
}

function PortraitView({ current, onBack }: { current: Current; onBack: () => void }) {
  const { photo } = current;
  const [hair, setHair] = useState<HairShade>(current.hair);
  const [shot, setShot] = useState<{ label: string; image?: string; busy?: boolean; error?: string }>();
  // Her colours with the hair colour she confirmed.
  const p: Portrait = withHair(current.portrait, hair);
  const youcamHair = current.portrait.tone.hairName;

  const pal = readPalette(p);
  const story = skinStory(p);
  const tints = lipTints(p.tone.lip);
  const styles = pickStyles(p.faceShape, hairTemplates);
  const shades = hairColours(HAIR_SHADES[hair]);
  const colours = paletteFor(p);
  const outfits = pickOutfits(colours);

  async function run(label: string, t: TryOn) {
    setShot({ label, busy: true });
    try {
      setShot({ label, image: await tryOn(p.id, t) });
    } catch (e) {
      setShot({ label, error: String((e as Error).message) });
    }
  }

  return (
    <section className="portrait">
      <aside className="mirror card">
        <div className="pair">
          <figure><img src={photo} alt="As you are" /><figcaption>As you are</figcaption></figure>
          {shot && (
            <figure>
              {shot.image ? <img src={shot.image} alt={shot.label} /> : <div className="ph">{shot.busy ? 'Trying it on…' : ''}</div>}
              <figcaption>{shot.label}</figcaption>
            </figure>
          )}
        </div>
        {shot?.error && <p className="alert small">{shot.error}</p>}
        <button className="link" onClick={onBack}>Choose another portrait</button>
      </aside>

      <div className="details">
        <div className="card">
          <h2>Your colours</h2>
          <div className="tones">
            <span><Swatch hex={p.tone.skin} label="Skin" /> Skin</span>
            <span><Swatch hex={p.tone.lip} label="Lips" /> Lips</span>
            <span><Swatch hex={p.tone.eye} label="Eyes" /> Eyes{p.tone.eyeName ? `, ${p.tone.eyeName.toLowerCase()}` : ''}</span>
            <label className="hairpick"><Swatch hex={p.tone.hair} label="Hair" /> Hair{' '}
              <select value={hair} onChange={(e) => setHair(e.target.value as HairShade)} aria-label="Your hair colour">
                {(Object.keys(HAIR_SHADES) as HairShade[]).map((h) => <option key={h} value={h}>{h.toLowerCase()}</option>)}
              </select>
            </label>
          </div>
          {youcamHair !== hair && <p className="muted small">YouCam read your hair as {youcamHair ? youcamHair.toLowerCase() : 'unclear'}; change it above if that's not right.</p>}
          <p className="small">Your skin reads <b>{pal.undertone}</b>, with <b>{pal.contrast}</b> contrast against your hair. Everything below starts from these colours.</p>
        </div>

        <div className="card">
          <h2>Lip tint</h2>
          <p className="small">Your own lip colour at the same depth, with a touch of rose, pink or red. Never darker, never lighter.</p>
          <div className="options">
            {tints.map((t) => (
              <button key={t.name} className="option" onClick={() => run(`${t.name} tint`, { kind: 'lip', tint: t.name })}>
                <Swatch hex={t.hex} size={36} /> <span><b>{t.name}</b><br /><span className="muted small">{t.note}</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Hair</h2>
          {p.faceShape && <p className="small"><b>{p.faceShape === 'InvTriangle' ? 'Inverted triangle' : p.faceShape} face.</b> {HAIR_BY_SHAPE[p.faceShape].line}</p>}
          <div className="options">
            {styles.map((t) => (
              <button key={t.id} className="option" onClick={() => run(t.title, { kind: 'hairStyle', templateId: t.id })}>
                {t.thumb ? <img src={t.thumb} alt="" className="thumb" /> : null} <b>{t.title}</b>
              </button>
            ))}
          </div>
          <h3>Colour, kept close to yours</h3>
          <div className="options">
            {shades.map((c, i) => (
              <button key={c.name} className="option" onClick={() => run(c.name, { kind: 'hairColour', option: i, hair })}>
                <Swatch hex={c.hex} size={36} /> <span><b>{c.name}</b><br /><span className="muted small">{c.note}</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Clothes in your colours</h2>
          <ul className="palette">
            {colours.map((c) => (
              <li key={c.name}><Swatch hex={c.hex} size={40} /> <span><b>{c.name}</b><br /><span className="muted small">{c.why}</span></span></li>
            ))}
          </ul>
          <h3>Try on, from the catalogue</h3>
          <div className="outfits">
            {outfits.map(({ outfit, colour }) => (
              <button key={outfit.id} className="outfit" onClick={() => run(outfit.title, { kind: 'clothes', outfitId: outfit.id })}>
                <img src={outfit.thumb} alt="" loading="lazy" />
                <span><b>{outfit.title}</b><br /><span className="muted small">In {colour.name.toLowerCase()}, one of your colours</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>What’s already working</h2>
          <ul className="strengths">
            {story.strengths.map((s) => <li key={s.concern}><b>{s.label}</b> <span className="muted">{s.score}/100</span></li>)}
          </ul>
          {!!story.care.length && (
            <>
              <h2>Care from within</h2>
              <p className="muted small">A few areas your skin would welcome some care, with food and habits. Amounts are the published daily amounts for adult women (19–50), not a prescription. Ask a doctor or dietitian before taking supplements, especially if pregnant.</p>
              {story.care.map((c) => (
                <details key={c.concern} className="care">
                  <summary><b>{c.label}</b> <span className="muted small">{c.score}/100</span></summary>
                  <table>
                    <thead><tr><th>Nutrient</th><th>Daily amount</th><th>Foods</th></tr></thead>
                    <tbody>
                      {c.nutrients.map((n) => (
                        <tr key={n.id}>
                          <td><b>{n.name}</b><br /><span className="muted small">{n.role}</span></td>
                          <td>{n.amount}</td>
                          <td>{n.foods.join(', ')}<br /><a className="small" href={n.source.url} target="_blank" rel="noreferrer">{n.source.label}</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ul className="habits">{c.habits.map((h) => <li key={h}>{h}</li>)}</ul>
                </details>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
