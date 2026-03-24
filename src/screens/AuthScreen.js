/**
 * AuthScreen — Login e Registrazione con Firebase Auth
 * Logo OXY + Real + Real Identity (breathing), accesso Google/Apple/Microsoft,
 * flusso registrazione a step: Lingua → Dati personali → Sicurezza finale.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import CountryPicker, { DARK_THEME } from '../components/CountryPickerAdapter';
import { signInWithEmailPassword, signUpWithProfile, requestPasswordReset } from '../services/authService';
import { signInWithGoogleIdToken, signInWithApple, signInWithMicrosoftTokens } from '../services/socialAuthService';
import { isOwnerEmail } from '../services/oxyKeyService';
import { LANGUAGES, LANGUAGE_LABELS } from '../i18n/translations';
import { Ionicons } from '@expo/vector-icons';
import { VOICE_OPTIONS, DEFAULT_VOICE_ID } from '../data/voiceOptions';
import { getBackendBaseUrl } from '../config/backendConfig';
import { getLegalContent } from '../content/legalContent';

WebBrowser.maybeCompleteAuthSession();

// Legge variabile da Constants.expoConfig.extra (embed in build da createExpoConfig + .env) o da process.env (Metro)
function getExpoPublic(key) {
  const fromExtra = Constants?.expoConfig?.extra?.[key];
  if (fromExtra != null && String(fromExtra).trim()) return String(fromExtra).trim();
  return (typeof process !== 'undefined' && process.env?.[key] || '').trim();
}

function GoogleAuthHook({ webClientId, androidClientId, iosClientId, expoClientId, useProxy, projectNameForProxy, onReady }) {
  const nonceRef = useRef(String(Date.now()));
  const fullResultRef = useRef(null);
  // Expo Go: forziamo redirect proxy "https://auth.expo.io/@owner/slug" per evitare redirect_uri=exp://... (non autorizzabile su Google).
  const proxyRedirectUri = useMemo(() => {
    const p = (projectNameForProxy || '').trim() || '@alexxivan80/secondself';
    return `https://auth.expo.io/${p.startsWith('@') ? p : `@${p}`}`;
  }, [projectNameForProxy]);
  // Su Android APK (client tipo Android) Google non accetta response_type=id_token; usare code e scambio token.
  const useCodeFlow = Platform.OS === 'android' && !!androidClientId && !useProxy;
  // Fuori da Expo Go: redirect esplicito allo scheme dell'app (oxyreal://) così dopo il login Google si torna nell'app e non si resta su google.com.
  const nativeRedirectUri = useMemo(
    () => (useProxy ? null : AuthSession.makeRedirectUri({ useProxy: false, path: 'oauthredirect' })),
    [useProxy]
  );
  const stableConfig = useMemo(() => {
    return {
      webClientId: webClientId || undefined,
      androidClientId: androidClientId || undefined,
      iosClientId: iosClientId || undefined,
      expoClientId: expoClientId || undefined,
      redirectUri: useProxy ? proxyRedirectUri : (nativeRedirectUri || undefined),
      scopes: ['openid', 'profile', 'email'],
      responseType: useCodeFlow ? undefined : 'id_token',
      extraParams: { nonce: nonceRef.current },
    };
  }, [webClientId, androidClientId, iosClientId, expoClientId, useProxy, proxyRedirectUri, useCodeFlow, nativeRedirectUri]);

  const [request, fullResult, promptAsync] = Google.useAuthRequest(stableConfig);

  useEffect(() => {
    fullResultRef.current = fullResult;
  }, [fullResult]);

  useEffect(() => {
    onReady?.({ request, promptAsync, fullResultRef });
  }, [onReady, request, promptAsync]);

  return null;
}

function MicrosoftAuthHook({ clientId, onReady }) {
  const discovery = AuthSession.useAutoDiscovery('https://login.microsoftonline.com/common/v2.0');
  const redirectUriRef = useRef(AuthSession.makeRedirectUri());

  const config = useMemo(
    () => ({
      clientId,
      redirectUri: redirectUriRef.current,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      usePKCE: true,
    }),
    [clientId]
  );

  const [request, , promptAsync] = AuthSession.useAuthRequest(config, discovery);

  useEffect(() => {
    onReady?.({ request, promptAsync, discovery, redirectUri: redirectUriRef.current });
  }, [onReady, request, promptAsync, discovery]);

  return null;
}

/** Maschera Data di Nascita: solo numeri, max 8 cifre, formattazione automatica DD/MM/YYYY (con barre) */
const formatBirthDate = (raw) => {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/,
  // 8+ caratteri, almeno 1 minuscola, 1 maiuscola, 1 numero, 1 simbolo (qualsiasi non alfanumerico)
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\s]{8,}$/,
  date: /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d{2}$/,
  name: /^[A-Za-z\s]{2,50}$/,
  phone: /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
};

/** Da data DD/MM/YYYY restituisce { age, isMinor }. isMinor = true se 14 <= età < 18 (checkbox consenso minore obbligatoria). */
const getAgeFromBirthDate = (ddMmYyyy) => {
  if (!ddMmYyyy || !VALIDATION.date.test((ddMmYyyy || '').trim())) return { age: null, isMinor: false };
  const parts = ddMmYyyy.trim().split('/');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const birth = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  const isMinor = age >= 14 && age < 18;
  return { age, isMinor };
};

/** Criteri password (per checkmark e strength): valori booleani */
const getPasswordCriteria = (p) => {
  const t = (p || '').trim();
  return {
    length: t.length >= 8,
    lower: /[a-z]/.test(t),
    upper: /[A-Z]/.test(t),
    number: /\d/.test(t),
    symbol: /[^A-Za-z0-9\s]/.test(t),
    trimmed: t,
  };
};

/** Livello forza: 'weak' | 'medium' | 'strong' | 'excellent' */
const getPasswordStrength = (p) => {
  const c = getPasswordCriteria(p);
  if (c.trimmed.length < 6 || (!c.number && !c.symbol && c.trimmed.length < 8)) return 'weak';
  if (c.length && c.upper && c.lower && c.number && c.symbol) return 'excellent';
  if (c.length && c.upper && c.number && c.symbol) return 'strong';
  if (c.length >= 8 && (c.number || c.upper)) return 'medium';
  return 'weak';
};

const STRENGTH_COLORS = { weak: '#e53935', medium: '#fdd835', strong: '#43a047', excellent: '#c5a059' };

// Logo: solo OXY Real pulsa; Real Identity è statico
const OxyLogoAuth = ({ large = true }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);
  const sizeOxy = large ? 42 : 28;
  const sizeReal = Math.round(sizeOxy * 0.72);
  const spacing = large ? 4 : 3;
  return (
    <View style={styles.logoAnimWrap}>
      <Animated.View style={[styles.logoRow, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={[styles.logoBold, { fontSize: sizeOxy, letterSpacing: spacing }]}>OXY</Text>
        <Text style={[styles.logoItalic, { fontSize: sizeReal, letterSpacing: Math.max(1, spacing - 1), marginLeft: 2 }]}>Real</Text>
      </Animated.View>
      {large && <Text style={styles.taglineLogo}>Real Identity</Text>}
    </View>
  );
};

export default function AuthScreen({ onSuccess, onOpenLanguage, language, onLanguageChange, t = (k) => k }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [regStep, setRegStep] = useState('personal'); // 'personal' | 'security' — la voce si sceglie dopo il pagamento (in App.js)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentDocsEmail, setConsentDocsEmail] = useState(false);
  const [consentMinor, setConsentMinor] = useState(false);
  const [consentRequiredForUser, setConsentRequiredForUser] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null

  const scrollRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  // Android Autofill può valorizzare i campi senza triggerare onChangeText (quindi lo state resta vuoto).
  // Teniamo anche una copia "nativa" per abilitare correttamente ACCEDI e validare in handleLogin.
  const emailNativeRef = useRef('');
  const passwordNativeRef = useRef('');
  const googleAuthRef = useRef({ request: null, promptAsync: null });
  const microsoftAuthRef = useRef({ request: null, promptAsync: null, discovery: null, redirectUri: null });

  const setEmailFromNative = (text) => {
    const v = typeof text === 'string' ? text : '';
    emailNativeRef.current = v;
    setEmail(v);
  };

  const setPasswordFromNative = (text) => {
    const v = typeof text === 'string' ? text : '';
    passwordNativeRef.current = v;
    setPassword(v);
  };

  const backendUrl = getBackendBaseUrl();
  const IS_EXPO_GO = Constants?.appOwnership === 'expo';
  const projectNameForProxy = useMemo(() => {
    const owner = Constants?.expoConfig?.owner || Constants?.easConfig?.owner || 'alexxivan80';
    const slug = Constants?.expoConfig?.slug || 'secondself';
    return owner && slug ? `@${owner}/${slug}` : '@alexxivan80/secondself';
  }, []);

  // ——— Social login configuration (OAuth) ———
  // Da Constants.expoConfig.extra (APK/build) o process.env (Metro): extra è popolato da app.config.js + .env a build time
  const googleWebClientId = getExpoPublic('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  const googleAndroidClientId = getExpoPublic('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
  const googleIosClientId = getExpoPublic('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
  const googleExpoClientId = getExpoPublic('EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID');

  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  // Mostriamo SEMPRE i provider: se non configurati, risultano "disabilitati" e mostrano un messaggio chiaro.
  // (In Expo Go può servire expoClientId; in build native i clientId specifici.)
  const googleConfigured = !!(googleAndroidClientId || googleIosClientId || googleWebClientId || googleExpoClientId);
  const googleEnabled = googleConfigured;
  // expo-auth-session/providers/google su Android richiede androidClientId; in Expo Go usiamo expoClientId come fallback.
  const effectiveGoogleAndroidClientId = googleAndroidClientId || googleExpoClientId;
  const microsoftClientId = getExpoPublic('EXPO_PUBLIC_MICROSOFT_CLIENT_ID');
  const microsoftEnabled = !!microsoftClientId;

  useEffect(() => {
    if (!email.trim()) {
      setConsentRequiredForUser(true);
      return;
    }
    if (isOwnerEmail(email.trim())) {
      setConsentRequiredForUser(false);
      return;
    }
    if (!backendUrl || !VALIDATION.email.test(email.trim())) {
      setConsentRequiredForUser(true);
      return;
    }
    const t = setTimeout(() => {
      fetch(`${backendUrl}/api/consent-required?email=${encodeURIComponent(email.trim())}`)
        .then((r) => r.json())
        .then((data) => setConsentRequiredForUser(data.consentRequired !== false))
        .catch(() => setConsentRequiredForUser(true));
    }, 500);
    return () => clearTimeout(t);
  }, [email, backendUrl]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      try { show.remove(); } catch (_) {}
      try { hide.remove(); } catch (_) {}
    };
  }, []);

  const effectiveConsents = consentsAccepted || !consentRequiredForUser;

  const emailTrim = (email || emailNativeRef.current || '').trim();
  const passwordTrim = (password || passwordNativeRef.current || '').trim();
  // Login: accedi attivo solo quando c'è password (UX richiesta).
  const canLogin = passwordTrim.length > 0 && !loading;

  // Dati step registrazione
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [emailSecondaria, setEmailSecondaria] = useState('');
  const [phoneCountry, setPhoneCountry] = useState({ cca2: 'IT', callingCode: '39', flag: '🇮🇹' });
  const [phoneNumber, setPhoneNumber] = useState(''); // solo numero nazionale, senza prefisso
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [regAiName] = useState('OXY'); // Nome assistente fisso, campo solo informativo
  const [regVoiceId, setRegVoiceId] = useState(DEFAULT_VOICE_ID);

  const { isMinor } = getAgeFromBirthDate(dataNascita);
  const consentsAccepted = consentTerms && consentPrivacy && (!isMinor || consentMinor);

  const handleToggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setRegStep('personal'); // primo step registrazione: dati personali (la voce si sceglie dopo il pagamento)
    setPassword('');
    setConfirmPassword('');
  };

  const handleSocial = async (provider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      let result;
      if (provider === 'Google') {
        if (!googleEnabled) {
          throw new Error(t('login.social.unavailableGoogle'));
        }
        if (!googleAuthRef.current?.request || !googleAuthRef.current?.promptAsync) {
          throw new Error(t('login.social.googleAndroidNeeded'));
        }
        const authRes = await googleAuthRef.current.promptAsync({ useProxy: !!projectNameForProxy, projectNameForProxy });
        if (authRes?.type !== 'success') {
          const code = authRes?.errorCode || authRes?.params?.error || '';
          throw new Error(code ? `Google OAuth error: ${code}` : t('login.social.cancelled'));
        }
        let idToken = authRes?.params?.id_token || authRes?.authentication?.idToken || '';
        // Su Android con flusso code, l'id_token arriva dallo scambio async nel hook; attendere fullResultRef.
        if (authRes?.params?.code && !idToken && googleAuthRef.current?.fullResultRef) {
          for (let i = 0; i < 25; i++) {
            await new Promise((r) => setTimeout(r, 200));
            const r = googleAuthRef.current.fullResultRef.current;
            if (r?.params?.id_token) {
              idToken = r.params.id_token;
              break;
            }
            if (r?.authentication?.idToken) {
              idToken = r.authentication.idToken;
              break;
            }
          }
        }
        result = await signInWithGoogleIdToken(idToken);
      } else if (provider === 'Apple') {
        if (Platform.OS !== 'ios') {
          throw new Error(t('login.social.unavailableApple'));
        }
        result = await signInWithApple();
      } else if (provider === 'Microsoft') {
        if (!microsoftEnabled) throw new Error(t('login.social.unavailableMicrosoft'));
        if (!microsoftAuthRef.current?.request || !microsoftAuthRef.current?.promptAsync || !microsoftAuthRef.current?.discovery) {
          throw new Error(t('login.social.unavailableMicrosoft'));
        }
        const authRes = await microsoftAuthRef.current.promptAsync();
        if (authRes?.type !== 'success') throw new Error(t('login.social.cancelled'));
        const code = authRes?.params?.code;
        if (!code) throw new Error(t('login.social.cancelled'));
        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId: microsoftClientId,
            code,
            redirectUri: microsoftAuthRef.current.redirectUri,
            extraParams: {
              code_verifier: microsoftAuthRef.current.request?.codeVerifier || '',
            },
          },
          microsoftAuthRef.current.discovery
        );
        result = await signInWithMicrosoftTokens({
          idToken: tokenRes?.idToken || tokenRes?.id_token,
          accessToken: tokenRes?.accessToken || tokenRes?.access_token,
        });
      } else {
        setLoading(false);
        return;
      }
      if (result?.session && result?.profile) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess?.({ session: result.session, profile: result.profile });
      }
    } catch (err) {
      const msg = err?.message || t('login.social.errorDefault');
      Alert.alert(`${t('login.social.accessTitle')} ${provider}`, msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const e = (email || emailNativeRef.current || '').trim();
    const p = (password || passwordNativeRef.current || '').trim();
    if (!e) {
      Alert.alert(t('login.error.missingEmailTitle'), t('login.error.missingEmailBody'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!p) {
      Alert.alert(t('login.error.missingPasswordTitle'), t('login.error.missingPasswordBody'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!VALIDATION.email.test(e)) {
      Alert.alert(t('login.error.invalidEmailTitle'), t('login.error.invalidEmailBody'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    try {
      const { session, profile } = await signInWithEmailPassword(e, p);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.({ session, profile });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = (err?.message || String(err)).toLowerCase();
      const code = err?.code || '';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('invalid-email') || code.includes('invalid-credential') || code.includes('wrong-password')) {
        Alert.alert(t('login.error.deniedTitle'), t('login.error.deniedBody'));
      } else if (msg.includes('user-not-found') || code.includes('user-not-found')) {
        Alert.alert(t('login.error.userNotFoundTitle'), t('login.error.userNotFoundBody'));
      } else if (msg.includes('too-many-requests') || code.includes('too-many-requests')) {
        Alert.alert(t('login.error.tooManyAttemptsTitle'), t('login.error.tooManyAttemptsBody'));
      } else {
        const raw = err?.message || String(err);
        Alert.alert(t('login.error.genericTitle'), raw && raw.length < 200 ? raw : t('login.error.genericBody'));
      }
    } finally {
      setLoading(false);
    }
  };

  const canProceedSecurity = () => {
    const p = (password || '').trim();
    const cp = (confirmPassword || '').trim();
    return p.length >= 8 && p === cp && VALIDATION.password.test(p);
  };

  const handleRegisterSubmit = async () => {
    const e = email.trim();
    const p = (password || '').trim();
    const cp = (confirmPassword || '').trim();
    if (!e || !p || !nome.trim() || !cognome.trim()) {
      Alert.alert(t('register.validation.title'), t('register.validation.fillRequiredBody'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!VALIDATION.email.test(e)) {
      Alert.alert(t('register.validation.title'), t('register.validation.emailMain'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (p !== cp) {
      Alert.alert(t('register.validation.title'), t('register.validation.passwordMatch'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!VALIDATION.password.test(p)) {
      Alert.alert(t('register.validation.title'), t('register.passwordHint'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    try {
      const fullPhone = phoneNumber.trim()
        ? `+${phoneCountry.callingCode} ${phoneNumber.trim().replace(/\s/g, '')}`
        : '';
      const regData = {
        email: e,
        password: p,
        nome: nome.trim(),
        cognome: cognome.trim(),
        dataNascita: dataNascita.trim() || '',
        emailSecondaria: emailSecondaria.trim() || '',
        telefono: fullPhone,
      };
      const { session, profile } = await signUpWithProfile(regData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.({
        session,
        profile,
        customAiName: 'OXY',
        voiceId: VOICE_OPTIONS.some((v) => v.id === regVoiceId) ? regVoiceId : DEFAULT_VOICE_ID,
      });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.message || '';
      if (msg.includes('email-already-in-use')) {
        Alert.alert(t('register.error.emailInUseTitle'), t('register.error.emailInUseBody'));
      } else if (msg.includes('weak-password')) {
        Alert.alert(t('register.error.weakPasswordTitle'), t('register.passwordHint'));
      } else {
        Alert.alert(t('register.error.title'), msg && msg.length < 150 ? msg : t('register.error.body'));
      }
    } finally {
      setLoading(false);
    }
  };

  const goNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (regStep === 'personal') {
      const trimmed = (dataNascita || '').trim();
      if (trimmed && VALIDATION.date.test(trimmed)) {
        const { age } = getAgeFromBirthDate(dataNascita);
        if (age !== null && age < 14) {
          Alert.alert(t('register.validation.title'), t('register.validation.minAge14'));
          return;
        }
      }
      setRegStep('security');
    }
  };

  const goBackStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (regStep === 'security') setRegStep('personal');
    else if (regStep === 'personal') handleToggleMode();
  };

  const inputWrap = styles.inputRowContainer;
  const currentLang = language || 'it';

  // Android: KeyboardAvoidingView può alterare hit-testing/layout su alcuni device.
  // Per il login usiamo una View semplice (windowSoftInputMode=adjustResize fa il resto).
  const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const keyboardWrapperProps = Platform.OS === 'ios'
    ? { behavior: 'padding', keyboardVerticalOffset: 0 }
    : {};

  const logTouch = () => {};

  const legal = getLegalContent(currentLang);
    const termsDoc = legal.termsOfService;
    const privacyDoc = legal.privacyPolicy;

    return (
    <LinearGradient colors={['#002b4d', '#002b4d']} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Modal
          visible={legalModal !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setLegalModal(null)}
        >
          <Pressable style={styles.legalModalOverlay} onPress={() => setLegalModal(null)}>
            <Pressable style={styles.legalModalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.legalModalTitle}>
                {legalModal === 'terms' ? termsDoc?.title : privacyDoc?.title}
              </Text>
              <ScrollView
                style={styles.legalModalScroll}
                contentContainerStyle={styles.legalModalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                {legalModal === 'terms' && termsDoc?.sections?.map((s) => (
                  <View key={s.id} style={styles.legalModalSection}>
                    <Text style={styles.legalModalSectionTitle}>{s.title}</Text>
                    <Text style={styles.legalModalSectionContent}>{s.content}</Text>
                  </View>
                ))}
                {legalModal === 'privacy' && privacyDoc && (
                  <>
                    {privacyDoc.intro ? (
                      <Text style={[styles.legalModalSectionContent, styles.legalModalIntro]}>{privacyDoc.intro}</Text>
                    ) : null}
                    {privacyDoc.sections?.map((s) => (
                      <View key={s.id} style={styles.legalModalSection}>
                        <Text style={styles.legalModalSectionTitle}>{s.title}</Text>
                        <Text style={styles.legalModalSectionContent}>{s.content}</Text>
                      </View>
                    ))}
                    {privacyDoc.footer ? (
                      <Text style={[styles.legalModalSectionContent, styles.legalModalFooter]}>{privacyDoc.footer}</Text>
                    ) : null}
                  </>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.legalModalCloseBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLegalModal(null); }}
                activeOpacity={0.8}
              >
                <Text style={styles.legalModalCloseText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
        {googleEnabled && (
          <GoogleAuthHook
            webClientId={googleWebClientId}
            androidClientId={effectiveGoogleAndroidClientId}
            iosClientId={googleIosClientId}
            expoClientId={googleExpoClientId}
            useProxy={!!projectNameForProxy}
            projectNameForProxy={projectNameForProxy}
            onReady={({ request, promptAsync, fullResultRef }) => {
              googleAuthRef.current = { request, promptAsync, fullResultRef };
            }}
          />
        )}
        {microsoftEnabled && (
          <MicrosoftAuthHook
            clientId={microsoftClientId}
            onReady={({ request, promptAsync, discovery, redirectUri }) => {
              microsoftAuthRef.current = { request, promptAsync, discovery, redirectUri };
            }}
          />
        )}
        <KeyboardWrapper style={{ flex: 1 }} {...keyboardWrapperProps}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContent,
              // Quando la tastiera è visibile, evitiamo di centrare il contenuto:
              // su alcuni Android questo spinge Password/CTA sotto la tastiera e rende i touch "morti".
              // Per la versione definitiva manteniamo il layout stabile: niente "salti" al focus del campo email.
              mode === 'login' && styles.scrollContentNoScroll,
              // Login: spazio sotto il campo password così il pulsante Accedi non taglia il riquadro
              mode === 'login' && styles.scrollContentLoginBottom,
            ]}
            // Cruciale: su Android, con "handled" spesso il primo tap serve solo a chiudere la tastiera.
            // Con "always" i bottoni (occhio, accedi, ecc.) funzionano subito anche con tastiera aperta.
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            // Su Android, scrollEnabled={false} può rendere "morti" i touch su alcuni device.
            // Manteniamo lo scroll attivo ma disabilitiamo bounce/overscroll: se il contenuto sta in una schermata,
            // non scrollerà comunque, ma i touch restano sempre affidabili.
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
          >
            <View style={styles.logoWrap}>
              <OxyLogoAuth large />
            </View>

            {/* ---------- LOGIN ---------- */}
            {mode === 'login' && (
              <>
                <View style={styles.socialWrap} collapsable={false}>
                  <TouchableOpacity
                    style={[styles.socialBtn, !googleEnabled && styles.socialBtnDisabled]}
                    onPress={() => { logTouch('social Google'); handleSocial('Google'); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.8}
                  >
                    <FontAwesome name="google" size={20} color="#fff" />
                    <Text style={[styles.socialBtnText, !googleEnabled && styles.socialBtnTextDisabled]}>{t('login.social.google')}</Text>
                  </TouchableOpacity>
                  {/* Apple: disponibile solo su iOS, ma lo mostriamo sempre per coerenza UI */}
                  <TouchableOpacity
                    style={[styles.socialBtn, !isIOS && styles.socialBtnDisabled]}
                    onPress={() => { logTouch('social Apple'); handleSocial('Apple'); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.8}
                  >
                    <FontAwesome name="apple" size={20} color="#fff" />
                    <Text style={[styles.socialBtnText, !isIOS && styles.socialBtnTextDisabled]}>{t('login.social.apple')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialBtn, !microsoftEnabled && styles.socialBtnDisabled]}
                    onPress={() => { logTouch('social Microsoft'); handleSocial('Microsoft'); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.8}
                  >
                    <FontAwesome name="windows" size={20} color="#fff" />
                    <Text style={[styles.socialBtnText, !microsoftEnabled && styles.socialBtnTextDisabled]}>{t('login.social.microsoft')}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.orText}>{t('login.or')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('login.username.placeholder')}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={email}
                  onChangeText={setEmailFromNative}
                  onChange={(e) => setEmailFromNative(e?.nativeEvent?.text)}
                  onEndEditing={(e) => setEmailFromNative(e?.nativeEvent?.text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  ref={emailInputRef}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInputRef.current?.focus?.()}
                  textContentType="username"
                  autoComplete="email"
                  importantForAutofill="yes"
                />

                {/* Password vicino alla mail (UX: evita distanza enorme su schermi alti) */}
                <View style={[inputWrap, { marginTop: 0 }]} collapsable={false}>
                  <TextInput
                    style={styles.inputInner}
                    placeholder={t('login.password.placeholder')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={password}
                    onChangeText={setPasswordFromNative}
                    onChange={(e) => setPasswordFromNative(e?.nativeEvent?.text)}
                    onEndEditing={(e) => setPasswordFromNative(e?.nativeEvent?.text)}
                    secureTextEntry={!passwordVisible}
                    ref={passwordInputRef}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={handleLogin}
                    textContentType="password"
                    autoComplete="password"
                    importantForAutofill="yes"
                  />
                  <Pressable
                    onPress={() => {
                      logTouch('toggle password eye');
                      setPasswordVisible((v) => !v);
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                    }}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    android_disableSound
                    accessibilityRole="button"
                  >
                    <FontAwesome name={passwordVisible ? 'eye-slash' : 'eye'} size={20} color="#c5a059" />
                  </Pressable>
                </View>
              </>
            )}

            {/* ---------- REGISTRAZIONE A STEP (lingua già scelta al primo avvio) ---------- */}
            {mode === 'register' && (
              <>
                {regStep === 'personal' && (
                  <>
                    <Text style={styles.stepTitle}>{t('register.stepPersonal')}</Text>
                    <TextInput style={styles.input} placeholder={t('register.firstName')} placeholderTextColor="rgba(255,255,255,0.6)" value={nome} onChangeText={setNome} autoCapitalize="words" />
                    <TextInput style={styles.input} placeholder={t('register.lastName')} placeholderTextColor="rgba(255,255,255,0.6)" value={cognome} onChangeText={setCognome} autoCapitalize="words" />
                    <TextInput
                      style={styles.input}
                      placeholder={t('register.birthDate')}
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      value={dataNascita}
                      onChangeText={(text) => setDataNascita(formatBirthDate(text))}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    <TextInput style={styles.input} placeholder={t('register.emailMain')} placeholderTextColor="rgba(255,255,255,0.6)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                    <TextInput style={styles.input} placeholder={t('register.emailBackup')} placeholderTextColor="rgba(255,255,255,0.6)" value={emailSecondaria} onChangeText={setEmailSecondaria} keyboardType="email-address" autoCapitalize="none" />
                    <View style={styles.phoneRow}>
                      <TouchableOpacity
                        style={styles.phonePrefixBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setCountryPickerVisible(true);
                        }}
                      >
                        <Text style={styles.phonePrefixFlag}>{phoneCountry.flag}</Text>
                        <Text style={styles.phonePrefixCode}>+{phoneCountry.callingCode}</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder={t('register.phone')}
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={phoneNumber}
                        onChangeText={(val) => setPhoneNumber(val.replace(/[^\d\s]/g, ''))}
                        keyboardType="phone-pad"
                      />
                    </View>
                    {countryPickerVisible && (
                      <CountryPicker
                        visible={countryPickerVisible}
                        withFilter
                        withFlag
                        withCallingCode
                        onClose={() => setCountryPickerVisible(false)}
                        onSelect={(country) => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const code = Array.isArray(country.callingCode) ? country.callingCode[0] : country.callingCode;
                          setPhoneCountry({
                            cca2: country.cca2,
                            callingCode: code || '39',
                            flag: country.flag || '🌐',
                          });
                          setCountryPickerVisible(false);
                        }}
                        countryCode={phoneCountry.cca2}
                        theme={{ ...DARK_THEME, primaryColor: '#c5a059', backgroundColor: '#0a0a0a', onBackgroundTextColor: '#ffffff' }}
                      />
                    )}
                    <TouchableOpacity style={styles.btn} onPress={goNextStep}>
                      <Text style={styles.btnText}>{t('register.continue')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={goBackStep} style={styles.backStepBtn} accessibilityLabel="Indietro" accessibilityRole="button">
                      <View style={styles.backStepRow}>
                        <FontAwesome name="chevron-left" size={18} color="#c5a059" />
                        <Text style={styles.toggleText}>Indietro</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleToggleMode} style={styles.backStepBtn} accessibilityLabel={t('register.backToLogin')} accessibilityRole="button">
                      <Text style={styles.toggleText}>{t('register.backToLogin')}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {regStep === 'security' && (() => {
                  const criteria = getPasswordCriteria(password);
                  const strength = getPasswordStrength(password);
                  const passwordsMatch = criteria.trimmed === (confirmPassword || '').trim() && criteria.trimmed.length >= 8;
                  const allCriteriaMet = criteria.length && criteria.lower && criteria.upper && criteria.number && criteria.symbol;
                  // Checkbox consensi: richieste solo alla prima registrazione (o quando backend le richiede).
                  // Se non richieste, non blocchiamo la registrazione.
                  const consentsOk = consentRequiredForUser ? consentsAccepted : true;
                  const canSubmit = allCriteriaMet && passwordsMatch && !loading && consentsOk;
                  const strengthColor = STRENGTH_COLORS[strength];
                  const CriterionRow = ({ met, label }) => (
                    <View style={styles.criterionRow}>
                      <FontAwesome name={met ? 'check-circle' : 'circle-o'} size={14} color={met ? (strength === 'excellent' ? '#c5a059' : '#43a047') : 'rgba(255,255,255,0.4)'} />
                      <Text style={[styles.criterionText, met && styles.criterionTextMet]}>{label}</Text>
                    </View>
                  );
                  return (
                    <>
                      <Text style={styles.stepTitle}>{t('register.stepSecurity')}</Text>
                      <View style={inputWrap} collapsable={false}>
                        <TextInput
                          style={styles.inputInner}
                          placeholder={t('register.password')}
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!passwordVisible}
                        />
                        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPasswordVisible((v) => !v); }} style={styles.eyeBtn}>
                          <FontAwesome name={passwordVisible ? 'eye-slash' : 'eye'} size={18} color="#c5a059" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.strengthBarWrap}>
                        {['weak', 'medium', 'strong', 'excellent'].map((level, i) => {
                          const levels = ['weak', 'medium', 'strong', 'excellent'];
                          const idx = levels.indexOf(strength);
                          const active = i <= idx;
                          return (
                            <View
                              key={level}
                              style={[
                                styles.strengthSegment,
                                { backgroundColor: active ? strengthColor : 'rgba(255,255,255,0.15)' },
                              ]}
                            />
                          );
                        })}
                      </View>
                      <View style={styles.criteriaWrap}>
                        <CriterionRow met={criteria.length} label="8+ caratteri" />
                        <CriterionRow met={criteria.lower} label="Una minuscola" />
                        <CriterionRow met={criteria.upper} label="Una maiuscola" />
                        <CriterionRow met={criteria.number} label="Un numero" />
                        <CriterionRow met={criteria.symbol} label="Un simbolo (@, #, !, …)" />
                        <View style={styles.criterionRow}>
                          <FontAwesome
                            name={passwordsMatch ? 'check-circle' : 'circle-o'}
                            size={14}
                            color={passwordsMatch ? '#43a047' : 'rgba(255,255,255,0.4)'}
                          />
                          <Text style={[styles.criterionText, passwordsMatch && styles.criterionTextMet]}>Le password coincidono</Text>
                        </View>
                      </View>
                      <View style={inputWrap} collapsable={false}>
                        <TextInput
                          style={styles.inputInner}
                          placeholder={t('register.passwordConfirm')}
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!confirmPasswordVisible}
                        />
                        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConfirmPasswordVisible((v) => !v); }} style={styles.eyeBtn}>
                          <FontAwesome name={confirmPasswordVisible ? 'eye-slash' : 'eye'} size={18} color="#c5a059" />
                        </TouchableOpacity>
                      </View>
                      {/* Consensi legali: termini, privacy (obbligatori) + marketing (facoltativo) */}
                      {consentRequiredForUser && (
                        <View style={[styles.legalBlock, { marginTop: 8 }]}>
                          <Text style={styles.legalBlockText}>
                            {t('register.errorMissingConsent')}
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 12 }}>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLegalModal('terms'); }} activeOpacity={0.8}>
                              <Text style={styles.legalLink}>{t('register.readTerms')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLegalModal('privacy'); }} activeOpacity={0.8}>
                              <Text style={styles.legalLink}>{t('register.readPrivacy')}</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.legalCheckRow}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConsentTerms((v) => !v); }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={consentTerms ? 'checkbox' : 'checkbox-outline'} size={14} color="rgba(197, 160, 89, 0.8)" />
                            <Text style={styles.legalCheckText}>{t('register.consentTerms')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.legalCheckRow}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConsentPrivacy((v) => !v); }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={consentPrivacy ? 'checkbox' : 'checkbox-outline'} size={14} color="rgba(197, 160, 89, 0.8)" />
                            <Text style={styles.legalCheckText}>{t('register.consentPrivacy')}</Text>
                          </TouchableOpacity>
                          {isMinor && (
                            <TouchableOpacity
                              style={styles.legalCheckRow}
                              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConsentMinor((v) => !v); }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name={consentMinor ? 'checkbox' : 'checkbox-outline'} size={14} color="rgba(197, 160, 89, 0.8)" />
                              <Text style={styles.legalCheckText}>{t('register.consentMinor')}</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.legalCheckRow}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConsentMarketing((v) => !v); }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={consentMarketing ? 'checkbox' : 'checkbox-outline'} size={14} color="rgba(197, 160, 89, 0.8)" />
                            <Text style={styles.legalCheckText}>{t('register.consentMarketing')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.legalCheckRow}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConsentDocsEmail((v) => !v); }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={consentDocsEmail ? 'checkbox' : 'checkbox-outline'} size={14} color="rgba(197, 160, 89, 0.8)" />
                            <Text style={styles.legalCheckText}>{t('register.consentDocsEmail')}</Text>
                          </TouchableOpacity>
                          <Text style={[styles.legalBlockText, { marginTop: 6 }]}>
                            {t('register.serviceEmailsNotice')}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.btn, styles.btnConfirm, !canSubmit && styles.btnConfirmDisabled]}
                        onPress={handleRegisterSubmit}
                        disabled={!canSubmit}
                        activeOpacity={canSubmit ? 0.8 : 1}
                      >
                        {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.btnText}>{t('register.button')}</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={goBackStep} style={styles.backStepBtn} accessibilityLabel="Indietro" accessibilityRole="button">
                        <View style={styles.backStepRow}>
                          <FontAwesome name="chevron-left" size={18} color="#c5a059" />
                          <Text style={styles.toggleText}>Indietro</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleToggleMode} style={styles.backStepBtn} accessibilityLabel={t('register.backToLogin')} accessibilityRole="button">
                        <Text style={styles.toggleText}>{t('register.backToLogin')}</Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}

              </>
            )}

          </ScrollView>
          {/* Login: zona password + Accedi + link FUORI dallo ScrollView (su Android lo ScrollView mangia i tap) */}
          {mode === 'login' && (
            <View
              style={[
                styles.loginFixedBottom,
                // Evita sovrapposizione con barra di navigazione/gesture
                { paddingBottom: Math.max(24, 14 + (insets?.bottom || 0)) },
              ]}
              collapsable={false}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  loading && styles.btnDisabled,
                  pressed && !loading && styles.btnPressed,
                ]}
                onPress={() => { logTouch('login button'); handleLogin(); }}
                disabled={loading}
                android_disableSound
                accessibilityRole="button"
              >
                {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.btnText}>{t('login.button')}</Text>}
              </Pressable>
              <Pressable
                onPress={async () => {
                  logTouch('forgot password');
                  const e = (email || emailNativeRef.current || '').trim();
                  if (!e) {
                    Alert.alert(t('login.error.resetEmailRequiredTitle'), t('login.error.resetNeedEmailBody'));
                    return;
                  }
                  if (!VALIDATION.email.test(e)) {
                    Alert.alert(t('login.error.invalidEmailTitle'), t('login.error.resetNeedEmailBody'));
                    return;
                  }
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await requestPasswordReset(e);
                    Alert.alert(t('login.error.resetSentTitle'), t('login.error.resetSentBodyWithEmail', { email: e }));
                  } catch (err) {
                    const raw = err?.message || String(err || '');
                    const msg = raw.toLowerCase();
                    if (msg.includes('user-not-found')) Alert.alert(t('login.error.userNotFoundTitle'), t('login.error.resetAccountNotFoundBody'));
                    else Alert.alert(t('login.error.genericTitle'), raw && raw.length < 150 ? raw : t('login.error.resetGenericBody'));
                  }
                }}
                style={styles.toggleBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                android_disableSound
                accessibilityRole="button"
              >
                <Text style={styles.forgotLink}>{t('login.forgot')}</Text>
              </Pressable>
              <Pressable
                onPress={() => { logTouch('go register'); handleToggleMode(); }}
                style={styles.toggleBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                android_disableSound
                accessibilityRole="button"
              >
                <Text style={styles.toggleText}>{t('login.registerLink')}</Text>
              </Pressable>
              {onOpenLanguage && (
                <Pressable
                  onPress={() => { logTouch('open language'); onOpenLanguage(); }}
                  style={styles.langBtn}
                  android_disableSound
                  accessibilityRole="button"
                >
                  <Text style={styles.toggleText}>{t('register.stepLanguage')}</Text>
                </Pressable>
              )}
            </View>
          )}
          {/* Disclaimer di proprietà (identità legale) */}
          <View style={styles.ownershipFooter}>
            <Text style={styles.ownershipFooterText}>{t('legal.ownershipDisclaimer')}</Text>
          </View>
        </KeyboardWrapper>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  // Layout: blocco OXY Real + lingua + social centrato (più spazio sopra, meno sotto)
  scrollContent: { paddingHorizontal: 24, paddingBottom: 14, paddingTop: 36, flexGrow: 1 },
  // Login: centra il blocco nello schermo; paddingBottom abbondante così il riquadro password non viene tagliato dal pulsante Accedi
  scrollContentNoScroll: { justifyContent: 'center', paddingTop: 28, paddingBottom: 20 },
  // Login: spazio extra sotto l’ultimo campo (password) per non essere tagliato dal blocco Accedi
  scrollContentLoginBottom: { paddingBottom: 28 },
  ownershipFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Math.max(12, 8),
    alignItems: 'center',
  },
  ownershipFooterText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textAlign: 'center',
  },
  /** Zona login fuori ScrollView (password + Accedi + link) per evitare tap mangiati su Android */
  loginFixedBottom: {
    paddingHorizontal: 24,
    paddingTop: 18, // più distanza dal riquadro password così non taglia il bordo inferiore
    paddingBottom: 16, // meno spazio sopra i pulsanti del telefono
    // Android: rendiamo esplicito che questo blocco sta "sopra" ed è hittable.
    zIndex: 10,
    elevation: 10,
  },
  logoWrap: { alignItems: 'center', marginBottom: 26 },
  logoAnimWrap: { alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoBold: { color: '#c5a059', fontWeight: '900', textTransform: 'uppercase' },
  logoItalic: { color: '#c5a059', fontStyle: 'italic' },
  taglineLogo: { color: 'rgba(197,160,89,0.9)', fontSize: 14, fontStyle: 'italic', marginTop: 6, letterSpacing: 1 },
  socialWrap: { marginBottom: 10, marginTop: 4 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
    gap: 10,
  },
  socialBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  socialBtnDisabled: { opacity: 0.55 },
  socialBtnTextDisabled: { color: 'rgba(255,255,255,0.75)' },
  orText: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  stepTitle: { color: '#c5a059', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  aiNameLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 },
  inputReadOnly: { opacity: 0.9 },
  langOption: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  langOptionActive: { backgroundColor: 'rgba(197,160,89,0.25)', borderWidth: 1, borderColor: '#c5a059' },
  langOptionText: { color: '#fff', fontSize: 16 },
  voiceRegDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4, lineHeight: 18 },
  input: {
    backgroundColor: 'rgba(0,43,77,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.35)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: '#d1d1d1',
    fontSize: 16,
    marginBottom: 14,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,43,77,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.35)',
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  phonePrefixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(197,160,89,0.35)',
    gap: 6,
  },
  phonePrefixFlag: { fontSize: 20 },
  phonePrefixCode: { color: '#c5a059', fontSize: 16, fontWeight: '600' },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#d1d1d1',
    fontSize: 16,
  },
  // Container per input con trailing button (es. occhio password): stessa altezza degli altri riquadri
  inputRowContainer: {
    backgroundColor: 'rgba(0,43,77,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.35)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  inputInner: { flex: 1, paddingHorizontal: 18, paddingVertical: 14, paddingRight: 16, color: '#d1d1d1', fontSize: 16 },
  // Occhio come sibling nel row (no absolute): su Android position absolute fa intercettare i tap dal TextInput.
  eyeBtn: { paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', minWidth: 48 },
  legalBlock: { marginVertical: 10 },
  legalBlockText: {
    fontSize: 10,
    lineHeight: 12,
    color: 'rgba(197, 160, 89, 0.6)',
    textAlign: 'justify',
    marginBottom: 8,
  },
  legalLink: { fontSize: 12, color: '#c5a059', textDecorationLine: 'underline', marginBottom: 2 },
  legalCheckRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  legalCheckText: {
    fontSize: 10,
    lineHeight: 12,
    color: 'rgba(197, 160, 89, 0.6)',
    flex: 1,
  },
  strengthBarWrap: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  criteriaWrap: { marginBottom: 14 },
  criterionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  criterionText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  criterionTextMet: { color: 'rgba(255,255,255,0.9)' },
  hintText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 },
  btn: {
    backgroundColor: '#c5a059',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnPressed: { opacity: 0.92 },
  btnConfirm: { opacity: 1 },
  btnConfirmDisabled: { opacity: 0.5 },
  btnText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 },
  toggleBtn: { alignItems: 'center', marginTop: 8 },
  backStepBtn: { alignItems: 'center', marginTop: 12 },
  backStepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleText: { color: '#c5a059', fontSize: 14 },
  forgotLink: { color: '#c5a059', fontSize: 14 },
  langBtn: { alignItems: 'center', marginTop: 24 },
  legalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  legalModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#1a2332',
    borderRadius: 16,
    overflow: 'hidden',
  },
  legalModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c5a059',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  legalModalScroll: { maxHeight: 380 },
  legalModalScrollContent: { padding: 14, paddingBottom: 20 },
  legalModalSection: { marginBottom: 10 },
  legalModalSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 4,
  },
  legalModalSectionContent: {
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'justify',
  },
  legalModalIntro: { marginBottom: 8 },
  legalModalFooter: { marginTop: 6, fontStyle: 'italic' },
  legalModalCloseBtn: {
    backgroundColor: '#c5a059',
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  legalModalCloseText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 },
});
