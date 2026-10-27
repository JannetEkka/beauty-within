# Beauty Within

Every woman is already beautiful. A good hairstyle and the right lip colour go a long way, but confidence is what makes you shine. Beauty Within reads your own colours and face shape, then shows hair, clothes and one lip tint chosen from them, on your own photo. Nothing about your face is retouched.

Built for the YouCam API Skin AI & eCommerce VTO hackathon.

## What it does

- **Your colours:** the YouCam Facial Color Tones Analyzer measures skin, lips, eyes and hair. The undertone reading adjusts for skin depth, so deep skin isn't labelled "cool" just because it sits redder in colour space.
- **Lip tint, the only makeup:** your own lip colour at exactly the same depth, with a touch of rose, pink or red. It is never darker and never lighter, for every skin tone. Skin smoothing is set to 0 on every makeup call (the engine's default is 50).
- **Hair:** the Face Analyzer reads face shape, and hairstyle try-ons keep your own hair colour. Hair-colour options stay close to yours: shine, or a soft warm glaze.
- **Clothes:** wardrobe colours chosen from your undertone, the contrast between your skin and hair, and echoes of your eye and lip colour, then tried on with Clothes Virtual Try-On.
- **Skin, read kindly:** AI Skin Analysis shows what's already working first. For areas that could use care, it lists the nutrients involved, the published daily amounts for adult women, everyday foods and simple habits, with sources (NIH Office of Dietary Supplements, National Academies). This is general information, not a prescription.

## YouCam APIs and units

| API | Units |
|---|---|
| AI Skin Analysis (SD, 12 concerns) | 14 |
| AI Facial Color Tones Analyzer | 20 |
| AI Face Analyzer (face shape) | 10 |
| AI Makeup Virtual Try-On (lip tint) | 1 |
| AI Hair Color | 1 |
| AI Hairstyle (v2.1 transfer) | 2 |
| AI Clothes (v4) | 2 |

A full portrait costs 44 units, plus 1–2 per try-on. Results are cached by content hash, and live calls stop below `UNIT_FLOOR`.

## Sample portraits

The five sample portraits are YouCam's own API sample photos (plugins-media.makeupar.com), chosen for a range of skin tones and features. They're linked, not copied into this repo.

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
