# Beauty Within

Every woman is already beautiful. A good hairstyle and the right lip colour go a long way, but confidence is what makes you shine. Beauty Within reads your own colours and face shape, then shows hair, clothes and one lip tint chosen from them, on your own photo. Nothing about your face is retouched.

Built for the YouCam API Skin AI & eCommerce VTO hackathon.

**Live:** https://beauty-within.pages.dev · **Demo video:** [docs/beauty-within-demo.mp4](docs/beauty-within-demo.mp4) (captions burned in; [English .srt](docs/beauty-within-demo.en.srt)) · **Screenshots:** [docs/screenshots](docs/screenshots)

## What it does

- **Camera or upload:** YouCam's JS Camera Kit guides face position and lighting before it takes the photo.
- **Your colours:** the Facial Color Tones Analyzer measures skin, lips and eyes; the Face Analyzer reads face shape. The undertone reading adjusts for skin depth, so deep skin isn't labelled "cool" just because it sits redder in colour space. Hair colour can be corrected with one tap.
- **One look, in layers:** outfit, then hairstyle, then lip tint, each applied on the previous result (`/api/look`). Every prefix is cached in KV.
  - **Clothes:** wardrobe colours from undertone, skin-to-hair contrast and her eye and lip colour; outfits from YouCam's own clothes catalogue in those colours (menswear, a real fashion brand, national-team kits, costumes, swimwear and bottoms-only pieces are left out).
  - **Hair:** YouCam hairstyle templates matched to face shape, keeping her own hair colour.
  - **Lip tint, the only makeup:** her own lip colour at exactly the same depth, with a touch of rose, pink or red. Skin smoothing is set to 0 on every makeup call (the engine's default is 50).
- **Care from within:** About you (diet, weight, water, sleep, activity, sun, her own hair and skin concerns) plus AI Skin Analysis. Strengths first; then nutrients with published daily amounts for adult women, foods filtered by diet, and habits, with sources (NIH Office of Dietary Supplements, National Academies). General information, not a prescription.
- **Not included:** hair-colour try-on. YouCam's hair-colour call brightened the whole photo, face included.

## YouCam APIs and units

| API | Units |
|---|---|
| AI Skin Analysis (SD, 12 concerns) | 14 |
| AI Facial Color Tones Analyzer | 20 |
| AI Face Analyzer (face shape) | 10 |
| AI Makeup Virtual Try-On (lip tint) | 1 |
| AI Hairstyle (v2.1 transfer) | 2 |
| AI Clothes (v4) | 2 |

A full portrait costs 44 units, plus 1–2 per layer of a look. Results are cached by content hash, and live calls stop below `UNIT_FLOOR`.

## Sample portraits

The five sample portraits are YouCam's own API sample photos (plugins-media.makeupar.com), chosen for a range of skin tones and features. They're linked, not copied into this repo. Their readings are YouCam's real replies, recorded on 2026-11-01 (`fixtures/recorded/`). YouCam's hair-colour read was wrong or empty on four of the five, so the app lets the user correct it.

## Code

- `src/domain/`: colour maths (CIELAB, CIEDE2000), lip tints, palette, hair, care and response parsing, all with unit tests.
- `src/server/youcam.ts`: YouCam client (File API, tasks, polling, templates).
- `src/server/api.ts`: the app's API on Cloudflare Pages Functions, with a KV cache and a units floor.

## Run locally

```bash
npm install
npm test
npm run build
npx wrangler pages dev dist     # http://localhost:8788
```

Put a key in `.dev.vars` (`YOUCAM_HACK_API_KEY=...`) to use the live APIs.

## Deploy (Cloudflare Pages, free tier)

1. Run `npx wrangler kv namespace create CACHE` and put the id in `wrangler.toml`.
2. `npm run build && npx wrangler pages deploy dist`
3. `npx wrangler pages secret put YOUCAM_HACK_API_KEY`

## Licence

MIT
