// Ingredient guidance on the quiz result, sourced only from American Academy of Dermatology pages (accessed 2026-09-16).
// Generated from scratchpad quiz_ingredients_sourced.json (every quote checked as an exact match against its page).
// Excluded: facial-mask-only lists and statements scoped to a narrower group (darker skin tones, tweens, atopic
// dermatitis, excessively dry skin, while using a retinoid). Redness uses AAD's rosacea guidance and says so.
// Do not edit by hand: regenerate from the sourced file.
export type SourcedIngredient = { name: string; url: string; quote: string; caveat?: string | null };
export type IngredientGroups = { good: SourcedIngredient[]; watch: SourcedIngredient[]; avoid: SourcedIngredient[] };
export const AAD_INGREDIENTS: Record<string, IngredientGroups> = {
 "oily": {
  "good": [
   {
    "name": "oil free, noncomedogenic products",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "DO choose skin care products that are labeled “oil free” and “noncomedogenic.”",
    "caveat": null
   },
   {
    "name": "salicylic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "Ingredients like salicylic acid, glycolic acid, and lactic acid can help reduce oiliness, but they may be too harsh for your skin.",
    "caveat": "may be too harsh for your skin; the page says to stop or use it less often if skin becomes irritated"
   },
   {
    "name": "glycolic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "Ingredients like salicylic acid, glycolic acid, and lactic acid can help reduce oiliness, but they may be too harsh for your skin.",
    "caveat": "may be too harsh for your skin; the page says to stop or use it less often if skin becomes irritated"
   },
   {
    "name": "lactic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "Ingredients like salicylic acid, glycolic acid, and lactic acid can help reduce oiliness, but they may be too harsh for your skin.",
    "caveat": "may be too harsh for your skin; the page says to stop or use it less often if skin becomes irritated"
   },
   {
    "name": "gentle, foaming face wash",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "DO use a gentle, foaming face wash.",
    "caveat": null
   },
   {
    "name": "moisturizer",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "Although you have oily skin, it is still important to apply moisturizer to keep your skin hydrated.",
    "caveat": null
   },
   {
    "name": "sunscreen with zinc oxide and titanium dioxide",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "To prevent acne breakouts, look for sunscreens that contain zinc oxide and titanium dioxide, and do not use sunscreens that contain fragrance or oils.",
    "caveat": null
   },
   {
    "name": "oil-free, water-based makeup",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "DO choose oil-free, water-based makeup.",
    "caveat": null
   },
   {
    "name": "gel moisturizer (or skip moisturizer)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "Dr. Clark recommends considering skipping the moisturizer or opt for a gel, which is lighter than other types of moisturizer.",
    "caveat": null
   },
   {
    "name": "stronger chemical treatments or mechanical exfoliation",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Those with oily, thicker skin may want to use stronger chemical treatments or mechanical exfoliation.",
    "caveat": "next sentence: avoid strong chemical or mechanical exfoliation with a darker skin tone or dark spots after acne"
   }
  ],
  "watch": [],
  "avoid": [
   {
    "name": "oil-based cleansers",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "DON’T use oil-based or alcohol-based cleansers. These can irritate your skin.",
    "caveat": null
   },
   {
    "name": "alcohol-based cleansers",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "DON’T use oil-based or alcohol-based cleansers. These can irritate your skin.",
    "caveat": null
   },
   {
    "name": "sunscreens that contain fragrance or oils",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "To prevent acne breakouts, look for sunscreens that contain zinc oxide and titanium dioxide, and do not use sunscreens that contain fragrance or oils.",
    "caveat": null
   }
  ]
 },
 "dry": {
  "good": [
   {
    "name": "fragrance-free moisturizer",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "When you finish your shower or bath, gently pat your skin dry and immediately apply your fragrance-free moisturizer.",
    "caveat": null
   },
   {
    "name": "fragrance-free skin care products",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Dermatologists recommend using products labeled \"fragrance-free.\"",
    "caveat": null
   },
   {
    "name": "ointment or cream (rather than lotion)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Ointments and creams add more moisture to skin and are more effective than lotions.",
    "caveat": null
   },
   {
    "name": "jojoba oil",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Jojoba oil",
    "caveat": null
   },
   {
    "name": "dimethicone",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Dimethicone",
    "caveat": null
   },
   {
    "name": "glycerin",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Glycerin",
    "caveat": null
   },
   {
    "name": "hyaluronic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Hyaluronic acid",
    "caveat": null
   },
   {
    "name": "lactic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Lactic acid",
    "caveat": null
   },
   {
    "name": "lanolin",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Lanolin",
    "caveat": null
   },
   {
    "name": "mineral oil",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Mineral oil",
    "caveat": null
   },
   {
    "name": "petrolatum",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Petrolatum",
    "caveat": null
   },
   {
    "name": "shea butter",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Look for a cream or ointment that contains one or more of the following ingredients: Shea butter",
    "caveat": null
   },
   {
    "name": "ceramides",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "look for things such as ceramides, which are waxy lipid molecules that help hydrate skin, and hyaluronic acid, which is also known for its intense moisturizing qualities.",
    "caveat": null
   },
   {
    "name": "cream or ointment (skip lotion)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "So, somebody with dry skin is going to want to start with a cream or ointment and bypass lotions altogether.",
    "caveat": null
   },
   {
    "name": "hydrating cleanser",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s",
    "quote": "Dry skin does better with a hydrating cleanser.",
    "caveat": null
   },
   {
    "name": "mild chemical exfoliator",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Those with dry, sensitive or acne-prone skin may prefer just a washcloth and a mild chemical exfoliator, as mechanical exfoliation may be too irritating for this skin type.",
    "caveat": null
   }
  ],
  "watch": [
   {
    "name": "\"unscented\" products",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "If you see the word \"unscented,\" the product can contain chemicals that neutralize or hide the odors of other ingredients.",
    "caveat": "next sentence: these chemicals can irritate dry, sensitive skin"
   },
   {
    "name": "mechanical exfoliation",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Those with dry, sensitive or acne-prone skin may prefer just a washcloth and a mild chemical exfoliator, as mechanical exfoliation may be too irritating for this skin type.",
    "caveat": null
   },
   {
    "name": "exfoliating dry, peeling skin",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "people often make the mistake of exfoliating dry, peeling skin in the winter, further stripping it of moisture.",
    "caveat": null
   },
   {
    "name": "anti-itch creams",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Ask your dermatologist before using anti-itch creams and other skin care products",
    "caveat": null
   }
  ],
  "avoid": [
   {
    "name": "alcohol (except for hand sanitizer)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Dry skin? Stop using skin care products that contain any of the following: Alcohol (except for hand sanitizer)",
    "caveat": null
   },
   {
    "name": "fragrance, including deodorant soaps",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Dry skin? Stop using skin care products that contain any of the following: Fragrance, including deodorant soaps",
    "caveat": null
   },
   {
    "name": "retinoids",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Dry skin? Stop using skin care products that contain any of the following: Retinoids",
    "caveat": null
   },
   {
    "name": "alcohol",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "Avoid products with alcohol, alpha-hydroxy acid (AHA), and fragrance to help your skin retain its natural oils.",
    "caveat": null
   },
   {
    "name": "alpha-hydroxy acid (AHA)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "Avoid products with alcohol, alpha-hydroxy acid (AHA), and fragrance to help your skin retain its natural oils.",
    "caveat": null
   },
   {
    "name": "fragrance",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "She says to avoid items with fragrances, because they can be irritating to dry skin.",
    "caveat": null
   },
   {
    "name": "deodorant soaps",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Some skin care products, such as deodorant soaps, are too harsh for dry, sensitive skin.",
    "caveat": null
   }
  ]
 },
 "combination": {
  "good": [
   {
    "name": "moisturizer on the dry spots only",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "Dr. Kazin tells these patients to treat their face as though it’s two faces: moisturize the dry spots and skip the oily areas.",
    "caveat": null
   }
  ],
  "watch": [],
  "avoid": []
 },
 "normal": {
  "good": [
   {
    "name": "lotion",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "If you’re experiencing seasonal dryness in otherwise-normal skin, Dr. Clark says lotion is sufficient for most younger people.",
    "caveat": null
   },
   {
    "name": "cream-based moisturizer (perimenopausal, 50 and older)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "Dr. Kazin says that perimenopausal people and everyone 50 and older should be using a cream-based moisturizer.",
    "caveat": null
   }
  ],
  "watch": [],
  "avoid": []
 },
 "sensitive": {
  "good": [],
  "watch": [],
  "avoid": []
 },
 "modifier:sensitive": {
  "good": [
   {
    "name": "products labeled \"sensitive skin\"",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/selecting-anti-aging-products",
    "quote": "If you have sensitive skin, you want to see the words “sensitive skin” on the label.",
    "caveat": null
   },
   {
    "name": "mild chemical exfoliator",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Those with dry, sensitive or acne-prone skin may prefer just a washcloth and a mild chemical exfoliator, as mechanical exfoliation may be too irritating for this skin type.",
    "caveat": null
   }
  ],
  "watch": [
   {
    "name": "retinol",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/prevent-skin-problems/test-skin-care-products",
    "quote": "Keep in mind that some ingredients, such as retinol and glycolic acid, can irritate your skin, particularly if your skin is sensitive.",
    "caveat": "next sentence: this is normal and temporary"
   },
   {
    "name": "glycolic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/prevent-skin-problems/test-skin-care-products",
    "quote": "Keep in mind that some ingredients, such as retinol and glycolic acid, can irritate your skin, particularly if your skin is sensitive.",
    "caveat": "next sentence: this is normal and temporary"
   },
   {
    "name": "organic skin care lines",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "for people with sensitive skin, she cautions them away from organic skin care lines, because a lot of the ingredients can aggravate allergies.",
    "caveat": null
   },
   {
    "name": "mechanical exfoliation",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Those with dry, sensitive or acne-prone skin may prefer just a washcloth and a mild chemical exfoliator, as mechanical exfoliation may be too irritating for this skin type.",
    "caveat": null
   }
  ],
  "avoid": [
   {
    "name": "deodorant soaps",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/dermatologists-tips-relieve-dry-skin",
    "quote": "Some skin care products, such as deodorant soaps, are too harsh for dry, sensitive skin.",
    "caveat": null
   }
  ]
 },
 "concern:acne": {
  "good": [
   {
    "name": "adapalene",
    "url": "https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment",
    "quote": "Adapalene: A retinoid, this active ingredient helps to clear blackheads, whiteheads, and pimples.",
    "caveat": null
   },
   {
    "name": "azelaic acid",
    "url": "https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment",
    "quote": "Azelaic acid: It fights acne and can also fade the dark spots that appear when an acne spot clears.",
    "caveat": null
   },
   {
    "name": "benzoyl peroxide (start at 2.5%)",
    "url": "https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment",
    "quote": "Benzoyl peroxide: This acne-fighter is especially effective at treating mild pimples.",
    "caveat": null
   },
   {
    "name": "salicylic acid",
    "url": "https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment",
    "quote": "Salicylic acid: Because it unclogs pores and exfoliates the skin, salicylic acid works best on whiteheads and blackheads.",
    "caveat": null
   },
   {
    "name": "face wash with benzoyl peroxide or salicylic acid",
    "url": "https://www.aad.org/public/diseases/acne/DIY/types-breakouts",
    "quote": "try washing your face twice daily with an acne face wash that contains benzoyl peroxide or salicylic acid.",
    "caveat": null
   },
   {
    "name": "oil-free moisturizer",
    "url": "https://www.aad.org/public/diseases/acne/skin-care/moisturizer",
    "quote": "To prevent a moisturizer from causing breakouts, look for one of these descriptions on the container: Oil-free",
    "caveat": null
   },
   {
    "name": "non-comedogenic moisturizer",
    "url": "https://www.aad.org/public/diseases/acne/skin-care/moisturizer",
    "quote": "To prevent a moisturizer from causing breakouts, look for one of these descriptions on the container: Non-comedogenic",
    "caveat": null
   },
   {
    "name": "daily moisturizer while using benzoyl peroxide, salicylic acid or a retinoid",
    "url": "https://www.aad.org/public/diseases/acne/skin-care/moisturizer",
    "quote": "These treatments tend to dry and irritate the skin. Using a moisturizer every day can help your skin tolerate these medications.",
    "caveat": null
   },
   {
    "name": "non-acnegenic products",
    "url": "https://www.aad.org/public/diseases/acne/DIY/wont-clear",
    "quote": "Use skin care products and cosmetics that don’t cause acne. Non-acnegenic",
    "caveat": null
   },
   {
    "name": "mild cleanser that removes oil",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s",
    "quote": "“For example, if you have acne-prone skin, use a mild cleanser that removes oil.”",
    "caveat": null
   },
   {
    "name": "mild chemical exfoliator",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Those with dry, sensitive or acne-prone skin may prefer just a washcloth and a mild chemical exfoliator, as mechanical exfoliation may be too irritating for this skin type.",
    "caveat": null
   }
  ],
  "watch": [
   {
    "name": "benzoyl peroxide above 2.5%",
    "url": "https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment",
    "quote": "While you’ll find products that contain up to 10% benzoyl peroxide, it’s best to start with a product that contains 2.5%.",
    "caveat": null
   },
   {
    "name": "exfoliating while using retinol, a retinoid or benzoyl peroxide",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Exfoliating while using these products may worsen dry skin or even cause acne breakouts.",
    "caveat": null
   },
   {
    "name": "mechanical exfoliation",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Those with dry, sensitive or acne-prone skin may prefer just a washcloth and a mild chemical exfoliator, as mechanical exfoliation may be too irritating for this skin type.",
    "caveat": null
   }
  ],
  "avoid": [
   {
    "name": "toothpaste",
    "url": "https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment",
    "quote": "Keep your toothpaste for your teeth and rely on clinically proven acne-fighting ingredients like adapalene, benzoyl peroxide, and salicylic acid to treat your adult acne.",
    "caveat": null
   },
   {
    "name": "sunscreens that contain fragrance or oils",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/oily-skin",
    "quote": "To prevent acne breakouts, look for sunscreens that contain zinc oxide and titanium dioxide, and do not use sunscreens that contain fragrance or oils.",
    "caveat": null
   }
  ]
 },
 "concern:pigmentation": {
  "good": [
   {
    "name": "tinted sunscreen with iron oxide",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots",
    "quote": "To get the protection you need to prevent (and help clear) dark spots, use tinted sunscreen with iron oxide.",
    "caveat": null
   },
   {
    "name": "azelaic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots",
    "quote": "If you choose this option, use a product that contains one of the following ingredients: Azelaic acid",
    "caveat": null
   },
   {
    "name": "glycolic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots",
    "quote": "If you choose this option, use a product that contains one of the following ingredients: Glycolic acid",
    "caveat": null
   },
   {
    "name": "kojic acid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots",
    "quote": "If you choose this option, use a product that contains one of the following ingredients: Kojic acid",
    "caveat": null
   },
   {
    "name": "retinoid (retinol, tretinoin, adapalene gel, or tazarotene)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots",
    "quote": "If you choose this option, use a product that contains one of the following ingredients: Retinoid (retinol, tretinoin, adapalene gel, or tazarotene)",
    "caveat": null
   },
   {
    "name": "vitamin c",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots",
    "quote": "If you choose this option, use a product that contains one of the following ingredients: Vitamin C",
    "caveat": null
   },
   {
    "name": "retinol",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s",
    "quote": "If you’re looking to treat uneven skin tone, dark spots, or your skin’s texture, look for the word “retinol.”",
    "caveat": null
   },
   {
    "name": "gentle, fragrance-free skin care products",
    "url": "https://www.aad.org/public/diseases/a-z/melasma-self-care",
    "quote": "Choose gentle, fragrance-free skin care products.",
    "caveat": null
   },
   {
    "name": "products labeled \"for sensitive skin\" or \"fragrance-free\"",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots",
    "quote": "Products that are gentle on the skin are often labeled \"for sensitive skin.\" You may also see \"fragrance-free\" on the label.",
    "caveat": null
   }
  ],
  "watch": [
   {
    "name": "retinoids on skin of color",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol",
    "quote": "\"With skin of color, irritation can trigger dark marks, known as hyperpigmentation,\" she cautions.",
    "caveat": "next sentence: starting slowly and using moisturizer will help"
   }
  ],
  "avoid": [
   {
    "name": "strong chemical or mechanical exfoliation (darker skin tones, dark spots)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "avoid strong chemical or mechanical exfoliation if you have a darker skin tone or notice dark spots on your skin after burns, bug bites or acne breakouts.",
    "caveat": null
   },
   {
    "name": "unlisted steroids or mercury in imported fade products",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots",
    "quote": "Researchers have found steroids or mercury, which weren’t listed on the product’s label, in skin care products imported from other countries.",
    "caveat": null
   }
  ]
 },
 "concern:texture": {
  "good": [
   {
    "name": "retinol",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol",
    "quote": "Then there’s retinol, a type of retinoid that’s routinely used to improve uneven skin tone, pigmentation, and texture.",
    "caveat": null
   }
  ],
  "watch": [
   {
    "name": "over-exfoliation",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home",
    "quote": "Be careful not to over-exfoliate, as this could lead to skin that is red and irritated.",
    "caveat": null
   },
   {
    "name": "overused exfoliators",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s",
    "quote": "When overused, an exfoliator can damage the protective layer called the skin barrier.",
    "caveat": null
   }
  ],
  "avoid": []
 },
 "concern:redness": {
  "good": [
   {
    "name": "fragrance-free (rather than unscented) products",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "To reduce the likelihood of a product irritating your skin, choose fragrance-free (rather than unscented) products.",
    "caveat": null
   },
   {
    "name": "products made for sensitive skin and non-comedogenic",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "Select products that say they are made for sensitive skin and non-comedogenic (won’t clog pores).",
    "caveat": null
   },
   {
    "name": "cream instead of lotion or gel",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "Choose a cream instead of a lotion or gel.",
    "caveat": null
   },
   {
    "name": "fragrance-free sunscreen with zinc oxide and/or titanium dioxide",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/prevent",
    "quote": "A fragrance-free sunscreen that contains zinc oxide, titanium dioxide, or both is least likely to irritate your sensitive skin.",
    "caveat": null
   },
   {
    "name": "silicone sunscreen (dimethicone, cyclomethicone)",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "If you find that a sunscreen irritates your skin, look for a sunscreen that contains: Silicone (may be listed as silicone, dimethicone, orcyclomethicone, or cyclomethicone)",
    "caveat": null
   },
   {
    "name": "rosacea friendly moisturizer or barrier repair cream",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "Studies show that applying a rosacea friendly moisturizer or barrier repair cream can also improve the results you see from treatment.",
    "caveat": null
   },
   {
    "name": "mild, fragrance-free emollient before makeup",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/prevent",
    "quote": "Applying a mild, fragrance-free emollient to your skin before you apply makeup.",
    "caveat": null
   },
   {
    "name": "water-based or powder makeup",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "That’s why dermatologists often recommend water-based or powder makeup, which is less likely to irritate your skin.",
    "caveat": null
   },
   {
    "name": "green-tinted concealer",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "A green-tinted concealer can camouflage redness.",
    "caveat": null
   }
  ],
  "watch": [],
  "avoid": [
   {
    "name": "alcohol",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "dermatologists recommend that you avoid products that contain any of the following ingredients: Alcohol",
    "caveat": null
   },
   {
    "name": "camphor",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "dermatologists recommend that you avoid products that contain any of the following ingredients: Camphor",
    "caveat": null
   },
   {
    "name": "fragrance",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "dermatologists recommend that you avoid products that contain any of the following ingredients: Fragrance",
    "caveat": null
   },
   {
    "name": "glycolic acid",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "dermatologists recommend that you avoid products that contain any of the following ingredients: Glycolic acid",
    "caveat": null
   },
   {
    "name": "lactic acid",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "dermatologists recommend that you avoid products that contain any of the following ingredients: Lactic acid",
    "caveat": null
   },
   {
    "name": "menthol",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "dermatologists recommend that you avoid products that contain any of the following ingredients: Menthol",
    "caveat": null
   },
   {
    "name": "sodium lauryl sulfate (often found in shampoos and toothpaste)",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "dermatologists recommend that you avoid products that contain any of the following ingredients: Sodium lauryl sulfate (often found in shampoos and toothpaste)",
    "caveat": null
   },
   {
    "name": "urea",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "dermatologists recommend that you avoid products that contain any of the following ingredients: Urea",
    "caveat": null
   },
   {
    "name": "soap",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "Choose a mild, rosacea friendly cleanser (not soap).",
    "caveat": null
   },
   {
    "name": "menthol, camphor, sodium lauryl sulfate",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/prevent",
    "quote": "stop using ones that contain these common rosacea triggers — menthol, camphor, or sodium lauryl sulfate.",
    "caveat": null
   },
   {
    "name": "waterproof makeup",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/prevent",
    "quote": "You want to avoid: Waterproof makeup",
    "caveat": null
   },
   {
    "name": "heavy foundations",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/prevent",
    "quote": "You want to avoid: Heavy foundations that don’t spread easily or require makeup remover",
    "caveat": null
   },
   {
    "name": "retinoids (a lot of redness or inflammation)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol",
    "quote": "\"If someone has a lot of redness or inflammation in their skin, they should avoid retinoids and ask their dermatologist about other therapies",
    "caveat": null
   }
  ]
 },
 "concern:barrier": {
  "good": [
   {
    "name": "barrier repair cream",
    "url": "https://www.aad.org/public/diseases/rosacea/triggers/tips",
    "quote": "Studies show that applying a rosacea friendly moisturizer or barrier repair cream can also improve the results you see from treatment.",
    "caveat": null
   }
  ],
  "watch": [
   {
    "name": "overused exfoliators",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s",
    "quote": "When overused, an exfoliator can damage the protective layer called the skin barrier.",
    "caveat": null
   },
   {
    "name": "exfoliating masks",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/routine/facial-masks-and-skin-care",
    "quote": "“Especially exfoliating masks. If you use them too often or have very sensitive skin, they can cause irritation.”",
    "caveat": null
   }
  ],
  "avoid": []
 },
 "concern:aging": {
  "good": [
   {
    "name": "sunscreen and moisturizer",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/selecting-anti-aging-products",
    "quote": "Dermatologists agree that sunscreen and moisturizer are the two most-effective anti-aging products you can buy.",
    "caveat": null
   },
   {
    "name": "sunscreen",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/dry/pick-moisturizer",
    "quote": "“Besides protecting against skin cancer, sunscreen is the No. 1 anti-aging treatment we know of,” says Dr. Kazin.",
    "caveat": null
   },
   {
    "name": "retinoids",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol",
    "quote": "A skin product that contains retinoids is a good option for someone with mild acne, mild pigmentation irregularities, or mild fine lines and wrinkles",
    "caveat": null
   },
   {
    "name": "retinoid",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s",
    "quote": "It can treat mild fine lines and wrinkles, acne, and dark spots. It can also improve skin texture.",
    "caveat": null
   },
   {
    "name": "vitamin C",
    "url": "https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-in-your-20s",
    "quote": "Science shows that this ingredient can reduce skin aging and dark spots.",
    "caveat": null
   },
   {
    "name": "hypoallergenic",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/selecting-anti-aging-products",
    "quote": "Read product labels and select a product that offers all of the following: Hypoallergenic (The product can still cause an allergic reaction, but there is less risk)",
    "caveat": null
   },
   {
    "name": "non-comedogenic or non-acnegenic",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/selecting-anti-aging-products",
    "quote": "Read product labels and select a product that offers all of the following: Non-comedogenic or non-acnegenic (does not cause acne)",
    "caveat": null
   }
  ],
  "watch": [
   {
    "name": "more than one anti-aging product",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/selecting-anti-aging-products",
    "quote": "Using more than one anti-aging product in a few days or weeks can irritate the skin, making you look older",
    "caveat": null
   },
   {
    "name": "retinoids (start with the least-intense formula)",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol",
    "quote": "I advise them to use the least-intense retinoid formula they can find, and use it every other night to start, slowly building up,",
    "caveat": null
   },
   {
    "name": "products that sting or burn",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/wrinkle-remedies",
    "quote": "Stop using products that sting or burn unless prescribed by a dermatologist.",
    "caveat": null
   }
  ],
  "avoid": [
   {
    "name": "retinoids during pregnancy",
    "url": "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol",
    "quote": "Retinoids should not be used during pregnancy.",
    "caveat": null
   }
  ]
 }
};

// Combines the quiz's skin type, the sensitivity modifier and the main concern. An item AAD says to avoid for any of them
// is never also listed as good or watch (e.g. lactic acid and urea: good for dry skin, avoid with rosacea).
export function sourcedIngredients(skinType: string, sensitivity: boolean, concern: string): IngredientGroups & { rosacea: boolean } {
  const parts = [AAD_INGREDIENTS[skinType], sensitivity ? AAD_INGREDIENTS["modifier:sensitive"] : undefined, AAD_INGREDIENTS[`concern:${concern}`]].filter(Boolean) as IngredientGroups[];
  const pick = (g: keyof IngredientGroups) => {
    const seen = new Set<string>();
    const list: SourcedIngredient[] = [];
    for (const p of parts) for (const it of p[g]) { const k = it.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); list.push(it); } }
    return list;
  };
  const avoid = pick("avoid");
  const avoidNames = new Set(avoid.map((i) => i.name.toLowerCase()));
  const watch = pick("watch").filter((i) => !avoidNames.has(i.name.toLowerCase()));
  const watchNames = new Set(watch.map((i) => i.name.toLowerCase()));
  const good = pick("good").filter((i) => !avoidNames.has(i.name.toLowerCase()) && !watchNames.has(i.name.toLowerCase()));
  return { good, watch, avoid, rosacea: concern === "redness" };
}
