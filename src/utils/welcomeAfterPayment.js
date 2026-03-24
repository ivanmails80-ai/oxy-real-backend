/**
 * Messaggio di benvenuto dopo il pagamento: piano attivato, funzionalità incluse, invito a chiedere a Oxy.
 * Usato in chat come primo messaggio quando l'utente arriva dalla scelta voce post-pagamento.
 */
import { getPlanForDisplay, getPlanFeatures } from '../config/pricingConfig';

/**
 * Restituisce le etichette delle funzionalità da mostrare per il piano (chiavi i18n welcomeAfterPayment).
 */
function getFeatureLabels(features, t) {
  if (!features || typeof t !== 'function') return [];
  const items = [];

  if (features.memoryVault === 'base') items.push(t('welcomeAfterPayment.featureMemoryVaultBase'));
  else if (features.memoryVault === 'extended') items.push(t('welcomeAfterPayment.featureMemoryVaultExtended'));
  else if (features.memoryVault === 'max') items.push(t('welcomeAfterPayment.featureMemoryVaultMax'));

  if (features.stories) items.push(t('welcomeAfterPayment.featureStories'));
  if (features.diary) items.push(t('welcomeAfterPayment.featureDiary'));
  if (features.community) items.push(t('welcomeAfterPayment.featureCommunity'));
  if (features.cloud) items.push(t('welcomeAfterPayment.featureCloud'));

  if (features.voices === 'basic') items.push(t('welcomeAfterPayment.featureVoicesBasic'));
  else if (features.voices === 'all') items.push(t('welcomeAfterPayment.featureVoicesAll'));
  else if (features.voices === 'all_premium') items.push(t('welcomeAfterPayment.featureVoicesAllPremium'));

  if (features.vision) items.push(t('welcomeAfterPayment.featureVision'));

  if (features.dailyMessageLimit != null && features.dailyMessageLimit > 0) {
    items.push(t('welcomeAfterPayment.featureDailyLimit', { count: features.dailyMessageLimit }));
  }

  if (features.oxyKeyIncluded) items.push(t('welcomeAfterPayment.featureOxyKeyIncluded'));
  else items.push(t('welcomeAfterPayment.featureOxyKeyYourOwn'));

  return items;
}

/**
 * Costruisce il messaggio di benvenuto completo dopo il pagamento.
 * @param {string} planId - id piano (es. sub_starter, life_pro)
 * @param {string} mode - 'subscription' | 'payment' (per etichetta tipo piano)
 * @param {function} t - (key, params?) => string (translate)
 * @returns {string} Testo completo da mostrare come primo messaggio Oxy in chat
 */
export function getWelcomeMessageAfterPayment(planId, mode, t) {
  const plan = getPlanForDisplay(planId);
  const features = getPlanFeatures(planId);
  const planName = plan?.name || planId;
  const planType =
    mode === 'subscription'
      ? t('welcomeAfterPayment.planTypeSubscription')
      : t('welcomeAfterPayment.planTypeLifetime');

  const intro = t('welcomeAfterPayment.intro', { planName, planType });
  const featuresTitle = t('welcomeAfterPayment.featuresTitle');
  const featureLabels = getFeatureLabels(features, t);
  const featuresList = featureLabels.length > 0 ? featureLabels.map((l) => `• ${l}`).join('\n') : '';
  const askOxy = t('welcomeAfterPayment.askOxy');

  const parts = [intro];
  if (featuresList) {
    parts.push('');
    parts.push(featuresTitle);
    parts.push(featuresList);
  }
  parts.push('');
  parts.push(askOxy);

  return parts.join('\n');
}
