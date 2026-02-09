// Config centrale piani e prezzi OXY.
// Tutti i prezzi sono indicativi e facilmente modificabili qui.

export const CURRENCY_DEFAULT = 'EUR';

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
    suggestedPrice: 9.9,
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
      dailyMessageLimit: 50,
      oxyKeyIncluded: true,
    },
  },
  {
    id: 'sub_pro',
    group: 'subscription',
    name: 'OXY Pass Pro',
    type: 'subscription',
    suggestedPrice: 24.9,
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
      dailyMessageLimit: 150,
      oxyKeyIncluded: true,
    },
  },
  {
    id: 'sub_elite',
    group: 'subscription',
    name: 'OXY Pass Elite',
    type: 'subscription',
    suggestedPrice: 59.0,
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
      dailyMessageLimit: 400,
      oxyKeyIncluded: true,
    },
  },

  // Lifetime (one shot, l’utente porta la propria Oxy Key)
  {
    id: 'life_starter',
    group: 'lifetime',
    name: 'OXY Lifetime Starter',
    type: 'one_time',
    suggestedPrice: 99,
    billingPeriod: 'lifetime',
    description: 'Accesso per sempre alla versione starter, con la tua Oxy Key.',
    upgradeTargetId: 'life_pro',
    upgradePricing: {
      // differenza secca rispetto al listino Pro (249 - 99)
      difference: 150,
      explainer: 'Hai già pagato parte del percorso: per passare a OXY Lifetime Pro paghi solo la differenza rispetto al prezzo di listino.',
      example: 'Esempio: da Starter (99 €) a Pro (249 €) → paghi solo 150 €.',
    },
    features: {
      modelsTier: 'entry',
      memoryVault: 'base',
      stories: true,
      diary: true,
      community: false,
      cloud: false,
      voices: 'basic',
      dailyMessageLimit: null, // limite eventualmente imposto dal backend per sicurezza
      oxyKeyIncluded: false,
    },
  },
  {
    id: 'life_pro',
    group: 'lifetime',
    name: 'OXY Lifetime Pro',
    type: 'one_time',
    suggestedPrice: 249,
    billingPeriod: 'lifetime',
    description: 'Per uso personale + lavoro leggero, con la tua Oxy Key.',
    upgradeTargetId: 'life_elite',
    upgradePricing: {
      // differenza secca rispetto al listino Elite (499 - 249)
      difference: 250,
      explainer: 'Hai già pagato parte del percorso: per passare a OXY Lifetime Elite paghi solo la differenza rispetto al prezzo di listino.',
      example: 'Esempio: da Pro (249 €) a Elite (499 €) → paghi solo 250 €.',
    },
    features: {
      modelsTier: 'pro',
      memoryVault: 'extended',
      stories: true,
      diary: true,
      community: true,
      cloud: false,
      voices: 'all',
      dailyMessageLimit: null,
      oxyKeyIncluded: false,
    },
  },
  {
    id: 'life_elite',
    group: 'lifetime',
    name: 'OXY Lifetime Elite',
    type: 'one_time',
    suggestedPrice: 499,
    billingPeriod: 'lifetime',
    description: 'OXY al massimo livello di oggi, per sempre (con la tua Oxy Key).',
    features: {
      modelsTier: 'elite',
      memoryVault: 'max',
      stories: true,
      diary: true,
      community: true,
      cloud: true,
      voices: 'all_premium',
      dailyMessageLimit: null,
      oxyKeyIncluded: false,
    },
  },
];

export const getPlanById = (id) => PLANS.find((p) => p.id === id) || null;

