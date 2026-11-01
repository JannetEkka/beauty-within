# Devpost submission text (paste-ready)

**Project name:** Beauty Within

**Tagline:** Hair, clothes and one lip tint chosen from your own colours, tried on your own photo, with nothing retouched.

**Topic:** eCommerce VTO (with Skin AI)

**Try it out:** https://beauty-within.pages.dev
**Code:** https://github.com/JannetEkka/beauty-within (MIT)

---

## Inspiration

Every woman is already beautiful. A good haircut and the right lipstick go a long way, but confidence is what makes you shine. Most beauty try-on apps start by smoothing your skin and reshaping your face, so the "after" picture isn't really you. I wanted to start from the woman as she is and only show what suits her.

## What it does

Pick a sample portrait, take a photo with the camera, or upload one.

- **Camera.** YouCam's JS Camera Kit opens the camera and guides face position, size and lighting before it takes the photo.
- **Your colours.** The YouCam Facial Color Tones Analyzer measures skin, lip and eye colour, and the Face Analyzer reads face shape. Hair colour can be corrected with one tap, because YouCam's hair read was wrong on some photos.
- **One look, in layers.** Clothes, a hairstyle and a lip tint stack onto the same photo, in that order, and any of them can come off again.
  - **Clothes:** six colours picked from your undertone, the contrast between your skin and hair, and your eye and lip colour. Outfits from YouCam's clothes catalogue in those colours go on with AI Clothes.
  - **Hair:** styles from YouCam's hairstyle templates chosen for your face shape. AI Hairstyle keeps your own hair colour.
  - **Lip tint, the only makeup:** your own lip colour at exactly the same depth, with a touch of rose, pink or red. It never goes darker or lighter, so it works the same for a deep-skinned woman and a fair one. Makeup Virtual Try-On runs with skin smoothing set to 0.
- **Zoom to compare.** Tap any photo to open it full screen, tap again to zoom in on the lips or hair, and flip between "As you are" and "Your look" at the same zoom.
- **Care from within.** You can tell the app your diet (vegetarian, eggetarian, non-vegetarian, vegan), weight, water, sleep, activity and time in the sun, plus your own hair and skin concerns (hair fall, frizz, dandruff, dryness, breakouts and more). AI Skin Analysis shows what's already working first. Then each concern, and your lowest scan areas, get the nutrients involved, the published daily amounts for adult women (NIH Office of Dietary Supplements, National Academies), foods that fit your diet and a few habits, each with a source link. Protein comes as a gram figure from your weight. It's general information, not a prescription.

## Consumer and eCommerce value

For a shopper, every suggestion is something that suits her as she is: a lip shade matched to her own lips, a cut for her face shape, clothes in her colours. She sees each one on her real face before buying, which means fewer wrong-shade lipsticks and fewer returns. For a store, the same flow sits on top of its catalogue. The lip tint is a shade it can stock, and the outfit picks are its own products, ranked for this customer.

## How I built it

- React and TypeScript on the front end, with Cloudflare Pages Functions for the API, so the YouCam key stays on the server.
- YouCam APIs: AI Skin Analysis, Facial Color Tones Analyzer, Face Analyzer, AI Clothes (v4), AI Hairstyle (v2.1 transfer), Makeup Virtual Try-On, and the JS Camera Kit in the browser.
- A look is built layer by layer: each try-on runs on the previous result. Every prefix of layers is cached in Workers KV, so changing one layer only re-runs from there, and repeat views cost no API units.
- Colour maths in CIELAB with CIEDE2000, for lip depth, palette contrast and matching outfits to colours.
- Live calls stop below a unit floor, so the free units last through judging.
- 37 unit tests cover the colour maths, the response parsers, the care rules and the layer order.

## Challenges

- Reading undertone from hue alone called almost every deep skin tone "cool", because deep skin sits redder in colour space. The reading now adjusts for depth, and a test checks it.
- YouCam's hair-colour try-on brightened the whole photo, face and background included, not only the hair. I measured it (about 10 to 13 levels brighter on the cheek and background) and took hair colour out, since the point is not to change her face.
- The first lip tint was nearly invisible, and measuring lips before and after showed the makeup engine darkens them by about 5 L. I calibrated against the rendered lips on three skin tones: the colour sent is lifted so the result lands on her own lip depth (within about 2 L), with enough added colour to see, capped for lips that are already rich in colour.
- YouCam read two black-haired women as blonde, so the app lets you fix the hair colour.
- The sample faces score very high on skin, so Care from within shows each woman's lowest areas and whatever she asks about, instead of only scores under 60.

## What's next

- A store mode that loads a retailer's own lipstick and clothing catalogue and matches it with the same rules.
- Full-length photos, so dresses and trousers can be tried on whole.

## Built with

react, typescript, vite, cloudflare-pages, cloudflare-workers-kv, youcam-api

## Testing instructions

No login. Open https://beauty-within.pages.dev, pick one of the five sample portraits, and use the tabs: choose an outfit, a hairstyle and a lip tint, and they stack into one look. In Care, fill in About you to tailor the plan. Results for the sample portraits are cached. Your own photo (camera or upload) works too, limited to 3 per device per day to protect the free API units. The sample photos are YouCam's own API sample images, and no third-party brands appear anywhere.
