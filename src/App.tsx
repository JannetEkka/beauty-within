import { useEffect, useMemo, useRef, useState } from 'react';
import hairTemplates from '../fixtures/hair-templates.json';
import { buildLook, getCast, getStatus, makePortrait, openCameraKit, preparePhoto, type CastEntry, type Frame, type Look, type Status } from './api';
import {
  EMPTY_LIFESTYLE,
  HAIR_CONCERN_LABEL,
  SKIN_CONCERN_OPTIONS,
  skinStory,
  type Diet,
  type HairConcern,
  type Lifestyle,
} from './domain/care';
import { HAIR_BY_SHAPE, HAIR_SHADES, pickStyles, shadeFromName, withHair, type HairShade } from './domain/hair';
import { lipTints } from './domain/lip';
import { outfitById, pickOutfits } from './domain/outfits';
import { paletteFor, readPalette } from './domain/palette';
import type { Portrait } from './domain/types';

interface Current {
  portrait: Portrait;
  photo: string;
  /** Hair colour as she confirms it; YouCam's hair read is only a starting point. */
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
      {error && <div className="alert" role="alert">{error} <button className="link" onClick={() => setError(undefined)}>Dismiss</button></div>}
      {!current ? (
        <Start cast={cast} status={status} onPick={setCurrent} onError={setError} />
      ) : (
        <Studio key={current.portrait.id} current={current} onBack={() => setCurrent(undefined)} />
      )}
      <footer>
        <p>Powered by the YouCam API: AI Skin Analysis, AI Facial Color Tones Analyzer, AI Face Analyzer, AI Hairstyle, AI Clothes, AI Makeup Virtual Try-On and the JS Camera Kit. Skin smoothing is switched off on every makeup call, and nothing reshapes the face.</p>
        <p>Sample photos are YouCam’s own API samples. Food and nutrient notes are general information for adult women, not medical advice.</p>
      </footer>
    </div>
  );
}

function Start({ cast, status, onPick, onError }: { cast: CastEntry[]; status?: Status; onPick: (c: Current) => void; onError: (e?: string) => void }) {
  const [file, setFile] = useState<File>();
  const live = !!status?.live;
  return (
    <section className="start">
      <div>
        <h2>Choose a portrait</h2>
        <div className="cast">
          {cast.map((c) => (
            <button key={c.id} className="castcard" onClick={() => onPick({ portrait: c.portrait, photo: c.photo, hair: c.hair })} aria-label="Open this sample portrait">
              <img src={c.photo} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
      <div className="card own">
        <h2>Or use your own photo</h2>
        <p className="muted small">Chest up, facing the camera, in daylight. The camera guides you into place.</p>
        {!file && (
          <div className="row">
            <button className="primary" disabled={!live} onClick={() => openCameraKit(setFile, onError)}>Use my camera</button>
            <label className={`file ${live ? '' : 'disabled'}`}>
              Upload a photo
              <input type="file" accept="image/jpeg,image/png" disabled={!live} onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
            </label>
          </div>
        )}
        {status && !live && <p className="muted small">{status.reason ?? 'Live portraits are paused on this demo; the sample portraits work.'}</p>}
        <div id="YMK-module" />
        {file && <Framer file={file} onCancel={() => setFile(undefined)} onDone={onPick} onError={onError} />}
      </div>
    </section>
  );
}

function Framer({ file, onCancel, onDone, onError }: { file: File; onCancel: () => void; onDone: (c: Current) => void; onError: (e?: string) => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [frame, setFrame] = useState<Frame>({ cx: 0.5, cy: 0.38, size: 0.5 });
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
        <p className="small">Move the square so your face fills it.</p>
        <label>Left / right <input type="range" min={0.2} max={0.8} step={0.01} value={frame.cx} onChange={(e) => setFrame({ ...frame, cx: +e.target.value })} /></label>
        <label>Up / down <input type="range" min={0.15} max={0.7} step={0.01} value={frame.cy} onChange={(e) => setFrame({ ...frame, cy: +e.target.value })} /></label>
        <label>Size <input type="range" min={0.2} max={0.95} step={0.01} value={frame.size} onChange={(e) => setFrame({ ...frame, size: +e.target.value })} /></label>
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

const TABS = ['Colours', 'Lips', 'Hair', 'Clothes', 'Care'] as const;
type Tab = (typeof TABS)[number];

const LIFESTYLE_KEY = 'beauty-within:lifestyle';
function loadLifestyle(): Lifestyle {
  try {
    const raw = localStorage.getItem(LIFESTYLE_KEY);
    return raw ? { ...EMPTY_LIFESTYLE, ...JSON.parse(raw) } : EMPTY_LIFESTYLE;
  } catch {
    return EMPTY_LIFESTYLE;
  }
}

function Studio({ current, onBack }: { current: Current; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('Colours');
  const [hair, setHair] = useState<HairShade>(current.hair);
  const [look, setLook] = useState<Look>({});
  const [render, setRender] = useState<{ image?: string | null; busy?: boolean; error?: string }>({});
  const [life, setLife] = useState<Lifestyle>(loadLifestyle);
  const req = useRef(0);

  const p: Portrait = withHair(current.portrait, hair);
  const pal = readPalette(p);
  const story = skinStory(p, life);
  const tints = lipTints(p.tone.lip);
  const styles = pickStyles(p.faceShape, hairTemplates);
  const colours = paletteFor(p);
  const outfits = pickOutfits(colours);

  useEffect(() => {
    try {
      localStorage.setItem(LIFESTYLE_KEY, JSON.stringify(life));
    } catch {
      /* private mode: the form still works for this visit */
    }
  }, [life]);

  async function change(next: Look) {
    setLook(next);
    const id = ++req.current;
    setRender((r) => ({ image: r.image, busy: true }));
    try {
      const image = await buildLook(p.id, next);
      if (id === req.current) setRender({ image });
    } catch (e) {
      if (id === req.current) setRender({ error: String((e as Error).message) });
    }
  }
  const toggle = <K extends keyof Look>(k: K, v: Look[K]) => change({ ...look, [k]: look[k] === v ? undefined : v });

  const chips = [
    look.clothes && { k: 'clothes' as const, label: outfitById.get(look.clothes)?.title ?? 'Outfit' },
    look.hairStyle && { k: 'hairStyle' as const, label: hairTemplates.find((t) => t.id === look.hairStyle)?.title ?? 'Hairstyle' },
    look.lip && { k: 'lip' as const, label: `${look.lip} tint` },
  ].filter(Boolean) as { k: keyof Look; label: string }[];

  return (
    <section className="studio">
      <aside className="mirror card" aria-live="polite">
        <div className={`pair ${chips.length ? 'two' : ''}`}>
          <figure><img src={current.photo} alt="As you are" /><figcaption>As you are</figcaption></figure>
          {chips.length > 0 && (
            <figure>
              {render.image ? <img src={render.image} alt="Your look" className={render.busy ? 'dim' : ''} /> : <div className="ph">{render.busy ? 'Trying it on…' : ''}</div>}
              <figcaption>{render.busy ? 'Trying it on…' : 'Your look'}</figcaption>
            </figure>
          )}
        </div>
        {chips.length > 0 && (
          <div className="chips">
            {chips.map((c) => (
              <button key={c.k} className="chip on" onClick={() => change({ ...look, [c.k]: undefined })} aria-label={`Remove ${c.label}`}>{c.label} ×</button>
            ))}
          </div>
        )}
        {!chips.length && <p className="muted small">Pick an outfit, a hairstyle and a lip tint from the tabs. They layer into one look.</p>}
        {render.error && <p className="alert small">{render.error}</p>}
        <button className="link" onClick={onBack}>Choose another portrait</button>
      </aside>

      <div className="panel">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === 'Colours' && (
          <div className="card" role="tabpanel">
            <h2>Your colours</h2>
            <div className="tones">
              <span><Swatch hex={p.tone.skin} label="Skin" /> Skin</span>
              <span><Swatch hex={p.tone.lip} label="Lips" /> Lips</span>
              <span><Swatch hex={p.tone.eye} label="Eyes" /> Eyes{p.tone.eyeName ? `, ${p.tone.eyeName.toLowerCase()}` : ''}</span>
            </div>
            <label className="hairpick"><Swatch hex={HAIR_SHADES[hair]} label="Hair" /> Hair colour
              <select value={hair} onChange={(e) => setHair(e.target.value as HairShade)}>
                {(Object.keys(HAIR_SHADES) as HairShade[]).map((h) => <option key={h} value={h}>{h.toLowerCase()}</option>)}
              </select>
            </label>
            <p className="muted small">Fix the hair colour if it looks wrong; the clothes palette uses it.</p>
            <p>Your skin reads <b>{pal.undertone}</b>, with <b>{pal.contrast}</b> contrast against your hair{p.faceShape ? <>, and your face shape is <b>{p.faceShape === 'InvTriangle' ? 'inverted triangle' : p.faceShape.toLowerCase()}</b></> : null}. Every suggestion starts from these.</p>
            <div className="row"><button className="primary" onClick={() => setTab('Lips')}>Next: lips</button></div>
          </div>
        )}

        {tab === 'Lips' && (
          <div className="card" role="tabpanel">
            <h2>Lip tint</h2>
            <p className="small">Your own lip colour at exactly the same depth, with a touch of rose, pink or red. Never darker, never lighter, whatever your skin tone.</p>
            <div className="options">
              {tints.map((t) => (
                <button key={t.name} className={`option ${look.lip === t.name ? 'on' : ''}`} aria-pressed={look.lip === t.name} onClick={() => toggle('lip', t.name)}>
                  <Swatch hex={t.hex} size={36} /> <span><b>{t.name}</b><br /><span className="muted small">{t.note}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'Hair' && (
          <div className="card" role="tabpanel">
            <h2>Hair</h2>
            {p.faceShape && <p className="small"><b>{p.faceShape === 'InvTriangle' ? 'Inverted triangle' : p.faceShape} face.</b> {HAIR_BY_SHAPE[p.faceShape].line}</p>}
            <p className="muted small">Every style keeps your own hair colour.</p>
            <div className="options">
              {styles.map((t) => (
                <button key={t.id} className={`option ${look.hairStyle === t.id ? 'on' : ''}`} aria-pressed={look.hairStyle === t.id} onClick={() => toggle('hairStyle', t.id)}>
                  {t.thumb ? <img src={t.thumb} alt="" className="thumb" /> : null} <b>{t.title}</b>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'Clothes' && (
          <div className="card" role="tabpanel">
            <h2>Clothes in your colours</h2>
            <ul className="palette">
              {colours.map((c) => (
                <li key={c.name}><Swatch hex={c.hex} size={36} /> <span><b>{c.name}</b><br /><span className="muted small">{c.why}</span></span></li>
              ))}
            </ul>
            <h3>From the catalogue</h3>
            <div className="outfits">
              {outfits.map(({ outfit, colour }) => (
                <button key={outfit.id} className={`outfit ${look.clothes === outfit.id ? 'on' : ''}`} aria-pressed={look.clothes === outfit.id} onClick={() => toggle('clothes', outfit.id)}>
                  <img src={outfit.thumb} alt="" loading="lazy" />
                  <span><b>{outfit.title}</b><br /><span className="muted small">In {colour.name.toLowerCase()}, one of your colours</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'Care' && (
          <div className="care-tab">
            <AboutYou life={life} setLife={setLife} />
            <div className="card">
              <h2>What’s already working</h2>
              <ul className="strengths">
                {story.strengths.map((s) => <li key={s.concern}><b>{s.label}</b> <span className="muted">{s.score}/100</span></li>)}
              </ul>
            </div>
            <div className="card">
              <h2>Care from within</h2>
              <p className="muted small">From your scan and what you told us. Amounts are the published daily amounts for adult women (19–50), not a prescription. Ask a doctor or dietitian before taking supplements, especially if pregnant.</p>
              {story.notes.length > 0 && <ul className="notes">{story.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
              {story.care.map((c, i) => (
                <details key={c.key} className="care" open={i === 0}>
                  <summary><b>{c.label}</b> <span className="muted small">{c.why === 'you' ? 'you asked' : 'from your scan'}{c.score !== undefined ? ` · ${c.score}/100` : ''}</span></summary>
                  <table>
                    <thead><tr><th>Nutrient</th><th>Daily amount</th><th>Foods</th></tr></thead>
                    <tbody>
                      {c.nutrients.map(({ nutrient: n, amount, foods }) => (
                        <tr key={n.id}>
                          <td><b>{n.name}</b><br /><span className="muted small">{n.role}</span></td>
                          <td>{amount}</td>
                          <td>{foods.join(', ')}<br /><a className="small" href={n.source.url} target="_blank" rel="noreferrer">{n.source.label}</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ul className="habits">{c.habits.map((h) => <li key={h}>{h}</li>)}</ul>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function AboutYou({ life, setLife }: { life: Lifestyle; setLife: (l: Lifestyle) => void }) {
  const num = (v: string) => (v === '' ? undefined : Number(v));
  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  // Open on a first visit; once she has answered, it starts folded so the care plan is what she sees.
  const [open, setOpen] = useState(() => !life.diet && !life.hair.length && !life.skin.length);
  return (
    <div className="card about">
      <div className="about-head">
        <h2>About you <span className="muted small">(optional, stays on this device)</span></h2>
        <button className="link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Done' : 'Edit'}</button>
      </div>
      {!open && <p className="muted small">{[life.diet, life.weightKg && `${life.weightKg} kg`, ...life.hair.map((h) => HAIR_CONCERN_LABEL[h].toLowerCase()), ...life.skin.map((c) => SKIN_CONCERN_OPTIONS.find((o) => o.concern === c)?.label.toLowerCase())].filter(Boolean).join(' · ') || 'Tell us your diet, habits and concerns to tailor the care plan.'}</p>}
      {open && <>
      <div className="form">
        <label>Diet
          <select value={life.diet ?? ''} onChange={(e) => setLife({ ...life, diet: (e.target.value || undefined) as Diet | undefined })}>
            <option value="">Choose</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="eggetarian">Vegetarian + eggs</option>
            <option value="non-vegetarian">Non-vegetarian</option>
            <option value="vegan">Vegan</option>
          </select>
        </label>
        <label>Weight (kg)
          <input type="number" min={30} max={200} inputMode="numeric" value={life.weightKg ?? ''} onChange={(e) => setLife({ ...life, weightKg: num(e.target.value) })} />
        </label>
        <label>Water (glasses a day)
          <input type="number" min={0} max={20} inputMode="numeric" value={life.waterGlasses ?? ''} onChange={(e) => setLife({ ...life, waterGlasses: num(e.target.value) })} />
        </label>
        <label>Sleep (hours a night)
          <input type="number" min={0} max={14} inputMode="numeric" value={life.sleepHours ?? ''} onChange={(e) => setLife({ ...life, sleepHours: num(e.target.value) })} />
        </label>
        <label>Activity
          <select value={life.activity ?? ''} onChange={(e) => setLife({ ...life, activity: (e.target.value || undefined) as Lifestyle['activity'] })}>
            <option value="">Choose</option>
            <option>mostly sitting</option>
            <option>some exercise</option>
            <option>very active</option>
          </select>
        </label>
        <label>Sun
          <select value={life.sun ?? ''} onChange={(e) => setLife({ ...life, sun: (e.target.value || undefined) as Lifestyle['sun'] })}>
            <option value="">Choose</option>
            <option>mostly indoors</option>
            <option>some time outdoors</option>
            <option>outdoors a lot</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Your hair concerns</legend>
        <div className="chips">
          {(Object.keys(HAIR_CONCERN_LABEL) as HairConcern[]).map((h) => (
            <button key={h} className={`chip ${life.hair.includes(h) ? 'on' : ''}`} aria-pressed={life.hair.includes(h)} onClick={() => setLife({ ...life, hair: flip(life.hair, h) })}>{HAIR_CONCERN_LABEL[h]}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Your skin concerns</legend>
        <div className="chips">
          {SKIN_CONCERN_OPTIONS.map((o) => (
            <button key={o.concern} className={`chip ${life.skin.includes(o.concern) ? 'on' : ''}`} aria-pressed={life.skin.includes(o.concern)} onClick={() => setLife({ ...life, skin: flip(life.skin, o.concern) })}>{o.label}</button>
          ))}
        </div>
      </fieldset>
      </>}
    </div>
  );
}
