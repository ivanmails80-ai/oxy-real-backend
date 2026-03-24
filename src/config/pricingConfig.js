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
  // Abbonamenti
  {
    id: 'sub_starter',
    group: 'subscription',
    name: 'OXY Pass Starter',
    type: 'subscription',
    suggestedPrice: 0.1,
    suggestedPriceAnnual: null,
    annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
    annualPlanId: 'sub_starter_annual',
    billingPeriod: 'month',
    description: 'Per chi si avvicina all’IA e vuole un compagno quotidiano leggero.',
    upgradeTargetId: 'sub_pro',
    upgradeMessaging: {
      cta: 'Acquista OXY Pass Pro',
      subtitle: 'Upgrade immediato: paghi solo la differenza proporzionata ai giorni rimanenti.',
    },
    features: {
      modelsTier: 'entry', // es. GPT-4o mini
      memoryVault: 'base',
      stories: true,
      diary: true,
      community: false,
      cloud: false,
      voices: 'basic',
      vision: false, // Vision AI (immagini in chat) da Pro in su
      dailyMessageLimit: DAILY_LIMITS.sub_starter,
      oxyKeyIncluded: true,
    },
  },
  {
    id: 'sub_pro',
    group: 'subscription',
    name: 'OXY Pass Pro',
    type: 'subscription',
    suggestedPrice: 0.1,
    suggestedPriceAnnual: null,
    annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
    annualPlanId: 'sub_pro_annual',
    billingPeriod: 'month',
    description: 'Per freelance e professionisti che usano OXY tutti i giorni.',
    upgradeTargetId: 'sub_elite',
    upgradeMessaging: {
      cta: 'Acquista OXY Pass Elite',
      subtitle: 'Upgrade immediato: paghi solo la differenza proporzionata ai giorni rimanenti.',
    },
    features: {
      modelsTier: 'pro', // GPT-4o, GPT-4.1, GPT-5 mini
      memoryVault: 'extended',
      stories: true,
      diary: true,
      community: true,
      cloud: false,
      voices: 'all',
      vision: true,
      dailyMessageLimit: DAILY_LIMITS.sub_pro,
      oxyKeyIncluded: true,
    },
  },
  {
    id: 'sub_elite',
    group: 'subscription',
    name: 'OXY Pass Elite',
    type: 'subscription',
    suggestedPrice: 0.1,
    suggestedPriceAnnual: null,
    annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
    annualPlanId: 'sub_elite_annual',
    billingPeriod: 'month',
    description: 'Per power user e imprenditori che vogliono la massima potenza.',
    features: {
      modelsTier: 'elite', // tutti i modelli, incluse serie o / GPT-5 pieno
      memoryVault: 'max',
      stories: true,
      diary: true,
      community: true,
      cloud: true,
      voices: 'all_premium',
      vision: true,
      dailyMessageLimit: DAILY_LIMITS.sub_elite,
      oxyKeyIncluded: true,
    },
  },

  // Lifetime (one shot, l’utente porta la propria Oxy Key)
  {
    id: 'life_starter',
    group: 'lifetime',
    name: 'OXY Lifetime Starter',
    type: 'one_time',
    suggestedPrice: 0.1,
    billingPeriod: 'lifetime',
    description: 'Versione Starter con pagamento unico, nessun canone mensile. Usa la tua Oxy Key.',
    upgradeTargetId: 'life_pro',
    upgradePricing: {
      difference: 0.1,
      explainer: 'Hai già pagato parte del percorso: per passare a OXY Lifetime Pro paghi solo la differenza rispetto al prezzo di listino.',
      example: 'Esempio: da Starter (0,10 €) a Pro (0,10 €) → paghi solo 0,10 €.',
    },
    features: {
      modelsTier: 'entry',
      memoryVault: 'base',
      stories: true,
      diary: true,
      community: false,
      cloud: false,
      voices: 'basic',
      vision: false,
      dailyMessageLimit: null,
      oxyKeyIncluded: false,
    },
  },
  {
    id: 'life_pro',
    group: 'lifetime',
    name: 'OXY Lifetime Pro',
    type: 'one_time',
    suggestedPrice: 0.1,
    billingPeriod: 'lifetime',
    description: 'Per uso personale + lavoro leggero, con la tua Oxy Key.',
    upgradeTargetId: 'life_elite',
    upgradePricing: {
      difference: 0.1,
      explainer: 'Hai già pagato parte del percorso: per passare a OXY Lifetime Elite paghi solo la differenza rispetto al prezzo di listino.',
      example: 'Esempio: da Pro (0,10 €) a Elite (0,10 €) → paghi solo 0,10 €.',
    },
    features: {
      modelsTier: 'pro',
      memoryVault: 'extended',
      stories: true,
      diary: true,
      community: true,
      cloud: false,
      voices: 'all',
      vision: true,
      dailyMessageLimit: null,
      oxyKeyIncluded: false,
    },
  },
  {
    id: 'life_elite',
    group: 'lifetime',
    name: 'OXY Lifetime Elite',
    type: 'one_time',
    suggestedPrice: 0.1,
    billingPeriod: 'lifetime',
    description: 'OXY al massimo livello di oggi, con pagamento unico e la tua Oxy Key.',
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
      oxyKeyIncluded: false,
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

