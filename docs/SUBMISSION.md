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

Pick a sample portrait, or upload a chest-up photo and frame your face.

- **Your colours.** The YouCam Facial Color Tones Analyzer measures skin, lip and eye colour, and the Face Analyzer reads face shape. Hair colour can be corrected with one tap, because the hair read was wrong on some photos.
- **Lip tint, the only makeup.** Your own lip colour at exactly the same depth, with a touch of rose, pink or red. It never goes darker or lighter, so it works the same for a deep-skinned woman and a fair one. Makeup Virtual Try-On runs with skin smoothing set to 0.
- **Hair.** Three styles from YouCam's hairstyle templates, chosen for your face shape, each keeping your own hair colour. AI Hair Color adds shine or a soft glaze.
- **Clothes.** Six colours picked from your undertone, the contrast between your skin and hair, and your eye and lip colour. Outfits from YouCam's clothes catalogue in those colours go onto your photo with AI Clothes.
- **Skin.** AI Skin Analysis shows what's already working first. Care from within then covers your lowest areas with the nutrients involved, the published daily amounts for adult women (NIH Office of Dietary Supplements, National Academies), everyday foods and a few habits, each with a source link. It's general information, not a prescription.

## Consumer and eCommerce value

For a shopper, every suggestion is something that suits her as she is: a lip shade matched to her own lips, a cut for her face shape, clothes in her colours. She sees each one on her real face before buying, which means fewer wrong-shade lipsticks and fewer returns. For a store, the same flow sits on top of its catalogue. The lip tint is a shade it can stock, and the outfit picks are its own products, ranked for this customer.

## How I built it

- React and TypeScript on the front end, with Cloudflare Pages Functions for the API, so the YouCam key stays on the server.
- Seven YouCam APIs: AI Skin Analysis, Facial Color Tones Analyzer, Face Analyzer, Makeup Virtual Try-On, AI Hairstyle (v2.1 transfer), AI Hair Color and AI Clothes (v4).
- Colour maths in CIELAB with CIEDE2000, for lip depth, palette contrast and matching outfits to colours.
- Every YouCam result is cached in Workers KV by content hash, and live calls stop below a unit floor, so the free units last through judging.
- 32 unit tests cover the colour maths, the response parsers and the rules.

## Challenges

- Reading undertone from hue alone called almost every deep skin tone "cool", because deep skin sits redder in colour space. The reading now adjusts for depth, and a test checks it.
- YouCam read two black-haired women as blonde, so the app shows the read and lets you fix it.
- The sample faces score very high on skin, so Care from within shows each woman's lowest areas instead of only scores under 60.

## What's next

- A store mode that loads a retailer's own lipstick and clothing catalogue and matches it with the same rules.
- Full-length photos, so dresses and trousers can be tried on whole.

## Built with

react, typescript, vite, cloudflare-pages, cloudflare-workers-kv, youcam-api

## Testing instructions

No login. Open https://beauty-within.pages.dev, pick one of the five sample portraits and tap any lip tint, hairstyle, hair colour or outfit. Results for the sample portraits are cached. Your own photo works too, limited to 3 per device per day to protect the free API units. The sample photos are YouCam's own API sample images, and no third-party brands appear anywhere.
