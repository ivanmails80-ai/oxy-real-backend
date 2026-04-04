// Config centrale piani e prezzi OXY.
// TEST: limiti minimi e prezzi 0,10 € per verificare Stripe e limiti messaggi. Per produzione ripristinare: DAILY_LIMITS 50,150,400 e prezzi 19,39,59 / 90,190,390.

export const CURRENCY_DEFAULT = 'EUR';

// Limiti giornalieri (crediti high-priority) — TEST: minimi per velocizzare test.
export const DAILY_LIMITS = {
  sub_starter: 5,
  sub_pro: 10,
  sub_elite: 15,
};


// Sconto percentuale per abbonamento annuale (es. 20 = Risparmi 20%)
export const ANNUAL_DISCOUNT_PERCENT = 20;

// Tipi piano:
// - subscription: abbonamento ricorrente (key inclusa, costi token a carico tuo)
// - one_time: acquisto una tantum (utente inserisce la propria Oxy Key)
export const PLANS = [
  {
    id: 'sub_elite',
    group: 'subscription',
    name: 'OXY Pass',
    type: 'subscription',
    suggestedPrice: 7.99,
    suggestedPriceAnnual: null,
    billingPeriod: 'month',
    description: 'Abbonamento mensile 7,99 € per accesso completo senza restrizioni.',
    features: {
      modelsTier: 'elite',
      memoryVault: 'max',
      stories: true,
      diary: true,
      community: true,
      cloud: true,
      voices: 'all_premium',
      vision: true,
      dailyMessageLimit: null,
      oxyKeyIncluded: true,
    },
  },
];

/** Restituisce l'oggetto features del piano (risolve sub_x_annual al piano base). Per limitare funzionalità in base al piano. */
export const getPlanFeatures = (planId) => {
  const plan = getPlanForDisplay(planId);
  return plan?.features ?? null;
};

/** Sconto lancio 50%: prezzo per difetto (floor) e senza centesimi (intero). */
export const getLaunchDiscountPrice = (price) => Math.floor(Number(price) * 0.5);

// Pacchetti token (acquisto una tantum: credito consumato in chat con la chiave OXY)
export const TOKEN_PACKS = [
  { id: 'pack_100k', nameKey: 'pricing.packs.100k.name', tokens: 100000, suggestedPrice: 5 },
  { id: 'pack_500k', nameKey: 'pricing.packs.500k.name', tokens: 500000, suggestedPrice: 20 },
];

export const getPlanById = (id) => PLANS.find((p) => p.id === id) || null;
/** Restituisce il piano per visualizzazione: risolve sub_x_annual al piano base sub_x. */
export const getPlanForDisplay = (planId) =>
  getPlanById(planId) || PLANS.find((p) => p.annualPlanId === planId) || null;
export const getTokenPackById = (id) => TOKEN_PACKS.find((p) => p.id === id) || null;

