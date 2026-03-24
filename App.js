import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
  Share,
  Pressable,
  RefreshControl,
  Linking,
  AppState,
} from 'react-native';
import { getLocales } from 'expo-localization';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
// Tastiera: vista avvolta in KeyboardAvoidingView + android softwareKeyboardLayoutMode in app.json
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
// Su web expo-haptics non è supportato e può lanciare: no-op per evitare crash / pagina bianca
if (Platform.OS === 'web') {
  const noop = () => Promise.resolve();
  Haptics.impactAsync = noop;
  Haptics.notificationAsync = noop;
  Haptics.selectionAsync = noop;
}
import * as Speech from 'expo-speech';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';

// Mantieni lo splash nativo visibile fino a quando l'auth non è pronta (evita schermata "Caricamento...")
try { SplashScreen.preventAutoHideAsync?.(); } catch (_) {}

// Expo Go = runtime con moduli nativi limitati (molte API richiedono dev build).
const IS_EXPO_GO = Constants?.appOwnership === 'expo';

// Setup notifiche dopo il primo frame, per ridurre crash all'avvio su build standalone
const setNotificationsHandlerSafe = () => {
  try {
    if (Platform.OS === 'web') return;
    if (IS_EXPO_GO) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (_) {}
};
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { signUpWithProfile, signOut } from './src/services/authService';
import { configureGoogleSignIn } from './src/services/socialAuthService';
import { auth } from './src/config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import AuthScreen from './src/screens/AuthScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { loadChatHistory, saveMessageToDb, saveToMemory, loadMemory, clearMemorySections, deleteMemoryNote } from './src/services/chatService';
import { callOxyAi, ABORTED_MESSAGE, RATE_LIMIT_SENTINEL } from './src/services/aiService';
import { getAllFlags, fetchServerFlags, FEATURE_KEYS } from './src/services/featureFlagsService';
import { track, EVENTS } from './src/services/analyticsService';
import { loadDiary, saveDiaryEntry, deleteDiaryEntry } from './src/services/diaryService';
import { loadStoryState, saveStoryState } from './src/services/storyService';
import { STORIES } from './src/data/stories';
import { PLANS, CURRENCY_DEFAULT, TOKEN_PACKS, getPlanForDisplay, getPlanFeatures, getLaunchDiscountPrice } from './src/config/pricingConfig';
import { getBackendBaseUrl, isBackendUrlFromEnv } from './src/config/backendConfig';
import { VOICE_OPTIONS, DEFAULT_VOICE_ID } from './src/data/voiceOptions';
import { transcribe } from './src/services/voiceService';
import { fetchTtsAudio } from './src/services/ttsService';
import * as FileSystem from 'expo-file-system/legacy';
import { getOxyKey, setOxyKey, removeOxyKey, isValidKeyFormat, getKeyForCurrentUser, getGeminiKey, setGeminiKey, removeGeminiKey, isValidGeminiKeyFormat } from './src/services/oxyKeyService';

/** Legge URI audio (file:// o blob:) in base64. Su web/desktop usa fetch+FileReader perché FileSystem non gestisce blob. */
async function readAudioUriAsBase64(uri) {
  if (!uri || typeof uri !== 'string') return '';
  const isWeb = Platform.OS === 'web';
  const isBlob = uri.startsWith('blob:');
  const useFetch = isWeb || isBlob;
  const tryFetch = async () => {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = typeof FileReader !== 'undefined' ? new FileReader() : null;
      if (!reader) {
        reject(new Error('FILE_READER_UNAVAILABLE'));
        return;
      }
      reader.onloadend = () => {
        const d = reader.result;
        resolve(d && typeof d === 'string' && d.includes(',') ? d.split(',')[1] : '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };
  const tryFileSystem = () => FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  if (useFetch) {
    try {
      return await tryFetch();
    } catch (e) {
      if (!isWeb) {
        try { return await tryFileSystem(); } catch (_) {}
      }
      throw e;
    }
  }
  try {
    return await tryFileSystem();
  } catch (e) {
    try { return await tryFetch(); } catch (_) {}
    throw e;
  }
}

// Helper per programmare un promemoria locale sul device
export async function scheduleLocalReminder(date, body, data = undefined, title = 'OXY') {
  try {
    if (Platform.OS === 'web') return null;
    if (IS_EXPO_GO) return null;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    // Richiedi permesso prima di schedulare (Android 13+): senza non parte la notifica
    const { status: existing } = await Notifications.getPermissionsAsync();
    let granted = existing === 'granted';
    if (!granted) {
      const { status } = await Notifications.requestPermissionsAsync();
      granted = status === 'granted';
    }
    if (!granted) return null;
    // Trigger esplicito type:'date' (più affidabile su Android che passare solo Date)
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'OXY',
        body: body || 'Promemoria',
        data: data && typeof data === 'object' ? data : undefined,
      },
      trigger: { type: 'date', date },
    });
    return id;
  } catch (_) {
    return null;
  }
}
import * as ImagePicker from 'expo-image-picker';
import { getWelcomePhraseForHour, getHeaderPhraseForHour } from './src/utils/motivationalPhrases';
import { getWelcomeMessageAfterPayment } from './src/utils/welcomeAfterPayment';
import CountryPicker, { DARK_THEME } from './src/components/CountryPickerAdapter';
import { LANGUAGES, LANGUAGE_LABELS, t as translate } from './src/i18n/translations';
import { useNetInfo } from './src/hooks/useNetInfo';
import { getLegalContent } from './src/content/legalContent';

// Costanti
const STORAGE_KEYS = {
  USER_DATA: '@oxyreal:userData',
  SERVER_CONFIG: '@oxyreal:serverConfig',
  IS_LOGGED_IN: '@oxyreal:isLoggedIn',
  CUSTOM_AI_NAME: '@oxyreal:customAiName',
  VOICE_ID: '@oxyreal:voiceId',
  PROFILE_IMAGE_URI: '@oxyreal:profileImageUri',
  ADMIN_BYPASS: '@oxyreal:adminBypass',
  VOICE_REPLY_MODE: '@oxyreal:voiceReplyMode',
  LANGUAGE: '@oxyreal:language',
  HAS_CHOSEN_LANGUAGE_AT_STARTUP: '@oxyreal:hasChosenLanguageAtStartup',
  HAS_CHOSEN_PLAN_PREFIX: '@oxyreal:hasChosenPlan:', // + userId → 'true' quando ha scelto Abbonamento/Lifetime (primo avvio o primo login)
  HAS_SKIPPED_SHARE_GATE_PREFIX: '@oxyreal:hasSkippedShareGate:', // + userId → 'true' se free ha scelto "Entra in chat" senza condividere (go-live solo free: massimizza registrazioni)
  // Student Edition (percorso Studio / Vita & Lavoro)
  USE_CASE: '@oxyreal:useCase', // 'study' | 'life'
  STUDENT_LEVEL: '@oxyreal:studentLevel', // 'highschool' | 'university'
  STUDENT_FOCUS: '@oxyreal:studentFocus',
  STUDENT_EXAM_NAME: '@oxyreal:studentExamName',
  STUDENT_EXAM_DATE: '@oxyreal:studentExamDate', // ISO string (YYYY-MM-DD) oppure ''
  STUDENT_REMINDER_ENABLED: '@oxyreal:studentReminderEnabled', // 'true' | 'false'
  STUDENT_REMINDER_TIME: '@oxyreal:studentReminderTime', // 'HH:MM'
  STUDENT_REMINDER_IDS: '@oxyreal:studentReminderIds', // JSON array di ids schedulati
  // Appuntamenti (promemoria da chat)
  APPOINTMENTS: '@oxyreal:appointments', // JSON array di appuntamenti salvati localmente
  // Ultima versione vista (per punto "app aggiornata" vicino all'icona menu)
  LAST_SEEN_VERSION: '@oxyreal:lastSeenVersion',
  HAS_SEEN_MEMORY_VAULT_INTRO: '@oxyreal:hasSeenMemoryVaultIntro',
};

/** Nome predefinito dell'IA. Il cambio nome è un'opzione a pagamento (HAS_CUSTOM_AI_NAME_FEATURE). */
const DEFAULT_AI_NAME = 'OXY';
const HAS_CUSTOM_AI_NAME_FEATURE = false;


// Distribuzione: 'subscription' = abbonamento (Oxy Key nascosta, solo backend); 'one_time_purchase' = acquisto senza abbonamento (mostra Inserisci Oxy Key)
const APP_MODE = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_MODE || 'subscription').toLowerCase();
const SHOW_OXY_KEY_OPTION = APP_MODE === 'one_time_purchase';
const DOCS_EMAIL_AUTOSEND_UI = String(typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DOCS_EMAIL_AUTOSEND || '').trim() === 'true';
// Data go-live per sconto lancio 50% primi 30 gg (impostare EXPO_PUBLIC_GO_LIVE_DATE in build produzione)
const GO_LIVE_DATE_STR = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GO_LIVE_DATE) || '2026-03-15';
// Flusso commerciale obbligatorio: niente piano gratuito.
const SHOW_UPGRADE = true;
// Link Play Store per condivisione (Condividi OXY → 50% sconto quando si attivano i piani)
const PLAY_STORE_APP_ID = (typeof Constants !== 'undefined' && Constants.expoConfig?.android?.package) || 'com.oxyreal.app';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_APP_ID}`;
// Beta / dev: ogni avvio con utente non loggato = mostra sempre prima la schermata lingua. In sviluppo (Expo Go, __DEV__) è sempre true; in produzione solo se EXPO_PUBLIC_BETA_ALWAYS_SHOW_LANGUAGE_FIRST=true.
const BETA_ALWAYS_SHOW_LANGUAGE_FIRST = (typeof __DEV__ !== 'undefined' && __DEV__) || String(typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BETA_ALWAYS_SHOW_LANGUAGE_FIRST || '').trim() === 'true';

let SCREEN_WIDTH = 400;
try { SCREEN_WIDTH = Dimensions.get('window').width; } catch (_) {}
const MODES_GRID_COLUMNS = 4;
const MODES_GRID_GAP = 6;
const MODES_CARD_WIDTH = (SCREEN_WIDTH - 40 - MODES_GRID_GAP * (MODES_GRID_COLUMNS - 1)) / MODES_GRID_COLUMNS;

// Chat di gruppo: max 4-5 partecipanti, ognuno deve avere Oxy Key configurata
const MAX_GROUP_MEMBERS = 5;

// Power Badges: definizioni in src/data/powerBadges.js
import { POWER_BADGES, getBadgePrompt, messageStartsWithBadgePrompt } from './src/data/powerBadges';


/** Limite lunghezza messaggio chat (audit 6.2, differenziato per modello commerciale)
 *  - subscription: 1500 caratteri (per contenere costi e favorire messaggi più compatti)
 *  - one_time_purchase: 8000 caratteri (utente usa la propria chiave, costi a suo carico)
 */
const MAX_MESSAGE_LENGTH = APP_MODE === 'subscription' ? 1500 : 8000;

// Avatar: solo iniziali dal nome (nessuna immagine di default)
const avatarInitialsUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=c5a059&color=fff`;

/** Nome e cognome: prima lettera maiuscola, resto minuscolo (es. "MARCO ROSSI" → "Marco Rossi") */
const formatDisplayName = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Validazione Regex (sicura e comune standard)
const VALIDATION = {
  // TLD minimo 2 caratteri alfabetici
  email: /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/,
  phone: /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[A-Za-z\s]{2,50}$/,
  date: /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d{2}$/,
};

// Validazione password con messaggi tradotti (validazione "lazy" - solo al click)
const validatePasswordDetailed = (password, t) => {
  const errors = [];
  if (!password || password.trim().length === 0) {
    errors.push(t('register.validation.passwordEmpty'));
    return errors;
  }
  if (password.length < 8) {
    errors.push(t('register.validation.passwordMinLength'));
  }
  if (!/[a-z]/.test(password)) {
    errors.push(t('register.validation.passwordMissingLowercase'));
  }
  if (!/[A-Z]/.test(password)) {
    errors.push(t('register.validation.passwordMissingUppercase'));
  }
  if (!/\d/.test(password)) {
    errors.push(t('register.validation.passwordMissingNumber'));
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push(t('register.validation.passwordMissingSymbol'));
  }
  return errors;
};

const getLocaleForLanguage = (lang) => ({ it: 'it-IT', en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', zh: 'zh-CN' }[lang] || 'en-US');

// Funzioni di utility sicure
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '••••@••••';
  const [user, domain] = email.split('@');
  if (!domain) return '••••@••••';
  return `${user.charAt(0)}${'•'.repeat(Math.max(3, user.length - 2))}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '+•• ••• ••• ••••';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '+•• ••• ••• ••••';
  return `+${digits.slice(0, 2)} ••• ••• ${digits.slice(-4)}`;
};

// Componenti memoizzati per performance
const AppleIcon = memo(() => (
  <View style={styles.appleIconWrapper}>
    <View style={styles.appleBody} />
    <View style={styles.appleLeaf} />
  </View>
));

const DriveIcon = memo(({ active }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.driveTriangle, { borderBottomColor: active ? '#c5a059' : '#c5a059' }]} />
  </View>
));

const ICloudIcon = memo(({ active }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.cloudCircle, { borderColor: active ? '#c5a059' : '#c5a059' }]} />
    <View style={[styles.cloudCircleSmall, { borderColor: active ? '#c5a059' : '#c5a059', left: 4 }]} />
    <View style={[styles.cloudCircleSmall, { borderColor: active ? '#c5a059' : '#c5a059', right: 4 }]} />
  </View>
));

const LocalIcon = memo(({ active }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.folderBody, { borderColor: active ? '#c5a059' : '#c5a059' }]}>
      <View style={[styles.folderTab, { backgroundColor: active ? '#c5a059' : '#c5a059' }]} />
    </View>
  </View>
));

const ServerIcon = memo(({ active }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.dbStack, { borderColor: active ? '#c5a059' : '#c5a059' }]} />
    <View style={[styles.dbStack, { borderColor: active ? '#c5a059' : '#c5a059', marginTop: 3 }]} />
  </View>
));

// Logo OXY + Real con tagline "Real Identity". Solo OXY Real pulsa; Real Identity è statico.
// Con fallback statico se Animated fallisce (evita crash su alcuni device).
const OxyLogo = ({ large, showTagline = true }) => {
  const [animFailed, setAnimFailed] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (animFailed) return;
    try {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } catch (_) {
      setAnimFailed(true);
    }
  }, [pulseAnim, animFailed]);
  const size = large ? 42 : 24;
  const sizeReal = Math.round(size * 0.72);
  const spacing = large ? 4 : 3;
  const textBlock = (
    <>
      <Text style={{
        color: '#c5a059',
        fontSize: size,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: spacing,
        textAlign: 'center',
      }}>
        OXY
      </Text>
      <Text style={{
        color: '#c5a059',
        fontSize: sizeReal,
        fontStyle: 'italic',
        letterSpacing: Math.max(1, spacing - 1),
        marginLeft: 2,
      }}>
        Real
      </Text>
    </>
  );
  return (
    <View style={{ alignSelf: 'center', alignItems: 'center' }}>
      {animFailed ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>{textBlock}</View>
      ) : (
        <Animated.View style={{ transform: [{ scale: pulseAnim }], flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap' }}>
          {textBlock}
        </Animated.View>
      )}
      {showTagline && (
        <Text style={{
          color: 'rgba(197,160,89,0.9)',
          fontSize: large ? 14 : 12,
          fontStyle: 'italic',
          marginTop: 6,
          letterSpacing: 1,
        }}>
          Real Identity
        </Text>
      )}
    </View>
  );
};

export default function App() {
  // Stati principali
  const [isLogged, setIsLogged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authConnectionError, setAuthConnectionError] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState({
    nomeUtente: '',
    emailPrincipale: '',
    emailSecondaria: '',
    telefonoRecupero: '',
  });

  const [currentPasswordHash, setCurrentPasswordHash] = useState(''); // In produzione: hash reale (bcrypt/Argon2)

  const { isConnected } = useNetInfo(); // Audit 6.3: banner offline solo quando rete assente

  // Primo frame minimale (solo View+Text) per evitare crash da SafeAreaProvider/LinearGradient/OxyLogo nativi
  const [safeToShowFullUI, setSafeToShowFullUI] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSafeToShowFullUI(true), 350);
    return () => clearTimeout(t);
  }, []);

  // Handler notifiche dopo il primo render (evita crash all'avvio in build standalone)
  useEffect(() => {
    const t = setTimeout(setNotificationsHandlerSafe, 500);
    return () => clearTimeout(t);
  }, []);

  // Deep-link interno: quando l'utente tocca una notifica Student, apriamo OXY Student (o il flow indicato)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (IS_EXPO_GO) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data || {};
        if (!data || typeof data !== 'object') return;
        if (data.oxyStudent) {
          // Assicura percorso Studio
          setUseCase('study');
          AsyncStorage.setItem(STORAGE_KEYS.USE_CASE, 'study').catch(() => {});
          const flow = String(data.flow || 'student_home');
          if (flow === 'student_home') {
            setShowStudentHomeModal(true);
          }
        } else if (data.oxyAppointment) {
          // Promemoria appuntamento: porta l'utente in chat (assistente) e chiudi menu.
          setViewAttiva('chat');
          setShowMenuModal(false);
          setMenuTab('prompt');
          setMenuSubView(null);
        }
      } catch (_) {}
    });
    return () => sub?.remove?.();
  }, []);

  // Notifiche locali: richiesta permessi DOPO che l'app è visibile (riduce crash avvio Android)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (IS_EXPO_GO) return;
    const t = setTimeout(async () => {
      try {
        const settings = await Notifications.getPermissionsAsync();
        if (!settings.granted) {
          await Notifications.requestPermissionsAsync();
        }
        if (Platform.OS === 'android') {
          const channelName = translate(language, 'notifications.channelName') || 'Oxy';
          await Notifications.setNotificationChannelAsync('default', {
            name: channelName,
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
      } catch (_) {}
    }, 2500);
    return () => clearTimeout(t);
  }, [language]);

  // Login / 2FA
  const [nomeCognomeInput, setNomeCognomeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [is2FAStage, setIs2FAStage] = useState(false);
  const [channelSelected, setChannelSelected] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpFocusedIndex, setOtpFocusedIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const otpInputRefs = useRef([]);
  const otpResendTimerRef = useRef(null);

  // Registrazione
  const [showRegister, setShowRegister] = useState(false);
  const [showPlanChoiceAfterSignup, setShowPlanChoiceAfterSignup] = useState(false);
  // true = utente ha tap Abbonamento/Lifetime → mostriamo chat con menu billing, non la full-screen scelta piano
  const [planChoiceDismissedToBilling, setPlanChoiceDismissedToBilling] = useState(false);
  // Scelta tipo piano (Abbonamento/Lifetime) fatta → mostriamo schermata Starter / Pro / Elite
  const [showPlanTierSelection, setShowPlanTierSelection] = useState(false);
  const [planTypeChosen, setPlanTypeChosen] = useState(null); // 'subscription' | 'lifetime'
  const [skippedShareGateForFree, setSkippedShareGateForFree] = useState(false); // true = free user ha tap "Entra in chat" senza condividere
  const [regData, setRegData] = useState({
    nome: '',
    cognome: '',
    dataNascita: '',
    email: '',
    emailSecondaria: '',
    telefono: '',
    password: '',
    confirmPassword: '',
  });
  const [phoneCountry, setPhoneCountry] = useState({
    cca2: 'IT',
    callingCode: '39',
    flag: '🇮🇹',
  });
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Chat & UI
  const [viewAttiva, setViewAttiva] = useState('chat');
  const [moduloAttivo, setModuloAttivo] = useState('Aiuto Mail');
  const [stickyBadge, setStickyBadge] = useState(null); // Modalità attiva (Power Badge): resta attiva finché l'utente non tocca "Esci"
  const [testo, setTesto] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(45); // auto-expand multiline (min 45, max ~5-6 righe)
  // Student Edition (profilo studio)
  const [useCase, setUseCase] = useState(null); // 'study' | 'life' | null (non scelto)
  const [studentLevel, setStudentLevel] = useState(null); // 'highschool' | 'university' | null
  const [studentFocus, setStudentFocus] = useState('');
  const [studentExamName, setStudentExamName] = useState('');
  const [studentExamDate, setStudentExamDate] = useState(''); // YYYY-MM-DD
  const [studentReminderEnabled, setStudentReminderEnabled] = useState(false);
  const [studentReminderTime, setStudentReminderTime] = useState('18:30');
  const [showUseCaseOnboarding, setShowUseCaseOnboarding] = useState(false);
  const [useCaseOnboardingStep, setUseCaseOnboardingStep] = useState('usecase'); // 'usecase' | 'level' | 'focus' | 'exam'
  const [showStudentHomeModal, setShowStudentHomeModal] = useState(false);
  const [studentHomeOpenKey, setStudentHomeOpenKey] = useState(0);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [messaggi, setMessaggi] = useState([
    { id: '1', tipo: 'bot', testo: getWelcomePhraseForHour() },
  ]);
  const [staCaricando, setStaCaricando] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef(null);
  const chatInputRef = useRef(null);
  const pendingAppointmentRef = useRef(null); // { title, startAt: Date }
  const inAppReminderTimersRef = useRef([]); // array di timeout ids (best-effort quando notifiche non disponibili)
  const recordingRef = useRef(null);
  const initialMessageRequestedRef = useRef(false);
  const appWasBackgroundedRef = useRef(false);
  const [sessionWelcomeMessage, setSessionWelcomeMessage] = useState(null); // messaggio OXY in cima alla chat ogni volta che si rientra nell'app
  const sendMessageRef = useRef(null);
  const chatAbortControllerRef = useRef(null);
  const userRequestedStopRef = useRef(false); // "Ferma" durante animazione parola-per-parola
  const sendCooldownTimerRef = useRef(null);

  // Rate limit invio: blocco pulsante durante richiesta + 2s dopo completamento (successo o errore)
  const [sendInCooldown, setSendInCooldown] = useState(false);
  const freeLimitReached = false;
  const isSendBlocked = staCaricando || sendInCooldown || freeLimitReached;

  // Chat history per memorizzare scambi { role, content }
  const [chatHistory, setChatHistory] = useState([]);

  // Quick Start: riduce frizione; tutte le etichette nella lingua selezionata.
  const quickStartLabels = useMemo(() => ({
    title: translate(language, 'quickStart.title'),
    subtitle: translate(language, 'quickStart.subtitle'),
    study: translate(language, 'quickStart.study'),
    work: translate(language, 'quickStart.work'),
    wellbeing: translate(language, 'quickStart.wellbeing'),
    briefing: translate(language, 'quickStart.briefing'),
  }), [language]);

  const activateQuickStart = useCallback((kind, opts = {}) => {
    const { replaceText = false } = opts || {};
    // Se l'utente ha scelto Studio, il tap su "Studia" porta alla Home Student (non compila solo un template).
    if (kind === 'study' && useCase === 'study') {
      setShowStudentHomeModal(true);
      // Evita jank: niente focus input mentre la modal fa lo slide-in (Android può glitchare il testo).
      Keyboard.dismiss();
      return;
    }
    const badgeById = (id) => POWER_BADGES.find((b) => b.id === id) || null;
    const templates = {
      study: t('quickStart.studyPrompt'),
      work: t('quickStart.workPrompt'),
      wellbeing: t('quickStart.wellbeingPrompt'),
      briefing: t('quickStart.briefingPrompt'),
    };
    const badgeMap = {
      study: 'planner',
      work: 'analytic',
      wellbeing: 'routine',
      briefing: 'proactive',
    };
    const badge = badgeById(badgeMap[kind]);
    if (badge) setStickyBadge(badge);
    const nextTemplate = templates[kind] || '';
    // Se l'utente sta già scrivendo, non sovrascrivere: cambia solo modalità.
    // Per inserire il template forzatamente usare replaceText=true (es. long-press).
    if (replaceText || !String(inputMessage || '').trim()) {
      setInputMessage(nextTemplate);
    }
    // Porta subito il focus sulla barra: "tocca e scrivi"
    setTimeout(() => chatInputRef.current?.focus?.(), 60);
  }, [t, inputMessage, useCase]);

  // Android: a volte durante la prima apertura di una modal "slide" il testo può glitchare.
  // Forziamo un re-mount del pannello una volta che la modal è visibile.
  useEffect(() => {
    if (!showStudentHomeModal) return;
    const id = requestAnimationFrame(() => setStudentHomeOpenKey((k) => k + 1));
    return () => cancelAnimationFrame(id);
  }, [showStudentHomeModal]);

  const showQuickStart = useMemo(() => {
    const hasUserMessages = (messaggi || []).some((m) => m?.tipo === 'user');
    return !hasUserMessages && !staCaricando;
  }, [messaggi, staCaricando]);

  // ——— Student reminders (local notifications) ———
  const normalizeIsoDate = useCallback((raw) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    // accetta YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // accetta DD/MM/YYYY
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      if (yyyy >= 1900 && yyyy <= 2100 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
    }
    return '';
  }, []);

  const formatDateDDMMYYYY = useCallback((raw) => {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }, []);

  const parseTimeHHMM = useCallback((raw) => {
    const m = String(raw || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return { hour: hh, minute: mm };
  }, []);

  const cancelStudentReminders = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (IS_EXPO_GO) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDENT_REMINDER_IDS);
      const ids = raw ? JSON.parse(raw) : [];
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === 'string' && id.trim()) {
            await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
          }
        }
      }
    } catch (_) {}
    await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_REMINDER_IDS, JSON.stringify([])).catch(() => {});
  }, []);

  const scheduleStudentReminders = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (IS_EXPO_GO) return;
    if (!studentReminderEnabled) {
      await cancelStudentReminders();
      return;
    }
    const time = parseTimeHHMM(studentReminderTime) || { hour: 18, minute: 30 };
    const examISO = normalizeIsoDate(studentExamDate);
    const examName = String(studentExamName || '').trim();
    const level = studentLevel === 'university' ? 'university' : 'highschool';
    const studentTitle = translate(language, 'notifications.studentTitle');

    await cancelStudentReminders();

    const ids = [];
    // 1) Reminder giornaliero ripetuto (nella lingua selezionata)
    try {
      const baseDaily = examName
        ? translate(language, 'notifications.studentBaseForName', { examName })
        : (level === 'university' ? translate(language, 'notifications.studentBaseForYourExam') : translate(language, 'notifications.studentBaseForYourTest'));
      const body = level === 'university'
        ? translate(language, 'notifications.studentDailyBodyUni', { base: baseDaily })
        : translate(language, 'notifications.studentDailyBodyHs', { base: baseDaily });
      const repeatId = await Notifications.scheduleNotificationAsync({
        content: {
          title: studentTitle,
          body,
          data: { oxyStudent: true, flow: 'student_home' },
        },
        trigger: { hour: time.hour, minute: time.minute, repeats: true },
      });
      if (repeatId) ids.push(repeatId);
    } catch (_) {}

    // 2) Se c'è data esame: notifiche “evento” (7 giorni / 1 giorno / giorno esame)
    if (examISO) {
      const [y, m, dd] = examISO.split('-').map(Number);
      const examDate = new Date(y, (m - 1), dd, 0, 0, 0, 0);
      const baseEvent = examName
        ? translate(language, 'notifications.studentBaseForName', { examName })
        : translate(language, 'notifications.studentBaseForExam');
      const mk = async (daysBefore, bodyKey) => {
        const d = new Date(examDate);
        d.setDate(examDate.getDate() - daysBefore);
        d.setHours(time.hour, time.minute, 0, 0);
        if (d.getTime() < Date.now() + 60 * 1000) return;
        const bodyText = translate(language, bodyKey, { base: baseEvent });
        const id = await scheduleLocalReminder(d, bodyText, { oxyStudent: true, flow: 'student_home' }, studentTitle);
        if (id) ids.push(id);
      };
      await mk(7, 'notifications.student7Days');
      await mk(1, 'notifications.student1Day');
      await mk(0, 'notifications.student0Days');
    }

    await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_REMINDER_IDS, JSON.stringify(ids)).catch(() => {});
  }, [
    language,
    studentReminderEnabled,
    studentReminderTime,
    studentExamDate,
    studentExamName,
    studentLevel,
    normalizeIsoDate,
    parseTimeHHMM,
    cancelStudentReminders,
  ]);

  // ——— Appuntamenti / promemoria (MVP) ———
  const parseGenericReminderFromMessage = useCallback((rawText) => {
    const text = String(rawText || '').trim();
    if (!text) return null;
    const lower = text.toLowerCase();

    // Deve essere una richiesta esplicita di promemoria (evita false positive).
    // "ricordami", "ricordarmi" (puoi ricordarmi), "promemoria", "avvisami", "mi ricordi"
    const looksLikeReminder = /\b(ricorda(?:mi|melo)?|ricordarmi|promemoria|avvisami|notificami)\b/.test(lower) || /\bmi\s+ricordi\b/.test(lower);
    if (!looksLikeReminder) return null;

    // --- date ---
    const now = new Date();
    let baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const ddmmyyyy = lower.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    const yyyymmdd = lower.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    let explicitToday = false;
    if (ddmmyyyy) {
      const dd = Number(ddmmyyyy[1]);
      const mm = Number(ddmmyyyy[2]);
      const yyyy = Number(ddmmyyyy[3]);
      baseDate = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    } else if (yyyymmdd) {
      const yyyy = Number(yyyymmdd[1]);
      const mm = Number(yyyymmdd[2]);
      const dd = Number(yyyymmdd[3]);
      baseDate = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    } else if (/\bdopodomani\b/.test(lower)) {
      baseDate.setDate(baseDate.getDate() + 2);
    } else if (/\bdomani\b|\bdomattina\b/.test(lower)) {
      baseDate.setDate(baseDate.getDate() + 1);
    } else if (/\boggi\b|\bstasera\b|\bstamattina\b/.test(lower)) {
      explicitToday = true;
    }

    // --- time ---
    let hh = null;
    let min = 0;
    const alle = lower.match(/\balle\s*(\d{1,2})(?:[:.](\d{2}))?\b/);
    const at = lower.match(/\bat\s*(\d{1,2})(?:[:.](\d{2}))?\b/);
    const hhmm = lower.match(/\b(\d{1,2})[:.](\d{2})\b/);
    const pick = alle || at || hhmm;
    if (pick) {
      hh = Number(pick[1]);
      min = pick[2] != null ? Number(pick[2]) : 0;
    }
    if (hh == null || Number.isNaN(hh) || hh < 0 || hh > 23 || min < 0 || min > 59) return null;

    const startAt = new Date(baseDate);
    startAt.setHours(hh, min, 0, 0);

    // Se l'orario è già passato, non mentire: proponi altro.
    if (startAt.getTime() < Date.now() + 60 * 1000) {
      if (!explicitToday && !ddmmyyyy && !yyyymmdd) {
        // Se non ha detto "oggi" e non ha specificato data, assumiamo "domani" per UX.
        startAt.setDate(startAt.getDate() + 1);
      } else {
        return { kind: 'task', title: '', startAt, isPast: true };
      }
    }

    // --- subject ---
    let subject = '';
    const di = lower.match(/\bdi\s+([^.,\n]+)$/);
    const che = lower.match(/\bche\s+([^.,\n]+)$/);
    subject = (di?.[1] || che?.[1] || '').trim();
    if (!subject) {
      // fallback: togli la parte "ricordami/ricordarmi..." se possibile
      subject = text.replace(/^\s*(ricorda(?:mi|melo)?|ricordarmi|promemoria|avvisami|notificami|mi\s+ricordi)\b/i, '').trim();
    }
    subject = String(subject || '').trim();
    if (subject) subject = subject.slice(0, 80);
    const title = subject ? `Promemoria: ${subject}` : 'Promemoria';

    return { kind: 'task', title, startAt, isPast: false };
  }, []);

  const scheduleInAppReminderBestEffort = useCallback((whenDate, title) => {
    try {
      const ms = whenDate instanceof Date ? whenDate.getTime() - Date.now() : NaN;
      if (!Number.isFinite(ms) || ms <= 0) return null;
      // Limite prudenziale: 24h (evita timeout giganteschi e leak)
      if (ms > 24 * 60 * 60 * 1000) return null;
      const id = setTimeout(() => {
        try {
          Alert.alert(t('common.reminderTitle'), title || t('common.reminder'));
        } catch (_) {}
      }, ms);
      inAppReminderTimersRef.current = Array.isArray(inAppReminderTimersRef.current)
        ? [...inAppReminderTimersRef.current, id]
        : [id];
      return id;
    } catch (_) {
      return null;
    }
  }, [t]);

  const parseAppointmentFromMessage = useCallback((rawText) => {
    const text = String(rawText || '').trim();
    if (!text) return null;
    const lower = text.toLowerCase();

    // Must contain intent-ish keywords, otherwise we avoid false positives.
    const looksLikeAppointment =
      /\bappuntamento\b|\bvisita\b|\briunione\b|\bmeeting\b|\bdentista\b|\bdottore\b|\bmedico\b|\bospedale\b/.test(lower);
    if (!looksLikeAppointment) return null;

    // --- date ---
    const now = new Date();
    let baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Explicit date formats
    const ddmmyyyy = lower.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    const yyyymmdd = lower.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (ddmmyyyy) {
      const dd = Number(ddmmyyyy[1]);
      const mm = Number(ddmmyyyy[2]);
      const yyyy = Number(ddmmyyyy[3]);
      baseDate = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    } else if (yyyymmdd) {
      const yyyy = Number(yyyymmdd[1]);
      const mm = Number(yyyymmdd[2]);
      const dd = Number(yyyymmdd[3]);
      baseDate = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    } else if (/\bdopodomani\b/.test(lower)) {
      baseDate.setDate(baseDate.getDate() + 2);
    } else if (/\bdomani\b|\bdomattina\b/.test(lower)) {
      baseDate.setDate(baseDate.getDate() + 1);
    } else if (/\boggi\b|\bstasera\b|\bstamattina\b/.test(lower)) {
      // keep today
    } else if (/\btomorrow\b/.test(lower)) {
      baseDate.setDate(baseDate.getDate() + 1);
    } else {
      // If no date cue, don't auto-schedule.
      return null;
    }

    // --- time ---
    let hh = null;
    let min = 0;
    const alle = lower.match(/\balle\s*(\d{1,2})(?:[:.](\d{2}))?\b/);
    const at = lower.match(/\bat\s*(\d{1,2})(?:[:.](\d{2}))?\b/);
    const hhmm = lower.match(/\b(\d{1,2})[:.](\d{2})\b/);
    const hOnly = lower.match(/\b(\d{1,2})\b/);
    const pick = alle || at || hhmm;
    if (pick) {
      hh = Number(pick[1]);
      min = pick[2] != null ? Number(pick[2]) : 0;
    } else if (/\bmattina\b|\bdomattina\b|\bstamattina\b/.test(lower)) {
      hh = 9; min = 0;
    } else if (/\bpomeriggio\b/.test(lower)) {
      hh = 15; min = 0;
    } else if (/\bsera\b|\bstasera\b/.test(lower)) {
      hh = 20; min = 0;
    } else if (hOnly && /\balle\b/.test(lower)) {
      hh = Number(hOnly[1]); min = 0;
    }
    if (hh == null || Number.isNaN(hh) || hh < 0 || hh > 23 || min < 0 || min > 59) return null;

    const startAt = new Date(baseDate);
    startAt.setHours(hh, min, 0, 0);
    if (startAt.getTime() < Date.now() + 60 * 1000) return null;

    // --- title / subject ---
    let subject = '';
    const dal = lower.match(/\bdal\s+([^.,\n]+)$/);
    const da = lower.match(/\bda\s+([^.,\n]+)$/);
    const con = lower.match(/\bcon\s+([^.,\n]+)$/);
    subject = (dal?.[1] || da?.[1] || con?.[1] || '').trim();
    if (subject) subject = subject.slice(0, 40);
    const title = subject ? t('common.appointmentWithSubject', { subject }) : t('common.appointment');

    return { title, startAt };
  }, [t]);

  const addAppointmentLocal = useCallback(async (appt) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      const list = raw ? JSON.parse(raw) : [];
      const safe = Array.isArray(list) ? list : [];
      safe.unshift(appt);
      // keep small
      const next = safe.slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(next));
    } catch (_) {}
  }, []);

  const scheduleAppointmentNotifications = useCallback(async ({ title, startAt }) => {
    if (Platform.OS === 'web') return [];
    const deltaMs = startAt instanceof Date ? (startAt.getTime() - Date.now()) : NaN;
    // Regola UX:
    // - Se è entro 1 ora: avvisa 30 min prima e poi ogni 10 min fino all'ora.
    // - Se è oltre 1 ora (es. tra giorni): basta 1 ora prima (e all'ora).
    const offsetsMin = Number.isFinite(deltaMs) && deltaMs <= 60 * 60 * 1000
      ? [-30, -20, -10, 0]
      : [-60, 0];
    const ids = [];
    for (const off of offsetsMin) {
      const d = new Date(startAt.getTime() + off * 60 * 1000);
      if (d.getTime() < Date.now() + 60 * 1000) continue;
      const abs = Math.abs(off);
      const label = off === 0 ? 'Adesso' : (abs === 60 ? '1 ora' : `${abs} min`);
      const body = off === 0
        ? `${title} ora.`
        : `${title} tra ${label}.`;
      // data: usabile per deep link futuri
      if (IS_EXPO_GO) {
        // Expo Go: niente notifiche background affidabili. Fallback in-app (se app resta aperta).
        scheduleInAppReminderBestEffort(d, body);
      } else {
        const id = await scheduleLocalReminder(d, body, { oxyAppointment: true, kind: 'appointment', startAt: startAt.toISOString() }, 'OXY');
        if (id) ids.push(id);
      }
    }
    return ids;
  }, []);

  // Cloud / Server
  const [sorgenteSelezionata, setSorgenteSelezionata] = useState(null);
  const [serverConfig, setServerConfig] = useState({ host: '', username: '', token: '' });
  const [cloudServerTesting, setCloudServerTesting] = useState(false);
  const [cloudLocalExporting, setCloudLocalExporting] = useState(false);
  const [cloudImportOpen, setCloudImportOpen] = useState(false);
  const [cloudImportPayload, setCloudImportPayload] = useState('');
  const [docPickerLoading, setDocPickerLoading] = useState(false);
  const [lastPickedDocs, setLastPickedDocs] = useState([]); // [{ name, chars }]
  const [lastPickedDocAssets, setLastPickedDocAssets] = useState([]); // [{ uri, name, mimeType, size }]
  const [docEmailModalOpen, setDocEmailModalOpen] = useState(false);
  const [composerActionsOpen, setComposerActionsOpen] = useState(false);
  const [docEmailTo, setDocEmailTo] = useState('');
  const [docEmailSending, setDocEmailSending] = useState(false);
  const [docEmailAutoMode, setDocEmailAutoMode] = useState(false);

  // Menu messaggio (long-press stile WhatsApp): Copia, Inoltra, Condividi, Salva come obiettivo, Ricordamelo
  const [messageMenuVisible, setMessageMenuVisible] = useState(false);
  const [selectedMessageText, setSelectedMessageText] = useState('');
  const [selectedMessageFromBot, setSelectedMessageFromBot] = useState(false);

  // Menu unico a destra (hamburger): doppia linguetta Prompt | Impostazioni
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuTab, setMenuTab] = useState('prompt'); // 'prompt' | 'impostazioni'
  const [menuSubView, setMenuSubView] = useState(null); // null | 'profilo' | 'sicurezza' | 'privacy' | 'termini' | 'abbonamento'
  const [azioniSubView, setAzioniSubView] = useState(null); // null | 'avvio' | 'strumenti' | 'modalita' (sotto-pagine Azioni)
  const [menuPromptMountKey, setMenuPromptMountKey] = useState(0);
  const menuActionsScrollRef = useRef(null);
  const [showModesModal, setShowModesModal] = useState(false);
  const [showMemoryVaultModal, setShowMemoryVaultModal] = useState(false);
  const [hasSeenMemoryVaultIntro, setHasSeenMemoryVaultIntro] = useState(true); // dopo load: false = mostrare modal "OXY ricorda"
  const [memoryVaultData, setMemoryVaultData] = useState(null);
  const [memoryVaultLoading, setMemoryVaultLoading] = useState(false);
  const [memoryVaultError, setMemoryVaultError] = useState(null);
  const [memoryVaultRefreshing, setMemoryVaultRefreshing] = useState(false);
  const [memoryVaultNewNote, setMemoryVaultNewNote] = useState('');
  const [memoryVaultSavingNote, setMemoryVaultSavingNote] = useState(false);
  // Roadmap: feature flags (per menu Diario, Storie, Community)
  const [featureFlags, setFeatureFlags] = useState({
    [FEATURE_KEYS.DIARY]: true,
    [FEATURE_KEYS.STORIES]: true,
    // Non mostrare feature non pronte: se visibili devono essere funzionanti.
    [FEATURE_KEYS.COMMUNITY]: true,
    [FEATURE_KEYS.GROUP_CHAT]: false,
  });
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [diaryData, setDiaryData] = useState({ themes: [], entries: [], progressSummary: '' });
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryRefreshing, setDiaryRefreshing] = useState(false);
  const [diaryNewEntry, setDiaryNewEntry] = useState('');
  const [diarySaving, setDiarySaving] = useState(false);
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [lastCompletedStoryTitle, setLastCompletedStoryTitle] = useState(null);
  const [storyState, setStoryState] = useState({ currentStoryId: null, stepIndex: 0, completed: [] });
  const [storyStateLoading, setStoryStateLoading] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showOxyTvComingSoonModal, setShowOxyTvComingSoonModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPianiInArrivoModal, setShowPianiInArrivoModal] = useState(false);
  const [upgradeModalPlanName, setUpgradeModalPlanName] = useState('Pro'); // 'Pro' | 'Elite' per messaggio
  const [communityTab, setCommunityTab] = useState('forYou'); // 'forYou' | 'explore' | 'ask'
  const [communityExploreHub, setCommunityExploreHub] = useState(null); // null | 'student' | 'pro' | 'wellbeing' | 'help'
  const [communityAskText, setCommunityAskText] = useState('');

  const refetchMemoryVault = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setMemoryVaultRefreshing(true);
    } else {
      setMemoryVaultLoading(true);
    }
    setMemoryVaultError(null);
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const data = idToken ? await loadMemory({ userId, idToken }) : null;
      setMemoryVaultData(data);
    } catch (e) {
      setMemoryVaultError(e?.message || translate('en', 'memoryVault.loadError'));
      setMemoryVaultData({ goals: [], keyFacts: [], identitySummary: '', lastContext: '' });
    } finally {
      setMemoryVaultLoading(false);
      setMemoryVaultRefreshing(false);
    }
  }, []);

  const refetchDiary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setDiaryRefreshing(true);
    else setDiaryLoading(true);
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const data = idToken ? await loadDiary(idToken) : { themes: [], entries: [], progressSummary: '' };
      setDiaryData(data);
    } catch (e) {
      setDiaryData({ themes: [], entries: [], progressSummary: '' });
    } finally {
      setDiaryLoading(false);
      setDiaryRefreshing(false);
    }
  }, []);

  const refetchStoryState = useCallback(async () => {
    setStoryStateLoading(true);
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const data = idToken ? await loadStoryState(idToken) : { currentStoryId: null, stepIndex: 0, completed: [] };
      setStoryState(data);
    } catch (e) {
      setStoryState({ currentStoryId: null, stepIndex: 0, completed: [] });
    } finally {
      setStoryStateLoading(false);
    }
  }, []);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [show2FAForUpdate, setShow2FAForUpdate] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Error feedback (login / registrazione)
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Avatar fallback
  const [avatarError, setAvatarError] = useState(false);

  // TTS toggle (disattivato di default per non disturbare)
  const [ttsEnabled] = useState(false);

  // Build label (per evitare confusione tra versioni installate)
  const buildLabel = useMemo(() => {
    const v = Application?.nativeApplicationVersion ? String(Application.nativeApplicationVersion) : '';
    const b = Application?.nativeBuildVersion ? String(Application.nativeBuildVersion) : '';
    return (v && b) ? `${v} (${b})` : (v || b || '');
  }, []);

  // Punto "app aggiornata" vicino all'icona menu: mostra finché l'utente non apre Impostazioni e vede la versione
  const [showUpdatedDot, setShowUpdatedDot] = useState(false);
  useEffect(() => {
    if (!buildLabel) return;
    (async () => {
      try {
        const lastSeen = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION);
        if (lastSeen != null && lastSeen !== '' && lastSeen !== buildLabel) setShowUpdatedDot(true);
      } catch (_) {}
    })();
  }, [buildLabel]);
  const markVersionSeen = useCallback(async () => {
    if (!buildLabel) return;
    setShowUpdatedDot(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, buildLabel);
    } catch (_) {}
  }, [buildLabel]);
  useEffect(() => {
    if (showMenuModal && menuTab === 'impostazioni') markVersionSeen();
  }, [showMenuModal, menuTab, markVersionSeen]);

  // Visibilità password (login + registrazione)
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [regPasswordVisible, setRegPasswordVisible] = useState(false);
  const [regConfirmPasswordVisible, setRegConfirmPasswordVisible] = useState(false);

  // Tracking lunghezza numero telefono per haptics
  const phoneDigitsLengthRef = useRef(0);

  // Lingua (i18n). Default app: inglese (en). Al primo avvio letta da AsyncStorage; dopo la scelta l'app usa la lingua scelta.
  const [language, setLanguage] = useState('en');
  // true = mostrare schermata lingua (primo avvio), false = passare a Login/Registrazione
  const [needFirstLaunchLanguageChoice, setNeedFirstLaunchLanguageChoice] = useState(false);
  // in dev/beta mostriamo lingua ogni avvio; dopo Conferma passiamo a Login/Registrazione
  const [hasChosenLanguageThisSession, setHasChosenLanguageThisSession] = useState(false);
  // lingua selezionata in attesa di conferma (tap su Conferma salva e porta a Login/Registrazione)
  const [pendingLanguageChoice, setPendingLanguageChoice] = useState(null);
  // true = mostrare scelta voce dopo pagamento riuscito, poi portare in Chat (Oxy accoglie)
  const [showVoiceChoiceAfterPayment, setShowVoiceChoiceAfterPayment] = useState(false);
  // voce selezionata nella schermata post-pagamento: Conferma salva e porta in Chat
  const [voiceChoicePending, setVoiceChoicePending] = useState(null);
  // ref: abbiamo mostrato la plan choice perché non pagato; se poi billing diventa active → mostriamo scelta voce poi Chat
  const hadSeenNotPaidThisSessionRef = useRef(false);
  // false fino a quando l'init lingua/AsyncStorage è completato: evita di montare AuthScreen prima che lo stato sia pronto (riduce crash avvio)
  const [appReady, setAppReady] = useState(false);

  // Frase emozionale sotto il nome (cambia ogni ora)
  const [headerPhrase, setHeaderPhrase] = useState(() => getHeaderPhraseForHour());

  // Oxy Key (OpenAI) e/o chiave Gemini (gratuita, costo zero per noi)
  const [hasOxyKey, setHasOxyKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [oxyKeyInput, setOxyKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showOxyKeyGate, setShowOxyKeyGate] = useState(false);
  const [oxyKeyError, setOxyKeyError] = useState('');
  const [geminiKeyError, setGeminiKeyError] = useState('');

  // Personalizzazione IA e profilo (nome: default OXY; con opzione a pagamento si può cambiare)
  const [customAiName, setCustomAiName] = useState(DEFAULT_AI_NAME);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE_ID);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [voiceReplyMode, setVoiceReplyMode] = useState(false); // true = dopo il mic invia e risponde a voce (mani libere)
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [storedAiName, setStoredAiName] = useState(DEFAULT_AI_NAME);
  const effectiveAiName = HAS_CUSTOM_AI_NAME_FEATURE && (customAiName || '').trim() ? (customAiName || '').trim() : DEFAULT_AI_NAME;

  // Chat di gruppo (max 4-5 partecipanti, ognuno deve avere chiave)
  const [groupMembers, setGroupMembers] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupMemberEmail, setGroupMemberEmail] = useState('');

  const t = useCallback(
    (key, params) => {
      const out = translate(language, key, params);
      return (out != null && typeof out === 'string') ? out : (key != null ? String(key) : '');
    },
    [language]
  );

  const COMMUNITY_HUBS = useMemo(() => ([
    { id: 'student', title: t('community.hubs.student.title'), subtitle: t('community.hubs.student.subtitle'), icon: 'graduation-cap' },
    { id: 'pro', title: t('community.hubs.pro.title'), subtitle: t('community.hubs.pro.subtitle'), icon: 'briefcase' },
    { id: 'wellbeing', title: t('community.hubs.wellbeing.title'), subtitle: t('community.hubs.wellbeing.subtitle'), icon: 'heart' },
    { id: 'help', title: t('community.hubs.help.title'), subtitle: t('community.hubs.help.subtitle'), icon: 'info-circle' },
  ]), [t]);

  const COMMUNITY_ROOMS = useMemo(() => ([
    // Student
    { id: 'stu_med', hub: 'student', title: t('community.rooms.stu_med.title'), subtitle: t('community.rooms.stu_med.subtitle'), icon: 'stethoscope' },
    { id: 'stu_law', hub: 'student', title: t('community.rooms.stu_law.title'), subtitle: t('community.rooms.stu_law.subtitle'), icon: 'gavel' },
    { id: 'stu_hs', hub: 'student', title: t('community.rooms.stu_hs.title'), subtitle: t('community.rooms.stu_hs.subtitle'), icon: 'book' },
    // Pro
    { id: 'pro_freelance', hub: 'pro', title: t('community.rooms.pro_freelance.title'), subtitle: t('community.rooms.pro_freelance.subtitle'), icon: 'rocket' },
    { id: 'pro_sales', hub: 'pro', title: t('community.rooms.pro_sales.title'), subtitle: t('community.rooms.pro_sales.subtitle'), icon: 'line-chart' },
    { id: 'pro_it', hub: 'pro', title: t('community.rooms.pro_it.title'), subtitle: t('community.rooms.pro_it.subtitle'), icon: 'code' },
    // Wellbeing
    { id: 'wb_routine', hub: 'wellbeing', title: t('community.rooms.wb_routine.title'), subtitle: t('community.rooms.wb_routine.subtitle'), icon: 'repeat' },
    { id: 'wb_stress', hub: 'wellbeing', title: t('community.rooms.wb_stress.title'), subtitle: t('community.rooms.wb_stress.subtitle'), icon: 'bullseye' },
    { id: 'wb_sleep', hub: 'wellbeing', title: t('community.rooms.wb_sleep.title'), subtitle: t('community.rooms.wb_sleep.subtitle'), icon: 'moon-o' },
    // Help
    { id: 'help_app', hub: 'help', title: t('community.rooms.help_app.title'), subtitle: t('community.rooms.help_app.subtitle'), icon: 'question-circle' },
  ]), [t]);

  const legal = useMemo(() => getLegalContent(language), [language]);

  const backendUrl = getBackendBaseUrl();
  const backendUrlIsFromEnv = isBackendUrlFromEnv();

  // Stato abbonamento/billing lato backend (usage = messaggi oggi per piani subscription)
  const [billingStatus, setBillingStatus] = useState({
    loading: false,
    active: false,
    status: 'none',
    planId: null,
    mode: null,
    usage: { used: 0, limit: null, tokensUsed: null, tokenBalance: null },
    sharedForDiscount: false,
    sharedAt: null,
  });
  const [billingPlanView, setBillingPlanView] = useState('subscription'); // 'subscription' | 'lifetime'
  const lastBillingAutoRefreshAtRef = useRef(0);

  const refreshBillingStatus = useCallback(async () => {
    if (!backendUrl) return;
    setBillingStatus((prev) => ({ ...prev, loading: true }));
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!idToken) {
        setBillingStatus({ loading: false, active: false, status: 'none', planId: null, mode: null, usage: { used: 0, limit: null, tokensUsed: null, tokenBalance: null } });
        return;
      }
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/billing/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBillingStatus((prev) => ({ ...prev, loading: false }));
        return;
      }
      const normalizedFree = data?.status === 'free' || data?.mode === 'free' || data?.planId === 'free';
      const nowActive = normalizedFree ? false : !!data.active;
      setBillingStatus({
        loading: false,
        active: nowActive,
        status: normalizedFree ? 'none' : (data.status || 'none'),
        planId: normalizedFree ? null : (data.planId || null),
        mode: normalizedFree ? null : (data.mode || null),
        usage: data.usage && typeof data.usage.used === 'number'
          ? {
              used: data.usage.used,
              limit: data.usage.limit ?? null,
              tokensUsed: typeof data.usage.tokensUsed === 'number' ? data.usage.tokensUsed : null,
              tokenBalance: typeof data.usage.tokenBalance === 'number' ? data.usage.tokenBalance : null,
            }
          : { used: 0, limit: null, tokensUsed: null, tokenBalance: null },
        sharedForDiscount: !!data.sharedForDiscount,
        sharedAt: data.sharedAt || null,
      });
      // Transizione da non-pagato a pagato in questa sessione → mostriamo scelta voce poi Chat
      if (nowActive && hadSeenNotPaidThisSessionRef.current) {
        hadSeenNotPaidThisSessionRef.current = false;
        setShowVoiceChoiceAfterPayment(true);
      }
    } catch (_) {
      setBillingStatus((prev) => ({ ...prev, loading: false }));
    }
  }, [backendUrl]);

  // Condividi OXY: apre share nativo con link Play Store. Registra 50% sconto SOLO se l'utente ha davvero condiviso (action === 'sharedAction'), non se chiude il foglio senza condividere.
  const shareOxyForDiscount = useCallback(async () => {
    try {
      const message = t('shareOxy.message');
      const url = PLAY_STORE_URL;
      const shareOptions = Platform.OS === 'android'
        ? { message: `${message}\n\n${url}`, title: t('shareOxy.title') }
        : { message: `${message}\n\n${url}`, title: t('shareOxy.title'), url };
      const result = await Share.share(shareOptions);
      // Solo "sharedAction" = utente ha scelto un'app e inviato. Chiudere il foglio senza inviare non deve dare il messaggio "Grazie".
      const didShare = result?.action === 'sharedAction';
      if (didShare && backendUrl && userId) {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        if (idToken) {
          await fetch(`${backendUrl.replace(/\/$/, '')}/api/user/share-done`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({}),
          });
          await refreshBillingStatus();
          Alert.alert(t('shareOxy.successTitle'), t('shareOxy.successBody'));
        }
      }
    } catch (e) {
      if (e?.message !== 'User did not share') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('chat.errorTitle'), e?.message || t('shareOxy.error'));
      }
    }
  }, [t, backendUrl, userId, refreshBillingStatus]);

  // Prodotto solo premium: nessun piano free.
  const isFreePlan = false;
  const effectiveVoiceId = voiceId || DEFAULT_VOICE_ID;
  const effectiveFlags = useMemo(() => {
    const planId = billingStatus?.active && billingStatus?.planId ? billingStatus.planId : null;
    const planFeatures = planId ? getPlanFeatures(planId) : null;
    return {
      ...featureFlags,
      [FEATURE_KEYS.DIARY]: planFeatures ? !!planFeatures.diary : featureFlags[FEATURE_KEYS.DIARY],
      [FEATURE_KEYS.STORIES]: planFeatures ? !!planFeatures.stories : featureFlags[FEATURE_KEYS.STORIES],
      [FEATURE_KEYS.COMMUNITY]: planFeatures ? !!planFeatures.community : featureFlags[FEATURE_KEYS.COMMUNITY],
      vision: planFeatures ? !!planFeatures.vision : true,
      cloud: planFeatures ? !!planFeatures.cloud : true,
    };
  }, [billingStatus?.active, billingStatus?.planId, billingStatus?.status, billingStatus?.mode, isFreePlan, featureFlags]);

  const openUpgradeModal = useCallback((planName) => {
    setUpgradeModalPlanName(planName);
    setShowUpgradeModal(true);
  }, []);

  const closeUpgradeModalAndGoToPayments = useCallback(() => {
    setShowUpgradeModal(false);
    setShowMenuModal(true);
    setMenuTab('impostazioni');
    setMenuSubView('abbonamento');
    setBillingPlanView('subscription');
  }, []);

  // Un tap su funzionalità bloccata apre la sezione Abbonamento.
  const openMenuToSubscription = useCallback(() => {
    setShowUpgradeModal(false);
    setShowMenuModal(true);
    setMenuTab('impostazioni');
    setMenuSubView('abbonamento');
    setBillingPlanView('subscription');
  }, []);

  const onLockedFeatureTap = useCallback(() => {
    if (SHOW_UPGRADE) {
      openMenuToSubscription();
    } else {
      Alert.alert(t('billing.pianiInArrivoTitle'), t('billing.featureLockedShareMessage'), [
        { text: t('common.close') },
        { text: t('shareOxy.button'), onPress: () => shareOxyForDiscount() },
      ]);
    }
  }, [SHOW_UPGRADE, t, openMenuToSubscription, shareOxyForDiscount]);

  // UX: nella sezione Abbonamento l'utente deve vedere lo stato subito.
  // Facciamo refresh automatico quando si apre la vista "abbonamento" (throttled).
  useEffect(() => {
    if (!showMenuModal) return;
    if (menuSubView !== 'abbonamento' && menuSubView !== 'oxykey') return;
    if (billingStatus.loading) return;
    const now = Date.now();
    if (now - (lastBillingAutoRefreshAtRef.current || 0) < 8000) return;
    lastBillingAutoRefreshAtRef.current = now;
    refreshBillingStatus();
  }, [showMenuModal, menuSubView, billingStatus.loading, refreshBillingStatus]);

  // Al ritorno in app (es. da Stripe) aggiorna billing per payment gate e flusso post-pagamento
  useEffect(() => {
    if (!isLogged) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshBillingStatus();
    });
    return () => sub.remove();
  }, [isLogged, refreshBillingStatus]);

  const openCheckoutForPlan = useCallback(
    async (planId) => {
      const urlBase = backendUrl;
      if (!urlBase) {
        Alert.alert(t('billing.alertUnavailableTitle'), t('billing.alertUnavailableBody'));
        return;
      }
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        if (!idToken) {
          Alert.alert(t('billing.alertAuthRequiredTitle'), t('billing.alertAuthRequiredBody'));
          return;
        }
        const res = await fetch(`${urlBase.replace(/\/$/, '')}/api/billing/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ planId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          Alert.alert(t('billing.alertCheckoutTitle'), data?.error || t('billing.alertCheckoutGenericError'));
          return;
        }
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window?.open) {
          window.open(data.url, '_blank', 'noopener,noreferrer');
        } else {
          const can = await Linking.canOpenURL(data.url);
          if (!can) {
            Alert.alert(t('billing.alertCheckoutTitle'), t('billing.alertCheckoutCantOpen'));
            return;
          }
          await Linking.openURL(data.url);
        }
      } catch (e) {
        Alert.alert(t('billing.alertCheckoutTitle'), t('billing.alertCheckoutOpenError'));
      }
      // Dopo il redirect l'utente tornerà all'app; il webhook aggiornerà lo stato.
      // Alla prossima apertura della schermata Abbonamento chiameremo refreshBillingStatus.
    },
    [backendUrl, t]
  );

  // Completare la sessione OAuth quando l'app si apre dal redirect (es. dopo login Google): chiude il browser e torna nell'app.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  // Google Sign-In: configurazione una tantum (webClientId da Firebase Console → Auth → Google → Web client ID)
  useEffect(() => {
    const webClientId = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
    if (webClientId) configureGoogleSignIn(webClientId);
  }, []);

  // Audio: parametri obbligatori DOPO che l'app è visibile (riduce crash avvio su alcuni Android)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const t = setTimeout(async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (_) {}
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Stato di autenticazione reale: esclusivamente onAuthStateChanged Firebase. isLoading = false solo quando Firebase restituisce user o null.
  useEffect(() => {
    const firebaseApiKey =
      ((typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_API_KEY) || Constants?.expoConfig?.extra?.firebase?.apiKey || '').trim();
    const hasFirebase = !!firebaseApiKey;
    if (!hasFirebase) {
      setUserId(null);
      setUserData({ nomeUtente: '', emailPrincipale: '', emailSecondaria: '', telefonoRecupero: '' });
      setIsLogged(false);
      setIsLoading(false);
      initialMessageRequestedRef.current = false;
      setSessionWelcomeMessage(null);
      return;
    }

    const AUTH_TIMEOUT_MS = 12000;
    const timeoutId = setTimeout(() => {
      setAuthConnectionError(true);
      setIsLoading(false);
    }, AUTH_TIMEOUT_MS);

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeoutId);
      setAuthConnectionError(false);
      if (user) {
        setUserId(user.uid);
        const fromFirebase = {
          nomeUtente: user.displayName || '',
          emailPrincipale: user.email || '',
          emailSecondaria: '',
          telefonoRecupero: user.phoneNumber || '',
        };
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
          const parsed = stored ? JSON.parse(stored) : null;
          if (parsed && typeof parsed === 'object') {
            setUserData({
              ...fromFirebase,
              nomeUtente: parsed.nomeUtente && String(parsed.nomeUtente).trim() ? String(parsed.nomeUtente).trim() : fromFirebase.nomeUtente,
              emailPrincipale: parsed.emailPrincipale || fromFirebase.emailPrincipale,
              emailSecondaria: parsed.emailSecondaria || fromFirebase.emailSecondaria,
              telefonoRecupero: parsed.telefonoRecupero || fromFirebase.telefonoRecupero,
            });
          } else {
            setUserData(fromFirebase);
          }
        } catch (_) {
          setUserData(fromFirebase);
        }
        setIsLogged(true);
      } else {
        setUserId(null);
        setUserData({ nomeUtente: '', emailPrincipale: '', emailSecondaria: '', telefonoRecupero: '' });
        setIsLogged(false);
        initialMessageRequestedRef.current = false;
        setSessionWelcomeMessage(null);
      }
      setIsLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, []);

  // Nascondi lo splash quando abbiamo qualcosa da mostrare (appReady) con ritardo per evitare crash in transizione
  useEffect(() => {
    if (!appReady) return;
    const t = setTimeout(() => {
      try {
        SplashScreen.hideAsync?.();
      } catch (_) {}
    }, 400);
    return () => clearTimeout(t);
  }, [appReady]);

  // Quando l'auth è pronta (isLoading false), eventuale secondo hide per sicurezza
  useEffect(() => {
    if (!isLoading && appReady) {
      const t = setTimeout(() => {
        try {
          SplashScreen.hideAsync?.();
        } catch (_) {}
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isLoading, appReady]);

  // Lingua: default inglese (en). Prima pagina dopo l'installazione = scelta della lingua (una volta); poi il cambio lingua resta solo nel Menu → Impostazioni.
  useEffect(() => {
    (async () => {
      try {
        const [storedLang, hasChosenAtStartup] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
          AsyncStorage.getItem(STORAGE_KEYS.HAS_CHOSEN_LANGUAGE_AT_STARTUP),
        ]);
        if (hasChosenAtStartup === 'true' && storedLang && LANGUAGES.includes(storedLang)) {
          setLanguage(storedLang);
          setNeedFirstLaunchLanguageChoice(false);
        } else {
          setLanguage(storedLang && LANGUAGES.includes(storedLang) ? storedLang : 'en');
          setNeedFirstLaunchLanguageChoice(true);
        }
      } catch (_) {
        setLanguage('en');
        setNeedFirstLaunchLanguageChoice(true);
      }
      setAppReady(true);
    })();
  }, []);

  // Preferenze da AsyncStorage (caricate al mount, non dipendono da auth)
  useEffect(() => {
    (async () => {
      try {
        const [
          storedServer,
          storedAiName,
          storedVoiceId,
          storedVoiceReply,
          storedUseCase,
          storedStudentLevel,
          storedStudentFocus,
          storedStudentExamName,
          storedStudentExamDate,
          storedStudentReminderEnabled,
          storedStudentReminderTime,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SERVER_CONFIG),
          AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_AI_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.VOICE_ID),
          AsyncStorage.getItem(STORAGE_KEYS.VOICE_REPLY_MODE),
          AsyncStorage.getItem(STORAGE_KEYS.USE_CASE),
          AsyncStorage.getItem(STORAGE_KEYS.STUDENT_LEVEL),
          AsyncStorage.getItem(STORAGE_KEYS.STUDENT_FOCUS),
          AsyncStorage.getItem(STORAGE_KEYS.STUDENT_EXAM_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.STUDENT_EXAM_DATE),
          AsyncStorage.getItem(STORAGE_KEYS.STUDENT_REMINDER_ENABLED),
          AsyncStorage.getItem(STORAGE_KEYS.STUDENT_REMINDER_TIME),
        ]);
        if (storedAiName && storedAiName.trim()) {
          setCustomAiName(storedAiName.trim());
          setStoredAiName(storedAiName.trim());
        }
        if (storedVoiceId && VOICE_OPTIONS.some((v) => v.id === storedVoiceId)) setVoiceId(storedVoiceId);
        if (storedVoiceReply === 'true') setVoiceReplyMode(true);
        if (storedServer) {
          try {
            const parsed = JSON.parse(storedServer);
            if (parsed && typeof parsed === 'object') setServerConfig(parsed);
          } catch (_) {}
        }

        // Student Edition prefs
        if (storedUseCase === 'study' || storedUseCase === 'life') setUseCase(storedUseCase);
        if (storedStudentLevel === 'highschool' || storedStudentLevel === 'university') setStudentLevel(storedStudentLevel);
        if (storedStudentFocus) setStudentFocus(String(storedStudentFocus));
        if (storedStudentExamName) setStudentExamName(String(storedStudentExamName));
        if (storedStudentExamDate) setStudentExamDate(String(storedStudentExamDate));
        if (storedStudentReminderEnabled === 'true') setStudentReminderEnabled(true);
        if (storedStudentReminderTime && /^\d{2}:\d{2}$/.test(storedStudentReminderTime)) {
          setStudentReminderTime(storedStudentReminderTime);
        }
      } catch (_) {}
      finally {
        setPrefsLoaded(true);
      }
    })();
  }, []);

  // Carica se l'utente ha già visto l'intro "OXY ricorda" (solo se loggato)
  useEffect(() => {
    if (!isLogged || !userId) return;
    AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_MEMORY_VAULT_INTRO).then((v) => {
      setHasSeenMemoryVaultIntro(v === 'true');
    });
  }, [isLogged, userId]);

  // Oxy Key gate e persistenza USER_DATA quando utente autenticato (dopo onAuthStateChanged)
  // In modalità subscription: verifica abbonamento/acquisto dal backend; se attivo non mostrare il gate
  useEffect(() => {
    if (!isLogged || !userId) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        if (SHOW_OXY_KEY_OPTION) {
          const oxyKey = await getOxyKey();
          if (oxyKey && isValidKeyFormat(oxyKey)) {
            setHasOxyKey(true);
          } else {
            setShowOxyKeyGate(true);
          }
          return;
        }
        // Modalità subscription: verifica abbonamento/acquisto dal backend (o piano free)
        const urlBase = (backendUrl || '').trim().replace(/\/$/, '');
        if (urlBase) {
          const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
          if (idToken) {
            const res = await fetch(`${urlBase}/api/billing/status`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data && data.active) {
              setHasOxyKey(true);
              return;
            }
          }
        }
        setHasOxyKey(false);
        setShowOxyKeyGate(true);
      } catch (_) {
        setHasOxyKey(false);
        setShowOxyKeyGate(true);
      }
    })();
  }, [isLogged, userId, userData.emailPrincipale, backendUrl, refreshBillingStatus]);

  // Legacy key letta per compatibilità con vecchie installazioni.
  useEffect(() => {
    if (!userId || billingStatus?.sharedForDiscount) return;
    AsyncStorage.getItem(STORAGE_KEYS.HAS_SKIPPED_SHARE_GATE_PREFIX + userId).then((v) => {
      if (v === 'true') setSkippedShareGateForFree(true);
    }).catch(() => {});
  }, [userId, billingStatus?.sharedForDiscount]);

  // Al login (o al ritorno in app da sessione persistita): atterrare sempre sulla chat, non sull'ultima pagina visitata
  useEffect(() => {
    if (!isLogged) return;
    setViewAttiva('chat');
    setShowMenuModal(false);
    setMenuTab('prompt');
    setMenuSubView(null);
    setSorgenteSelezionata(null);
  }, [isLogged]);

  // Onboarding post-login: scelta percorso (Studio / Vita & Lavoro) se non ancora impostato
  useEffect(() => {
    if (!isLogged) return;
    if (!prefsLoaded) return;
    if (useCase === 'study' || useCase === 'life') return;
    setUseCaseOnboardingStep('usecase');
    setShowUseCaseOnboarding(true);
  }, [isLogged, prefsLoaded, useCase]);

  // Se promemoria Student è attivo, assicura scheduling (MVP: 14 giorni) quando app parte o preferenze cambiano.
  useEffect(() => {
    if (!isLogged) return;
    if (!prefsLoaded) return;
    if (useCase !== 'study') return;
    if (IS_EXPO_GO) return;
    // Non schedulare mentre utente sta configurando onboarding (evita doppie schedulazioni)
    if (showUseCaseOnboarding) return;
    scheduleStudentReminders().catch(() => {});
  }, [isLogged, prefsLoaded, useCase, showUseCaseOnboarding, scheduleStudentReminders]);

  // Carica cronologia chat quando utente è autenticato (fallback se bootstrap non l'ha fatto)
  useEffect(() => {
    if (!isLogged || !userId) return;

    const load = async () => {
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const history = await loadChatHistory(userId, idToken);
        if (history && history.length > 0) {
          setChatHistory(history.map((m) => ({ role: m.role, content: m.content })));
          setMessaggi(history.map((m, idx) => ({
            id: `restored_${idx}`,
            tipo: m.role === 'user' ? 'user' : 'bot',
            testo: typeof m.content === 'string' ? m.content : '',
            createdAt: null,
          })));
        }
        setStickyBadge(null);
      } catch (_) {}
    };
    load();
  }, [isLogged, userId]);

  // Roadmap: carica feature flags da backend (per Diario, Storie, Community in menu)
  useEffect(() => {
    if (!isLogged || !userId) return;
    (async () => {
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const serverFlags = idToken ? await fetchServerFlags(idToken) : null;
        const flags = await getAllFlags(serverFlags);
        setFeatureFlags(flags);
      } catch (_) {
        setFeatureFlags({
          [FEATURE_KEYS.DIARY]: true,
          [FEATURE_KEYS.STORIES]: true,
          [FEATURE_KEYS.COMMUNITY]: true,
          [FEATURE_KEYS.GROUP_CHAT]: false,
        });
      }
    })();
  }, [isLogged, userId]);

  // Messaggio iniziale OXY: quando la chat è vuota (solo welcome), chiedi al backend il primo messaggio e sostituisci
  useEffect(() => {
    if (!isLogged || !userId || !backendUrl) return;
    const hasKey = hasOxyKey || hasGeminiKey;
    if (!hasKey) return;
    if (messaggi.length !== 1 || messaggi[0]?.tipo !== 'bot' || messaggi[0]?.id !== '1') return;
    if (initialMessageRequestedRef.current) return;
    initialMessageRequestedRef.current = true;
    (async () => {
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const key = await getKeyForCurrentUser();
        const geminiKey = await getGeminiKey();
        const result = await callOxyAi({
          apiKey: key || undefined,
          geminiApiKey: (geminiKey && isValidGeminiKeyFormat(geminiKey)) ? geminiKey : undefined,
          idToken,
          useBackendForMaster: false,
          userId,
          language,
          moduleName: moduloAttivo,
          userProfile: userData,
          history: [],
          message: '',
          customAiName: effectiveAiName,
          voiceId: effectiveVoiceId || undefined,
          initialMessage: true,
        });
        const answer = result?.answer;
        if (answer) {
          setMessaggi((prev) => {
            if (prev.length > 1) return prev;
            queueMicrotask(() => { if (userId && idToken) saveMessageToDb(userId, 'assistant', answer, idToken); });
            return [{ id: '1', tipo: 'bot', testo: answer }];
          });
          setChatHistory((prev) => {
            if (prev.length > 0) return prev;
            return [{ role: 'assistant', content: answer }];
          });
        } else {
          initialMessageRequestedRef.current = false;
        }
      } catch (_) {
        initialMessageRequestedRef.current = false;
      }
    })();
  }, [isLogged, userId, backendUrl, hasOxyKey, hasGeminiKey, messaggi.length, messaggi[0]?.id, messaggi[0]?.tipo, language, moduloAttivo, effectiveAiName]);

  // Messaggio di benvenuto ogni volta che l'utente rientra nell'app (AppState active dopo background)
  useEffect(() => {
    if (!isLogged || !userId || !backendUrl) return;
    if (!hasOxyKey && !hasGeminiKey) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        appWasBackgroundedRef.current = true;
      }
      if (nextState === 'active' && appWasBackgroundedRef.current) {
        appWasBackgroundedRef.current = false;
        (async () => {
          try {
            const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            const key = await getKeyForCurrentUser();
            const geminiKey = await getGeminiKey();
            const result = await callOxyAi({
              apiKey: key || undefined,
              geminiApiKey: (geminiKey && isValidGeminiKeyFormat(geminiKey)) ? geminiKey : undefined,
              idToken,
              useBackendForMaster: false,
              userId,
              language,
              moduleName: moduloAttivo,
              userProfile: userData,
              history: [],
              message: '',
              customAiName: effectiveAiName,
              voiceId: effectiveVoiceId || undefined,
              initialMessage: true,
            });
            const answer = result?.answer;
            if (answer) setSessionWelcomeMessage(answer);
          } catch (_) {}
        })();
      }
    });
    return () => sub.remove();
  }, [isLogged, userId, backendUrl, hasOxyKey, hasGeminiKey, language, moduloAttivo, effectiveAiName, effectiveVoiceId]);

  // Salva configurazione server quando cambia
  useEffect(() => {
    if (serverConfig.host && serverConfig.username && serverConfig.token) {
      AsyncStorage.setItem(STORAGE_KEYS.SERVER_CONFIG, JSON.stringify(serverConfig)).catch(() => {});
    }
  }, [serverConfig]);

  const normalizeBaseUrl = useCallback((raw) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    const hasProto = /^https?:\/\//i.test(s);
    if (hasProto) return s.replace(/\/+$/, '');
    const hostPart = s.split('/')[0];
    const hostname = hostPart.split(':')[0].toLowerCase();
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
    const withProto = `${isLocal ? 'http' : 'https'}://${s}`;
    return withProto.replace(/\/+$/, '');
  }, []);

  const fetchWithTimeout = useCallback(async (url, options = {}, timeoutMs = 6000) => {
    const controller = new AbortController();
    const tmr = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(tmr);
    }
  }, []);

  const handleCloudServerConnect = useCallback(async () => {
    if (cloudServerTesting) return;
    const baseUrl = normalizeBaseUrl(serverConfig.host);
    const username = String(serverConfig.username || '').trim();
    const token = String(serverConfig.token || '').trim();
    if (!baseUrl || !username || !token) {
      Alert.alert(t('chat.errorTitle'), t('cloud.serverErrorMissing'));
      return;
    }
    setCloudServerTesting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Oxy-Username': username,
      };
      const candidates = [
        `${baseUrl}/health`,
        `${baseUrl}/api/health`,
        `${baseUrl}/ping`,
        `${baseUrl}/api/ping`,
        baseUrl,
      ];
      let ok = false;
      for (const url of candidates) {
        try {
          const res = await fetchWithTimeout(url, { method: 'GET', headers }, 5000);
          if (res?.ok) { ok = true; break; }
        } catch (_) {}
      }
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('cloud.serverSuccessTitle'), t('cloud.serverSuccessBody'));
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('cloud.serverFailTitle'), t('cloud.serverFailBody', { baseUrl }));
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('chat.errorTitle'), e?.message || t('cloud.serverFailBody', { baseUrl: normalizeBaseUrl(serverConfig.host) }));
    } finally {
      setCloudServerTesting(false);
    }
  }, [cloudServerTesting, normalizeBaseUrl, serverConfig.host, serverConfig.username, serverConfig.token, fetchWithTimeout, t]);

  const buildLocalBackupPayload = useCallback(async () => {
    const keys = Object.values(STORAGE_KEYS);
    const pairs = await AsyncStorage.multiGet(keys);
    const data = {};
    for (const [k, v] of pairs) {
      if (typeof v === 'string') data[k] = v;
    }
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      platform: Platform.OS,
      app: {
        applicationId: Application?.applicationId || null,
        nativeApplicationVersion: Application?.nativeApplicationVersion || null,
        buildLabel: buildLabel || null,
      },
      data,
    };
  }, [buildLabel]);

  const handleExportLocalBackup = useCallback(async () => {
    if (cloudLocalExporting) return;
    setCloudLocalExporting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload = await buildLocalBackupPayload();
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      const fileUri = `${dir}oxy_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
      await Share.share({
        url: fileUri,
        title: t('cloud.backupShareTitle'),
        message: t('cloud.backupShareMessage'),
      });
    } catch (e) {
      if (e?.message !== 'User did not share') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('chat.errorTitle'), e?.message || t('cloud.backupExportError'));
      }
    } finally {
      setCloudLocalExporting(false);
    }
  }, [cloudLocalExporting, buildLocalBackupPayload, t]);

  const handleImportLocalBackup = useCallback(async () => {
    try {
      const raw = String(cloudImportPayload || '').trim();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
      if (!data || typeof data !== 'object') throw new Error(t('cloud.backupImportInvalid'));
      const keys = Object.values(STORAGE_KEYS);
      const toSet = [];
      for (const k of keys) {
        const v = data[k];
        if (typeof v === 'string') toSet.push([k, v]);
      }
      if (toSet.length === 0) throw new Error(t('cloud.backupImportInvalid'));
      await AsyncStorage.multiSet(toSet);
      // Applica subito ciò che possiamo applicare senza riavvio
      try {
        if (typeof data[STORAGE_KEYS.SERVER_CONFIG] === 'string') {
          const nextServer = JSON.parse(data[STORAGE_KEYS.SERVER_CONFIG]);
          if (nextServer && typeof nextServer === 'object') setServerConfig(nextServer);
        }
      } catch (_) {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('cloud.backupImportSuccessTitle'), t('cloud.backupImportSuccessBody'));
      setCloudImportOpen(false);
      setCloudImportPayload('');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('chat.errorTitle'), e?.message || t('cloud.backupImportError'));
    }
  }, [cloudImportPayload, t]);

  // Debug/Go-live: svuota cache chat locale e ricarica dal server (per verificare persistenza backend).
  const clearLocalChatCacheAndReload = useCallback(async () => {
    try {
      if (!userId) throw new Error('Utente non disponibile');
      const cacheKey = `OXY_CHAT_CACHE_V1:${String(userId || '').trim()}`;
      await AsyncStorage.removeItem(cacheKey);
      setChatHistory([]);
      setMessaggi([]);
      setSessionWelcomeMessage(null);

      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!idToken) {
        Alert.alert(t('cloud.clearChatCacheDoneTitle'), t('cloud.clearChatCacheDoneBody'));
        return;
      }

      // Per debug P0: fai una richiesta DIRETTA al backend e mostra l'errore se fallisce.
      const base = getBackendBaseUrl();
      if (!base) throw new Error('Backend non configurato');
      const res = await fetch(`${base.replace(/\/$/, '')}/api/chat/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        throw new Error(`History server error: ${msg}`);
      }
      const arr = Array.isArray(data?.messages) ? data.messages : [];
      const normalized = arr
        .filter((m) => m && typeof m === 'object' && typeof m.role === 'string' && m.content != null)
        .map((m) => ({ role: m.role, content: String(m.content) }));
      if (normalized.length > 0) {
        setChatHistory(normalized);
        setMessaggi(normalized.map((m, idx) => ({
          id: `reloaded_${idx}`,
          tipo: m.role === 'user' ? 'user' : 'bot',
          testo: typeof m.content === 'string' ? m.content : '',
          createdAt: null,
        })));
      }
      Alert.alert(
        t('cloud.clearChatCacheDoneTitle'),
        `${t('cloud.clearChatCacheDoneBody')}\n\nServer messages: ${normalized.length}`
      );
    } catch (e) {
      Alert.alert(t('chat.errorTitle'), e?.message || t('cloud.clearChatCacheError'));
    }
  }, [userId, t]);

  const looksLikeDocSearchIntent = useCallback((text) => {
    const s = String(text || '').toLowerCase();
    if (!s.trim()) return false;
    // Trigger su richieste esplicite: drive/onedrive/icloud/documenti/file
    return (
      /\b(cerca|trova|ricerca|search)\b/.test(s) &&
      /\b(drive|google\s*drive|onedrive|microsoft\s*drive|icloud|documenti|documentazione|file|cartella)\b/.test(s)
    );
  }, []);

  const looksLikeDocEmailIntent = useCallback((text) => {
    const s = String(text || '').toLowerCase();
    if (!s.trim()) return false;
    return (
      /\b(invia|manda|spedisci|spediscimi|inoltra|send|email|mail)\b/.test(s) &&
      /\b(email|mail)\b/.test(s) &&
      /\b(documento|file|pdf|docx|allegato|drive|onedrive|icloud)\b/.test(s)
    );
  }, []);

  const openDocEmailModal = useCallback(() => {
    setDocEmailTo((prev) => (String(prev || '').trim() ? prev : String(userData?.emailPrincipale || '').trim()));
    setDocEmailModalOpen(true);
  }, [userData?.emailPrincipale]);

  const composeEmailWithAttachments = useCallback(async ({ to, assets }) => {
    if (Platform.OS === 'web') {
      Alert.alert(t('chat.errorTitle'), t('cloud.emailNotSupportedWeb'));
      return;
    }
    const recipients = [String(to || '').trim()].filter(Boolean);
    if (recipients.length === 0) {
      Alert.alert(t('chat.errorTitle'), t('cloud.emailMissingTo'));
      return;
    }
    let MailComposer;
    try {
      MailComposer = await import('expo-mail-composer');
    } catch (_) {
      Alert.alert(t('chat.errorTitle'), t('cloud.emailNotAvailable'));
      return;
    }
    let available = false;
    try {
      available = typeof MailComposer?.isAvailableAsync === 'function' ? await MailComposer.isAvailableAsync() : false;
    } catch (_) {
      available = false;
    }
    if (!available) {
      Alert.alert(t('chat.errorTitle'), t('cloud.emailNotAvailable'));
      return;
    }
    const attachments = (Array.isArray(assets) ? assets : [])
      .map((a) => a?.uri)
      .filter((u) => typeof u === 'string' && u.trim().length > 0)
      .slice(0, 5);
    if (attachments.length === 0) {
      Alert.alert(t('chat.errorTitle'), t('cloud.emailNoAttachment'));
      return;
    }
    try {
      if (typeof MailComposer?.composeAsync !== 'function') throw new Error('MailComposer non disponibile');
      await MailComposer.composeAsync({
        recipients,
        subject: t('cloud.emailSubject'),
        body: t('cloud.emailBody'),
        attachments,
      });
    } catch (_) {
      Alert.alert(t('chat.errorTitle'), t('cloud.emailNotAvailable'));
    }
  }, [t]);

  const sendEmailViaBackend = useCallback(async ({ to, assets }) => {
    const baseUrl = getBackendBaseUrl();
    if (!baseUrl) throw new Error(t('cloud.docBackendMissing'));
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (!idToken) throw new Error(t('chat.authRequiredError'));
    const recipients = [String(to || '').trim()].filter(Boolean);
    if (recipients.length === 0) throw new Error(t('cloud.emailMissingTo'));
    const files = [];
    for (const a of (Array.isArray(assets) ? assets : []).slice(0, 3)) {
      const uri = a?.uri;
      if (!uri) continue;
      const name = a?.name || t('common.document');
      const mimeType = a?.mimeType || '';
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      files.push({ fileName: name, mimeType, fileBase64: base64 });
    }
    if (files.length === 0) throw new Error(t('cloud.emailNoAttachment'));
    const res = await fetch(`${baseUrl}/api/docs/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        to: recipients[0],
        subject: t('cloud.emailSubject'),
        body: t('cloud.emailBody'),
        files,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return true;
  }, [t]);

  const extractDocTextViaBackend = useCallback(async ({ uri, name, mimeType }) => {
    const baseUrl = getBackendBaseUrl();
    if (!baseUrl) throw new Error(t('cloud.docBackendMissing'));
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (!idToken) throw new Error(t('chat.authRequiredError'));

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const res = await fetch(`${baseUrl}/api/docs/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fileBase64: base64,
        fileName: name || t('common.document'),
        mimeType: mimeType || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return { name: data?.fileName || name || t('common.document'), text: String(data?.text || ''), chars: Number(data?.chars || 0) || 0 };
  }, [t]);

  const pickDocsAndSendToAi = useCallback(async (queryText, { autoTriggered = false, openEmailFlow = false } = {}) => {
    if (docPickerLoading) return;
    setDocPickerLoading(true);
    try {
      if (Platform.OS === 'web') {
        Alert.alert(t('chat.errorTitle'), t('cloud.docNotSupportedWeb'));
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let DocumentPicker;
      try {
        DocumentPicker = await import('expo-document-picker');
      } catch (_) {
        Alert.alert(t('chat.errorTitle'), t('cloud.docPickerUnavailable'));
        return;
      }
      let result;
      try {
        if (!DocumentPicker?.getDocumentAsync) throw new Error('DocumentPicker non disponibile');
        result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          copyToCacheDirectory: true,
          type: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
            'text/csv',
            'application/json',
          ],
        });
      } catch (_) {
        Alert.alert(t('chat.errorTitle'), t('cloud.docPickerUnavailable'));
        return;
      }
      if (!result || result.canceled) {
        if (autoTriggered) {
          // Se era trigger automatico e l'utente annulla, non inviamo nulla.
          return;
        }
        return;
      }
      const assets = Array.isArray(result.assets) ? result.assets : [];
      if (assets.length === 0) return;
      setLastPickedDocAssets(
        assets.slice(0, 5).map((a) => ({
          uri: a?.uri || '',
          name: a?.name || t('common.document'),
          mimeType: a?.mimeType || '',
          size: typeof a?.size === 'number' ? a.size : null,
        }))
      );

      const extracted = [];
      for (const a of assets.slice(0, 5)) {
        const uri = a?.uri;
        if (!uri) continue;
        const name = a?.name || t('common.document');
        const mimeType = a?.mimeType || '';
        const out = await extractDocTextViaBackend({ uri, name, mimeType });
        if (out?.text) extracted.push(out);
      }
      if (extracted.length === 0) {
        Alert.alert(t('chat.errorTitle'), t('cloud.docNoTextExtracted'));
        return;
      }

      setLastPickedDocs(extracted.map((d) => ({ name: d.name, chars: d.chars || d.text.length })));

      const query = String(queryText || '').trim();
      const tokens = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4);
      const keywords = Array.from(new Set(tokens)).slice(0, 6);

      const makeSnippet = (text, maxLen = 1200) => {
        const src = String(text || '').replace(/\s+/g, ' ').trim();
        if (!src) return '';
        const lower = src.toLowerCase();
        const hits = [];
        for (const k of keywords) {
          const idx = lower.indexOf(k);
          if (idx >= 0) hits.push(idx);
        }
        hits.sort((a, b) => a - b);
        const windows = [];
        for (const idx of hits.slice(0, 3)) {
          const start = Math.max(0, idx - 260);
          const end = Math.min(src.length, idx + 420);
          windows.push({ start, end });
        }
        // merge overlap
        windows.sort((a, b) => a.start - b.start);
        const merged = [];
        for (const w of windows) {
          const last = merged[merged.length - 1];
          if (!last || w.start > last.end + 20) merged.push({ ...w });
          else last.end = Math.max(last.end, w.end);
        }
        let out = '';
        if (merged.length === 0) {
          out = src.slice(0, Math.min(maxLen, 900));
        } else {
          out = merged.map((w) => src.slice(w.start, w.end)).join(' … ');
        }
        if (out.length > maxLen) out = out.slice(0, maxLen);
        return out.trim();
      };

      const docsBlock = extracted
        .map((d, idx) => {
          const snippet = makeSnippet(d.text, 1200);
          return `### Documento ${idx + 1}: ${d.name}\n${snippet}`;
        })
        .join('\n\n---\n\n');

      const header = `${t('cloud.docContextHeader')}\n\n`;
      const footer = `\n\n${t('cloud.docUserQueryHeader')}\n${query}`;
      const maxDocsLen = Math.max(0, MAX_MESSAGE_LENGTH - header.length - footer.length - 20);
      const clippedDocs = docsBlock.length > maxDocsLen ? `${docsBlock.slice(0, maxDocsLen)}\n\n[...tagliato...]` : docsBlock;
      const finalMessage = `${header}${clippedDocs}${footer}`.slice(0, MAX_MESSAGE_LENGTH);

      // invio come payload: in chat mostriamo solo la domanda, all'IA mandiamo contesto+snippets
      await sendMessageRef.current?.({ displayText: query, messageText: finalMessage });

      if (openEmailFlow) {
        openDocEmailModal();
      }
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('chat.errorTitle'), e?.message || t('cloud.docGenericError'));
    } finally {
      setDocPickerLoading(false);
    }
  }, [docPickerLoading, extractDocTextViaBackend, openDocEmailModal, t]);

  // Scroll automatico chat
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messaggi]);

  // Android: a volte lo ScrollView nel tab "Azioni" dentro il Modal non riceve scroll al primo open.
  // Re-mount solo all'apertura del menu (non al cambio tab) per evitare layout spezzati.
  useEffect(() => {
    if (!showMenuModal || menuTab !== 'prompt') return;
    const id = requestAnimationFrame(() => setMenuPromptMountKey((k) => k + 1));
    return () => cancelAnimationFrame(id);
  }, [showMenuModal]);
  // Quando si apre il menu, mostra sempre la schermata con i 3 menu (Avvio rapido / Strumenti / Modalità).
  useEffect(() => {
    if (showMenuModal) setAzioniSubView(null);
  }, [showMenuModal]);
  // Quando si passa al tab Azioni (o si cambia sotto-pagina), scroll in cima.
  useEffect(() => {
    if (!showMenuModal || menuTab !== 'prompt') return;
    const t = setTimeout(() => {
      menuActionsScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [showMenuModal, menuTab, azioniSubView]);

  // Frase in header e primo messaggio chat: aggiorna al cambio d'ora (controllo ogni minuto)
  const lastHourRef = useRef(new Date().getHours());
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const h = now.getHours();
      if (h !== lastHourRef.current) {
        lastHourRef.current = h;
        setHeaderPhrase(getHeaderPhraseForHour());
        setMessaggi((prev) =>
          prev.map((m) =>
            m.id === '1' && m.tipo === 'bot' ? { ...m, testo: getWelcomePhraseForHour() } : m
          )
        );
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthSuccess = useCallback(async ({ session, profile, customAiName: regAiName, voiceId: regVoiceId }) => {
    if (!session?.user) return;
    const uid = session.user.id;
    setUserId(uid);
    setIsLogged(true);
    const mappedUser = profile
      ? {
          nomeUtente: profile.full_name || '',
          emailPrincipale: profile.main_email || '',
          emailSecondaria: profile.backup_email || '',
          telefonoRecupero: profile.phone || '',
        }
      : {};
    if (Object.keys(mappedUser).length > 0) {
      setUserData((prev) => ({ ...prev, ...mappedUser }));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mappedUser));
    }
    if (regAiName != null && String(regAiName).trim()) {
      const name = String(regAiName).trim();
      setCustomAiName(name);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_AI_NAME, name);
    }
    if (regVoiceId != null && VOICE_OPTIONS.some((v) => v.id === regVoiceId)) {
      setVoiceId(regVoiceId);
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE_ID, regVoiceId);
    }
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const history = await loadChatHistory(uid, idToken);
    if (history?.length > 0) {
      setChatHistory(history.map((m) => ({ role: m.role, content: m.content })));
      setMessaggi(history.map((m, idx) => ({
        id: `restored_${idx}`,
        tipo: m.role === 'user' ? 'user' : 'bot',
        testo: typeof m.content === 'string' ? m.content : '',
        createdAt: null,
      })));
    } else {
      setChatHistory([]);
      setMessaggi([{ id: '1', tipo: 'bot', testo: getWelcomePhraseForHour() }]);
    }
    setStickyBadge(null);
    if (SHOW_OXY_KEY_OPTION) {
      const oxyKey = await getOxyKey();
      const geminiKey = await getGeminiKey();
      const hasValidOxy = !!(oxyKey && isValidKeyFormat(oxyKey));
      const hasValidGemini = !!(geminiKey && isValidGeminiKeyFormat(geminiKey));
      setHasOxyKey(hasValidOxy);
      setHasGeminiKey(hasValidGemini);
      if (!hasValidOxy && !hasValidGemini) setShowOxyKeyGate(true);
    }
    // Primo login senza aver mai scelto un piano: mostra "Come vuoi usare OXY?" (Abbonamento / Lifetime)
    const planKey = STORAGE_KEYS.HAS_CHOSEN_PLAN_PREFIX + uid;
    const hasChosenPlan = await AsyncStorage.getItem(planKey);
    if (hasChosenPlan !== 'true') setShowPlanChoiceAfterSignup(true);
    // Aggiorna stato billing al login (per payment gate e per rilevare pagamento appena completato)
    refreshBillingStatus();
  }, [refreshBillingStatus]);

  const validateField = useCallback((field, value) => {
    switch (field) {
      case 'email':
      case 'emailSecondaria':
        return VALIDATION.email.test(value);
      case 'telefono':
        return VALIDATION.phone.test(value);
      case 'password':
        return VALIDATION.password.test(value);
      case 'nome':
      case 'cognome':
        return VALIDATION.name.test(value);
      case 'dataNascita':
        return VALIDATION.date.test(value);
      default:
        return value.trim().length > 0;
    }
  }, []);

  const handleSaveOxyKey = useCallback(async () => {
    setOxyKeyError('');
    const key = oxyKeyInput.trim();
    if (!key) {
      setOxyKeyError(t('ui.oxyKeyErrorMissing'));
      return;
    }
    if (!isValidKeyFormat(key)) {
      setOxyKeyError(t('ui.oxyKeyErrorInvalidFormat'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await setOxyKey(key);
    if (ok) {
      setHasOxyKey(true);
      setShowOxyKeyGate(false);
      setOxyKeyInput('');
      setOxyKeyError('');
    } else {
      setOxyKeyError(t('ui.oxyKeyErrorSaveFailed'));
    }
  }, [oxyKeyInput, t]);

  const handleSaveGeminiKey = useCallback(async () => {
    setGeminiKeyError('');
    const key = geminiKeyInput.trim();
    if (!key) {
      setGeminiKeyError(t('ui.geminiKeyErrorInvalid'));
      return;
    }
    if (!isValidGeminiKeyFormat(key)) {
      setGeminiKeyError(t('ui.geminiKeyErrorInvalid'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await setGeminiKey(key);
    if (ok) {
      setHasGeminiKey(true);
      setShowOxyKeyGate(false);
      setGeminiKeyInput('');
      setGeminiKeyError('');
    } else {
      setGeminiKeyError(t('ui.oxyKeyErrorSaveFailed'));
    }
  }, [geminiKeyInput, t]);

  const handleCameraVision = useCallback(async () => {
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (SHOW_OXY_KEY_OPTION) {
      if (!hasOxyKey && !hasGeminiKey) {
        setShowOxyKeyGate(true);
        Alert.alert(t('ui.oxyKeyRequiredTitle'), t('ui.oxyKeyRequiredBodyVision'));
        return;
      }
    } else {
      if (!idToken) {
        Alert.alert(t('chat.errorTitle'), t('chat.authRequiredError'));
        return;
      }
      // Vision AI disponibile da Pro: piano Starter/Free non include Vision. Tap → menu Abbonamento o (Fase 1) Condividi.
      if (!effectiveFlags.vision) {
        onLockedFeatureTap();
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('ui.permissionCameraTitle'), t('ui.permissionCameraVisionBody'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const base64 = result.assets[0].base64;
      const key = await getKeyForCurrentUser();
      const geminiKey = await getGeminiKey();
      const userMsgId = `u_${Date.now()}`;
      const botMsgId = `b_${Date.now()}`;
      const now = Date.now();
      const prompt = t('chat.visionPromptAnalyze');
      setMessaggi((prev) => [
        ...prev,
        { id: userMsgId, tipo: 'user', testo: '[Foto inviata per analisi]', createdAt: now },
        { id: botMsgId, tipo: 'bot', testo: t('chat.thinking'), createdAt: now },
      ]);
      setStaCaricando(true);
      chatAbortControllerRef.current = new AbortController();
      const aiResult = await callOxyAi({
        apiKey: key || undefined,
        geminiApiKey: (geminiKey && isValidGeminiKeyFormat(geminiKey)) ? geminiKey : undefined,
        idToken,
        useBackendForMaster: false,
        userId,
        language,
        moduleName: moduloAttivo,
        userProfile: userData,
        history: chatHistory,
        message: prompt,
        imageBase64: base64,
        customAiName: effectiveAiName,
        voiceId: effectiveVoiceId || undefined,
        signal: chatAbortControllerRef.current.signal,
      });
      const risposta = aiResult.answer;
      setMessaggi((prev) =>
        prev.map((m) => (m.id === botMsgId ? { ...m, testo: risposta } : m))
      );
      setChatHistory((prev) => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: risposta }]);
      if (userId) {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        saveMessageToDb(userId, 'user', prompt, idToken);
        saveMessageToDb(userId, 'assistant', risposta, idToken);
      }
    } catch (err) {
      if (err?.message === ABORTED_MESSAGE) {
        setMessaggi((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, testo: t('chat.abortedMessage') } : m))
        );
      } else if (err?.message === 'vision_requires_pro_plan') {
        setMessaggi((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== botMsgId));
        onLockedFeatureTap();
      } else {
        const msg = err?.message || '';
        const userMsg = msg.includes('camera') || msg.includes('Camera')
          ? t('ui.cameraUnavailableSimulator')
          : (msg || t('chat.errorGeneric'));
        Alert.alert(t('ui.visionErrorTitle'), userMsg);
      }
    } finally {
      chatAbortControllerRef.current = null;
      setStaCaricando(false);
    }
  }, [hasOxyKey, userId, language, moduloAttivo, userData, chatHistory, effectiveAiName, backendUrl, t, effectiveFlags, onLockedFeatureTap]);

  const handleSelectChannel = (channel) => {
    setChannelSelected(channel);
  };

  const handleCreateProfile = async () => {
    setRegisterError('');
    const errors = [];

    if (!validateField('nome', regData.nome)) errors.push(t('register.validation.firstName'));
    if (!validateField('cognome', regData.cognome)) errors.push(t('register.validation.lastName'));
    if (!validateField('dataNascita', regData.dataNascita)) errors.push(t('register.validation.birthDate'));
    if (!validateField('email', regData.email)) errors.push(t('register.validation.emailMain'));
    if (!validateField('emailSecondaria', regData.emailSecondaria)) errors.push(t('register.validation.emailBackup'));
    const mainEmail = String(regData.email || '').trim().toLowerCase();
    const backupEmail = String(regData.emailSecondaria || '').trim().toLowerCase();
    if (backupEmail && mainEmail && backupEmail === mainEmail) {
      errors.push(t('register.validation.emailBackupDifferent'));
    }

    const phoneDigits = regData.telefono.replace(/\D/g, '');
    const fullPhone = `+${phoneCountry.callingCode}${phoneDigits}`;

    if (!validateField('telefono', fullPhone)) errors.push(t('register.validation.phone'));

    // Validazione password "lazy" - solo al click, con messaggi specifici
    const passwordErrors = validatePasswordDetailed(regData.password, t);
    if (passwordErrors.length > 0) {
      errors.push(...passwordErrors);
    }

    // Match check password
    if (regData.password !== regData.confirmPassword) {
      errors.push(t('register.validation.passwordMatch'));
    }

    if (errors.length > 0) {
      const msg = errors.join('\n');
      Alert.alert(t('register.validation.title'), msg);
      setRegisterError(msg);
      return;
    }

    setStaCaricando(true);

    try {
      const { user, session } = await signUpWithProfile({
        ...regData,
        telefono: fullPhone,
      });

      // Dopo registrazione, OTP è già stato inviato automaticamente da authService
      // Non mostriamo Alert di "controlla email per confermare" perché usiamo solo OTP (non link)

      const newUser = {
        nomeUtente: formatDisplayName(`${regData.nome.trim()} ${regData.cognome.trim()}`),
        emailPrincipale: regData.email.trim(),
        emailSecondaria: regData.emailSecondaria.trim(),
        telefonoRecupero: fullPhone,
      };
      const profile = {
        full_name: newUser.nomeUtente,
        main_email: newUser.emailPrincipale,
        backup_email: newUser.emailSecondaria,
        phone: newUser.telefonoRecupero,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(newUser));
      setUserData(newUser);
      setShowRegister(false);
      setShowPlanChoiceAfterSignup(true);
      handleAuthSuccess({ session, profile });
    } catch (err) {
      const fallbackMsg = t('register.error.body');
      const errMsg =
        typeof err?.message === 'string' && err.message.length < 200
          ? err.message
          : null;
      const finalMsg = errMsg || fallbackMsg;

      Alert.alert(t('register.error.title'), finalMsg);
      setRegisterError(finalMsg);
    } finally {
      setStaCaricando(false);
    }
  };

  const recordingStartRef = useRef(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef(null);
  const isStartingRecordingRef = useRef(false);

  const handleMicPressIn = useCallback(async () => {
    if (recordingRef.current || isStartingRecordingRef.current) return;
    isStartingRecordingRef.current = true;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const perm = await Audio.requestPermissionsAsync();
      if (!perm || !perm.granted) {
        Alert.alert(
          t('ui.permissionMicTitle'),
          t('ui.permissionMicBody')
        );
        isStartingRecordingRef.current = false;
        return;
      }
      if (recordingRef.current) {
        isStartingRecordingRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (recordingRef.current) {
        isStartingRecordingRef.current = false;
        return;
      }
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      isStartingRecordingRef.current = false;
      setIsRecording(true);
      recordingStartRef.current = Date.now();
      setRecordingDuration(0);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = setInterval(() => {
        if (recordingStartRef.current) setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 1000);
    } catch (e) {
      isStartingRecordingRef.current = false;
      recordingRef.current = null;
      const msg = e?.message || String(e);
      const userMsg = msg.toLowerCase().includes('simulator') || msg.includes('not supported')
        ? t('ui.audio.recordingSimulatorUnavailable')
        : msg.length > 80
          ? t('ui.audio.recordingPermissionsHint')
          : msg || t('ui.audio.recordingStartRetry');
      Alert.alert(t('ui.micErrorTitle'), userMsg);
    }
  }, [t]);

  const handleMicPressOut = useCallback(async () => {
    try {
      const recording = recordingRef.current;
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const durationMs = recordingStartRef.current ? Date.now() - recordingStartRef.current : 0;
      recordingRef.current = null;
      recordingStartRef.current = null;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);

      if (!uri || !backendUrl) {
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: t('ui.audio.transcriptionBackendUnavailable') }]);
        return;
      }
      if (durationMs < 600) {
        return;
      }

      let audioBase64 = '';
      try {
        audioBase64 = await readAudioUriAsBase64(uri);
      } catch (readErr) {
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: t('ui.audio.audioReadError') }]);
        return;
      }
      if (!audioBase64) {
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: t('ui.audio.audioReadError') }]);
        return;
      }

      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const key = await getKeyForCurrentUser();
      if (!idToken) {
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: t('ui.audio.accessRequiredMic') }]);
        return;
      }
      const { text } = await transcribe(idToken, audioBase64, key || undefined);
      if (text && text.trim()) {
        const uid = auth.currentUser?.uid;
        if (idToken && uid) track(EVENTS.VOICE_INPUT, {}, idToken);
        sendMessageRef.current?.(text.trim(), !!voiceReplyMode);
      } else {
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: t('ui.audio.noSpeechRecognized') }]);
      }
    } catch (e) {
      setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: e?.message || t('ui.audio.transcriptionRetry') }]);
    } finally {
      recordingRef.current = null;
      recordingStartRef.current = null;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, [backendUrl, userData?.emailPrincipale, voiceReplyMode, t]);

  const handleMicPress = useCallback(() => {
    if (isRecording) handleMicPressOut();
    else handleMicPressIn();
  }, [isRecording, handleMicPressIn, handleMicPressOut]);
  const handleMicPressInOnly = useCallback(() => {
    if (!isRecording && !recordingRef.current) handleMicPressIn();
  }, [isRecording, handleMicPressIn]);
  const handleMicPressOutOnly = useCallback(() => {
    if (isRecording && recordingRef.current) handleMicPressOut();
  }, [isRecording, handleMicPressOut]);

  /** Voce OXY: prima TTS OpenAI (tts-1-hd), se fallisce sintesi sistema */
  const playOxyVoice = useCallback(async (text) => {
    if (!text || typeof text !== 'string' || !text.trim()) return;
    const raw = text.trim();
    const forTts = raw
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4096);
    if (!forTts) return;
    try {
      Speech.stop();
    } catch (_) {}
    const backend = getBackendBaseUrl();
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    let apiKey = null;
    try {
      apiKey = await getKeyForCurrentUser() || null;
    } catch (_) {}
    if (backend && idToken) {
      try {
        const data = await fetchTtsAudio(forTts, idToken, apiKey || undefined, effectiveVoiceId || undefined);
        if (data?.audioBase64) {
          // Su Android i data: URI possono essere instabili → scriviamo su file cache e riproduciamo da lì
          const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}tts_${Date.now()}.mp3`;
          await FileSystem.writeAsStringAsync(fileUri, data.audioBase64, { encoding: FileSystem.EncodingType.Base64 });
          const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((s) => {
            if (s?.didJustFinishAndNotSeek) {
              sound.unloadAsync().catch(() => {});
              FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
            }
          });
          return;
        }
      } catch (e) {
      }
    }
    /* Fallback: sintesi di sistema nella lingua scelta dall'utente (coerente con risposta in ar/en/zh/...) */
    try {
      const locale = (() => {
        const map = { it: 'it-IT', en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', zh: 'zh-CN' };
        return map[language] || 'en-US';
      })();
      Speech.speak(forTts || raw, {
        language: locale,
        pitch: 0.98,
        rate: 0.92,
      });
    } catch (e) {
    }
  }, [userData?.emailPrincipale, effectiveVoiceId, t, language]);

  /** Prova voce nel menu: frase nella lingua dell'app, TTS backend o sintesi di sistema nella stessa lingua */
  const speechLocaleForLanguage = (lang) => {
    const map = { it: 'it-IT', en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', zh: 'zh-CN' };
    return map[lang] || 'en-US';
  };
  const playVoiceSample = useCallback(async (option) => {
    try {
      if (!option?.id) return;
      // Piano free: una sola voce (default). Se prova un'altra voce, mostra errore.
      if (isFreePlan && option.id !== DEFAULT_VOICE_ID) {
        Alert.alert(t('ui.voiceTestTitle'), t('ui.voicesLockedFree'));
        return;
      }
      const phrase = (t('ui.voiceSamplePhrase') || '').trim() || (option.samplePhrase || '').trim();
      if (!phrase) return;
      setPlayingVoiceId(option.id);
      try {
        Speech.stop();
      } catch (_) {}
      const sampleText = phrase.slice(0, 4096);
      const backend = getBackendBaseUrl();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      let apiKey = null;
      try {
        apiKey = await getKeyForCurrentUser() || null;
      } catch (_) {}

      // Se il backend è configurato, la prova voce deve usare la voce selezionata (OpenAI TTS)
      if (backend && idToken) {
        try {
          const data = await fetchTtsAudio(sampleText, idToken, apiKey || undefined, option.id);
          if (data?.audioBase64) {
            const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}tts_sample_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(fileUri, data.audioBase64, { encoding: FileSystem.EncodingType.Base64 });
            const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate((s) => {
              if (s?.didJustFinishAndNotSeek) {
                sound.unloadAsync().catch(() => {});
                FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
              }
            });
            return;
          }
        } catch (e) {
        }
      }

      // Fallback: sintesi di sistema nella lingua selezionata dall'utente
      const locale = speechLocaleForLanguage(language);
      Speech.speak(sampleText, { language: locale, pitch: 0.98, rate: 0.92 });
    } catch (e) {
      Alert.alert(t('ui.voiceTestTitle'), e?.message || t('ui.voiceTestError'));
    } finally {
      setPlayingVoiceId(null);
    }
  }, [userData?.emailPrincipale, t, language, isFreePlan]);

  const inviaMessaggio = useCallback(async () => {
    if (!testo.trim() || staCaricando || sendInCooldown) return;
    const rawMessage = testo.trim();
    if (rawMessage.length > MAX_MESSAGE_LENGTH) {
      Alert.alert(t('ui.tooLongTitle'), t('ui.tooLongBody', { max: MAX_MESSAGE_LENGTH }));
      return;
    }
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    // Gate accesso:
    if (SHOW_OXY_KEY_OPTION) {
      if (!hasOxyKey && !hasGeminiKey) {
        setShowOxyKeyGate(true);
        Alert.alert(t('ui.oxyKeyRequiredTitle'), t('ui.oxyKeyRequiredBodySend'));
        return;
      }
    } else {
      if (!idToken) {
        Alert.alert(t('chat.errorTitle'), t('chat.authRequiredError'));
        return;
      }
    }

    // Badge "Modalità": se selezionato, applicalo senza mostrare il prompt all'utente.
    // Compatibilità: se l'utente incolla manualmente un prompt badge (it o en), lo rileviamo e attiviamo la modalità.
    let actualMessage = rawMessage;
    let nextSticky = stickyBadge;
    const stickyPrompt = nextSticky ? getBadgePrompt(nextSticky, language) : '';
    if (stickyPrompt) {
      actualMessage = (nextSticky.prompt && rawMessage.startsWith(nextSticky.prompt)) || (nextSticky.promptEn && rawMessage.startsWith(nextSticky.promptEn)) ? rawMessage : (stickyPrompt + rawMessage);
    }
    for (const b of POWER_BADGES) {
      if (messageStartsWithBadgePrompt(actualMessage, b)) {
        nextSticky = b;
        break;
      }
    }
    if ((nextSticky?.id || null) !== (stickyBadge?.id || null)) setStickyBadge(nextSticky || null);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTesto('');
    Keyboard.dismiss();
    const userMsgId = `u_${Date.now()}`;
    const botMsgId = `b_${Date.now()}`;

    setMessaggi((prev) => [
      ...prev,
      { id: userMsgId, tipo: 'user', testo: actualMessage },
      { id: botMsgId, tipo: 'bot', testo: t('chat.thinking') },
    ]);
    setChatHistory((prev) => [...prev, { role: 'user', content: actualMessage }]);
    if (userId) saveMessageToDb(userId, 'user', actualMessage, idToken);

    setStaCaricando(true);

    try {
      const key = await getKeyForCurrentUser();
      const geminiKey = await getGeminiKey();
      const aiResult = await callOxyAi({
        apiKey: key || undefined,
        geminiApiKey: (geminiKey && isValidGeminiKeyFormat(geminiKey)) ? geminiKey : undefined,
        idToken,
        useBackendForMaster: false,
        userId,
        language,
        moduleName: moduloAttivo,
        userProfile: userData,
        history: chatHistory,
        message: actualMessage,
        customAiName: effectiveAiName,
        voiceId: effectiveVoiceId || undefined,
      });

      const risposta = aiResult.answer || t('chat.errorGeneric');

      // Simulazione di streaming lato UI usando la risposta reale
      let testoParziale = '';
      const parole = risposta.split(' ');

      for (const parola of parole) {
        testoParziale += parola + ' ';
        setMessaggi((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, testo: testoParziale.trim() } : m
          )
        );
        await new Promise((res) => setTimeout(res, 35));
      }

      setMessaggi((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, testo: risposta } : m
        )
      );
      setChatHistory((prev) => [...prev, { role: 'assistant', content: risposta }]);
      if (userId) saveMessageToDb(userId, 'assistant', risposta, idToken);
      if (ttsEnabled) playOxyVoice(risposta);
    } catch (err) {
      const isNetworkError = /network request failed|failed to fetch|load failed|connection refused/i.test(err?.message || '');
      const fallback = isNetworkError ? t('chat.errorNetwork') : t('chat.errorGeneric');
      setMessaggi((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, testo: fallback } : m
        )
      );
      // Audit 4.2: non salvare l'errore come messaggio assistant in cronologia/DB
      if (ttsEnabled) playOxyVoice(fallback);
    } finally {
      setStaCaricando(false);
      setSendInCooldown(true);
      if (sendCooldownTimerRef.current) clearTimeout(sendCooldownTimerRef.current);
      sendCooldownTimerRef.current = setTimeout(() => {
        setSendInCooldown(false);
        sendCooldownTimerRef.current = null;
      }, 2000);
    }
  }, [testo, staCaricando, sendInCooldown, moduloAttivo, userData, userId, language, chatHistory, ttsEnabled, backendUrl, stickyBadge, playOxyVoice]);

  /** Invia messaggio (da testo digitato o da optionalMessageText in modalità voce). Se forceVoiceReply=true o voiceReplyMode attiva, riproduce la risposta con TTS. */
  const sendMessage = useCallback(async (optionalMessageText, forceVoiceReply = false) => {
    const doTts = forceVoiceReply || voiceReplyMode;
    const isObjPayload = optionalMessageText != null && typeof optionalMessageText === 'object' && !Array.isArray(optionalMessageText);
    const displayText = isObjPayload
      ? String(optionalMessageText?.displayText ?? optionalMessageText?.displayMessage ?? optionalMessageText?.userText ?? '').trim()
      : (optionalMessageText != null ? String(optionalMessageText).trim() : inputMessage.trim());
    const messageText = isObjPayload
      ? String(optionalMessageText?.messageText ?? optionalMessageText?.message ?? displayText).trim()
      : displayText;

    const rawMessage = displayText;
    const rawMessageForAi = messageText;

    if (!rawMessage && optionalMessageText == null) return;
    if (!rawMessageForAi) return;
    if (staCaricando || sendInCooldown) return;
    if (rawMessageForAi.length > MAX_MESSAGE_LENGTH) {
      Alert.alert(t('ui.tooLongTitle'), t('ui.tooLongBody', { max: MAX_MESSAGE_LENGTH }));
      return;
    }

    // Se l'utente chiede di cercare nei documenti (Drive/iCloud/OneDrive), apri il picker e poi invia con contesto documenti.
    // Importante: attivare SOLO quando l'input è "typed" (no optionalMessageText), così evitiamo loop.
    if (optionalMessageText == null && /^\/(email|mail)\b/i.test(rawMessage)) {
      if (Array.isArray(lastPickedDocAssets) && lastPickedDocAssets.length > 0) {
        openDocEmailModal();
        return;
      }
      await pickDocsAndSendToAi(t('cloud.docDefaultQuery'), { autoTriggered: true, openEmailFlow: true });
      return;
    }
    if (optionalMessageText == null && looksLikeDocSearchIntent(rawMessage)) {
      await pickDocsAndSendToAi(rawMessage, { autoTriggered: true, openEmailFlow: looksLikeDocEmailIntent(rawMessage) });
      return;
    }

    // UX: svuota subito la barra input (anche se il token/controlli richiedono tempo).
    // Se poi il gate blocca l'invio (login/key), ripristiniamo il testo SOLO se l'input è ancora vuoto.
    const isTypedSend = optionalMessageText == null;
    const restoreTypedInputIfEmpty = () => {
      setInputMessage((prev) => (String(prev || '').trim().length ? prev : rawMessage));
    };
    if (isTypedSend) {
      setInputMessage('');
    }

    // --- Flusso assistente: conferma promemoria appuntamento ("sì/no") ---
    const normalizeYesNo = (s) => String(s || '').trim().toLowerCase();
    const isYes = (s) => /^(s[iì]|si|ok|va bene|certo|yes|y)\b/.test(normalizeYesNo(s));
    const isNo = (s) => /^(no|nop|annulla|cancel|n)\b/.test(normalizeYesNo(s));
    const locale = getLocaleForLanguage(language);

    // --- Promemoria generici ("ricordami alle 12:03 ...") ---
    try {
      const parsedReminder = parseGenericReminderFromMessage(rawMessage);
      if (parsedReminder?.kind === 'task' && parsedReminder?.startAt instanceof Date) {
        const now = Date.now();
        const nowStr = new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        const whenStr = parsedReminder.startAt.toLocaleString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        // Mostra subito il messaggio utente in chat (senza chiamare il modello).
        setMessaggi((prev) => [
          ...prev,
          { id: `u_${now}`, tipo: 'user', testo: rawMessage, createdAt: now },
        ]);

        if (parsedReminder.isPast) {
          setMessaggi((prev) => [
            ...prev,
            { id: `b_${now}_rem_past`, tipo: 'bot', testo: t('chat.reminderTimePassed', { now: nowStr }), createdAt: now + 1 },
          ]);
          return;
        }

        const canNotify = Platform.OS !== 'web' && !IS_EXPO_GO;
        let notifId = null;
        if (canNotify) {
          notifId = await scheduleLocalReminder(parsedReminder.startAt, parsedReminder.title || 'Promemoria', { oxyReminder: true, kind: 'task', startAt: parsedReminder.startAt.toISOString() }, 'OXY');
        } else {
          scheduleInAppReminderBestEffort(parsedReminder.startAt, parsedReminder.title || 'Promemoria');
        }

        // Salva in Memory Vault (best-effort). Non mentire: se non loggato/endpoint assente, la UI usa comunque cache locale quando userId è presente.
        try {
          const idToken2 = auth.currentUser ? await auth.currentUser.getIdToken() : null;
          if (userId && idToken2) {
            saveToMemory({ userId, idToken: idToken2 }, { keyFact: `${parsedReminder.title} — ${whenStr}` }).catch(() => {});
          }
        } catch (_) {}

        const tail = canNotify ? '' : `\n\n${t('chat.reminderExpoGoLimit')}`;
        setMessaggi((prev) => [
          ...prev,
          { id: `b_${now}_rem_ok`, tipo: 'bot', testo: t('chat.reminderScheduled', { when: whenStr }) + tail, createdAt: now + 2 },
        ]);
        return;
      }
    } catch (_) {}

    if (pendingAppointmentRef.current && (isYes(rawMessage) || isNo(rawMessage))) {
      const pending = pendingAppointmentRef.current;
      pendingAppointmentRef.current = null;
      const now = Date.now();
      // Mostra la risposta dell'utente e l'esito in chat (senza chiamare il modello).
      setMessaggi((prev) => [
        ...prev,
        { id: `u_${now}`, tipo: 'user', testo: rawMessage, createdAt: now },
      ]);

      if (isYes(rawMessage)) {
        try {
          const notifIds = await scheduleAppointmentNotifications({ title: pending.title, startAt: pending.startAt });
          const appt = {
            id: `appt_${Date.now()}`,
            title: pending.title,
            startAt: pending.startAt.toISOString(),
            notifIds,
            sourceText: pending.sourceText || '',
            createdAt: new Date().toISOString(),
          };
          addAppointmentLocal(appt);
          // Salva anche in Memory Vault se loggato (best-effort, non blocca)
          try {
            const idToken2 = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            if (userId && idToken2) {
              const whenStr = pending.startAt.toLocaleString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
              saveToMemory({ userId, idToken: idToken2 }, { keyFact: `${pending.title} — ${whenStr}` }).catch(() => {});
            }
          } catch (_) {}
          const whenStr = pending.startAt.toLocaleString(locale);
          const expoTail = IS_EXPO_GO ? `\n\n${t('chat.reminderExpoGoLimit')}` : '';
          setMessaggi((prev) => [
            ...prev,
            { id: `b_${now}_appt_ok`, tipo: 'bot', testo: t('chat.appointmentScheduled', { title: pending.title, when: whenStr }) + expoTail, createdAt: now + 1 },
          ]);
        } catch (e) {
          setMessaggi((prev) => [
            ...prev,
            { id: `b_${now}_appt_err`, tipo: 'bot', testo: t('chat.saveErrorGeneric'), createdAt: now + 1 },
          ]);
        }
      } else {
        setMessaggi((prev) => [
          ...prev,
          { id: `b_${now}_appt_no`, tipo: 'bot', testo: t('chat.appointmentNotScheduled'), createdAt: now + 1 },
        ]);
      }
      return;
    }

    // Se l'utente scrive un appuntamento con data/ora, chiediamo conferma (non scheduliamo ancora).
    try {
      const parsed = parseAppointmentFromMessage(rawMessage);
      if (parsed?.startAt && parsed?.title) {
        // Se esiste già un appuntamento identico (stesso titolo+startAt), non rischedulare/ri-chiedere.
        let already = false;
        try {
          const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          if (Array.isArray(existing)) {
            already = existing.some((x) => x && x.startAt === parsed.startAt.toISOString() && x.title === parsed.title);
          }
        } catch (_) {}

        const now = Date.now();
        setMessaggi((prev) => [
          ...prev,
          { id: `u_${now}`, tipo: 'user', testo: rawMessage, createdAt: now },
        ]);

        const whenStr = parsed.startAt.toLocaleString(locale);
        if (already) {
          setMessaggi((prev) => [
            ...prev,
            { id: `b_${now}_appt_dup`, tipo: 'bot', testo: t('chat.appointmentAlreadyExists', { title: parsed.title, when: whenStr }), createdAt: now + 1 },
          ]);
          return;
        }

        pendingAppointmentRef.current = { title: parsed.title, startAt: parsed.startAt, sourceText: rawMessage };
        setMessaggi((prev) => [
          ...prev,
          { id: `b_${now}_appt_q`, tipo: 'bot', testo: t('chat.appointmentConfirmPrompt'), createdAt: now + 1 },
          { id: `b_${now}_appt_h`, tipo: 'bot', testo: t('chat.appointmentConfirmHint', { when: whenStr }), createdAt: now + 2 },
        ]);
        return;
      }
    } catch (_) {}

    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (SHOW_OXY_KEY_OPTION) {
      if (!hasOxyKey && !hasGeminiKey) {
        setShowOxyKeyGate(true);
        Alert.alert(t('ui.oxyKeyRequiredTitle'), t('ui.oxyKeyRequiredBodySend'));
        if (isTypedSend) restoreTypedInputIfEmpty();
        return;
      }
    } else {
      if (!idToken) {
        Alert.alert(t('chat.errorTitle'), t('chat.authRequiredError'));
        if (isTypedSend) restoreTypedInputIfEmpty();
        return;
      }
    }

    // Badge "Modalità": se selezionato, applicalo senza mostrare il prompt all'utente.
    // Compatibilità: se l'utente incolla manualmente un prompt badge (it o en), lo rileviamo e attiviamo la modalità.
    let actualMessage = rawMessageForAi;
    let nextSticky = stickyBadge;
    const stickyPrompt = nextSticky ? getBadgePrompt(nextSticky, language) : '';
    if (stickyPrompt) {
      actualMessage = (nextSticky.prompt && rawMessageForAi.startsWith(nextSticky.prompt)) || (nextSticky.promptEn && rawMessageForAi.startsWith(nextSticky.promptEn)) ? rawMessageForAi : (stickyPrompt + rawMessageForAi);
    }
    for (const b of POWER_BADGES) {
      if (messageStartsWithBadgePrompt(actualMessage, b)) {
        nextSticky = b;
        break;
      }
    }
    if ((nextSticky?.id || null) !== (stickyBadge?.id || null)) setStickyBadge(nextSticky || null);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isTypedSend) {
      Keyboard.dismiss();
    }
    const userMsgId = `u_${Date.now()}`;
    const botMsgId = `b_${Date.now()}`;
    const now = Date.now();

    setMessaggi((prev) => [
      ...prev,
      { id: userMsgId, tipo: 'user', testo: rawMessage, createdAt: now },
      { id: botMsgId, tipo: 'bot', testo: t('chat.thinking'), createdAt: now },
    ]);
    setChatHistory((prev) => [...prev, { role: 'user', content: rawMessage }]);
    if (userId) saveMessageToDb(userId, 'user', rawMessage, idToken);

    setStaCaricando(true);
    userRequestedStopRef.current = false;
    chatAbortControllerRef.current = new AbortController();
    const signal = chatAbortControllerRef.current.signal;
    let didSucceed = false;

    try {
      const safeUserProfile = userData && typeof userData === 'object' ? userData : undefined;
      const key = await getKeyForCurrentUser();
      const geminiKey = await getGeminiKey();
      const aiResult = await callOxyAi({
        apiKey: key || undefined,
        geminiApiKey: (geminiKey && isValidGeminiKeyFormat(geminiKey)) ? geminiKey : undefined,
        idToken,
        useBackendForMaster: false,
        userId,
        language,
        moduleName: moduloAttivo,
        userProfile: safeUserProfile,
        history: Array.isArray(chatHistory) ? chatHistory : [],
        message: actualMessage,
        customAiName: effectiveAiName,
        voiceId: effectiveVoiceId || undefined,
        signal,
      });

        if (!aiResult || (aiResult.answer != null && typeof aiResult.answer !== 'string')) {
          throw new Error('Risposta IA non valida');
        }

        const risposta = String(aiResult.answer ?? '').trim();
        if (!risposta) {
          setMessaggi((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, testo: t('chat.errorGeneric') } : m))
          );
          return;
        }

        let testoParziale = '';
        const parole = risposta.split(/\s+/).filter(Boolean);
        const maxWordAnim = 300;
        const wordsToAnimate = parole.length <= maxWordAnim ? parole : parole.slice(0, maxWordAnim);

        for (const parola of wordsToAnimate) {
          if (userRequestedStopRef.current) break;
          testoParziale += parola + ' ';
          setMessaggi((prev) =>
            prev.map((m) =>
              m.id === botMsgId ? { ...m, testo: testoParziale.trim() } : m
            )
          );
          await new Promise((res) => setTimeout(res, 35));
        }

        if (parole.length > maxWordAnim) {
          setMessaggi((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, testo: risposta } : m))
          );
        }

        const testoFinale = userRequestedStopRef.current ? testoParziale.trim() : risposta;
        const interrottoInAnimazione = userRequestedStopRef.current && testoFinale.length > 0;

        setMessaggi((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? { ...m, testo: interrottoInAnimazione ? `${testoFinale}\n\n${t('chat.abortedMessage')}` : risposta }
              : m
          )
        );
        setChatHistory((prev) => [...prev, { role: 'assistant', content: interrottoInAnimazione ? testoFinale : risposta }]);
        if (userId) saveMessageToDb(userId, 'assistant', interrottoInAnimazione ? testoFinale : risposta, idToken);
        if (doTts && !userRequestedStopRef.current) playOxyVoice(risposta);
        didSucceed = true;
    } catch (err) {
      const isAborted = err?.message === ABORTED_MESSAGE;
      const isRateLimit = !isAborted && (err?.message === RATE_LIMIT_SENTINEL || /429|rate limit|rate limit raggiunto/i.test(err?.message || ''));
      const isDailyCreditsUsed = !isAborted && (isRateLimit && /daily_high_priority_credits_used|limite giornaliero|messaggi\/giorno/i.test(err?.message || ''));
      const isNetworkError = !isAborted && !isRateLimit && /network request failed|failed to fetch|load failed|connection refused/i.test(err?.message || '');
      const looksLikePaywall = !isAborted && !isRateLimit && !isNetworkError && !SHOW_OXY_KEY_OPTION
        && /Oxy Key non configurata|non autorizzato|abbonamento|subscription|nessun piano attivo|piano lifetime/i.test(err?.message || '');
      const errMsg = isAborted
        ? t('chat.abortedMessage')
        : (isDailyCreditsUsed
            ? (SHOW_UPGRADE ? t('billing.limitReachedMessage') : t('billing.limitReachedShareMessage'))
            : (isRateLimit
                ? t('chat.errorRateLimit')
                : (isNetworkError
                    ? t('chat.errorNetwork')
                    : (looksLikePaywall
                        ? t('ui.subscriptionVisionBody')
                        : (err?.message || t('chat.errorGeneric'))))));
      const errTesto = typeof errMsg === 'string' && errMsg.length < 500 ? errMsg : t('chat.errorGeneric');

      // UX: mostra l'errore anche in chat (così non sembra "si è interrotto" senza risposta)
      setMessaggi((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, testo: errTesto } : m
        )
      );

      if (!isAborted) {
        if (looksLikePaywall) setShowOxyKeyGate(true);
        if (isDailyCreditsUsed) {
          refreshBillingStatus();
          Alert.alert(
            t('chat.errorTitle'),
            errTesto,
            [
              { text: t('common.ok') },
                {
                text: t('billing.upgradeNow'),
                onPress: () => {
                  setShowMenuModal(true);
                  setMenuTab('impostazioni');
                  setMenuSubView('abbonamento');
                  setBillingPlanView('subscription');
                },
              },
            ]
          );
        } else {
          Alert.alert(t('chat.errorTitle'), errTesto);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      if (doTts && !isAborted) {
        const fallback = isRateLimit
          ? t('chat.errorRateLimit')
          : (isNetworkError ? t('chat.errorNetwork') : t('chat.errorGeneric'));
        playOxyVoice(fallback);
      }
    } finally {
      chatAbortControllerRef.current = null;
      userRequestedStopRef.current = false;
      if (didSucceed) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
      }
      setStaCaricando(false);
      setSendInCooldown(true);
      if (sendCooldownTimerRef.current) clearTimeout(sendCooldownTimerRef.current);
      sendCooldownTimerRef.current = setTimeout(() => {
        setSendInCooldown(false);
        sendCooldownTimerRef.current = null;
      }, 2000);
    }
  }, [
    inputMessage,
    staCaricando,
    sendInCooldown,
    moduloAttivo,
    userData,
    userId,
    language,
    chatHistory,
    hasOxyKey,
    effectiveAiName,
    backendUrl,
    stickyBadge,
    effectiveVoiceId,
    voiceReplyMode,
    playOxyVoice,
    t,
    looksLikeDocSearchIntent,
    looksLikeDocEmailIntent,
    pickDocsAndSendToAi,
    openDocEmailModal,
    lastPickedDocAssets,
    parseAppointmentFromMessage,
    scheduleAppointmentNotifications,
    addAppointmentLocal,
    refreshBillingStatus,
  ]);

  sendMessageRef.current = sendMessage;

  useEffect(() => {
    return () => {
      if (sendCooldownTimerRef.current) {
        clearTimeout(sendCooldownTimerRef.current);
        sendCooldownTimerRef.current = null;
      }
    };
  }, []);

  const GOLD_ICON = '#FFD700';

  const openMessageMenu = useCallback((text, isFromBot = false) => {
    if (!text || typeof text !== 'string') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessageText(text);
    setSelectedMessageFromBot(!!isFromBot);
    setMessageMenuVisible(true);
  }, []);

  const closeMessageMenu = useCallback(() => {
    setMessageMenuVisible(false);
    setSelectedMessageText('');
    setSelectedMessageFromBot(false);
  }, []);

  const handleCopyMessage = useCallback(async () => {
    if (!selectedMessageText) return;
    try {
      await Clipboard.setStringAsync(selectedMessageText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeMessageMenu();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [selectedMessageText, closeMessageMenu]);

  const handleForwardMessage = useCallback(async () => {
    if (!selectedMessageText) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: selectedMessageText,
        title: t('chat.forwardMessageTitle'),
      });
      closeMessageMenu();
    } catch (e) {
      if (e?.message !== 'User did not share') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      closeMessageMenu();
    }
  }, [selectedMessageText, t, closeMessageMenu]);

  const handleShareMessage = useCallback(async () => {
    if (!selectedMessageText) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: selectedMessageText,
        title: t('chat.shareMessageTitle'),
      });
      closeMessageMenu();
    } catch (e) {
      if (e?.message !== 'User did not share') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      closeMessageMenu();
    }
  }, [selectedMessageText, t, closeMessageMenu]);

  const handleSaveAsGoal = useCallback(async () => {
    if (!selectedMessageText) return;
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!idToken) throw new Error(t('chat.authRequiredError'));
      await saveToMemory({ userId, idToken }, { goal: selectedMessageText });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeMessageMenu();
      Alert.alert(t('chat.savedTitle'), t('chat.savedGoalBody'), [
        { text: t('chat.savedToVaultVedi'), onPress: () => { setShowMemoryVaultModal(true); setMemoryVaultData(null); refetchMemoryVault(false); } },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert(t('chat.errorTitle'), e?.message || t('chat.saveErrorGeneric'));
      closeMessageMenu();
    }
  }, [selectedMessageText, t, closeMessageMenu, refetchMemoryVault]);

  const handleRememberThis = useCallback(async () => {
    if (!selectedMessageText) return;
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!idToken) throw new Error(t('chat.authRequiredError'));
      await saveToMemory({ userId, idToken }, { keyFact: selectedMessageText });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeMessageMenu();
      Alert.alert(t('chat.savedTitle'), t('chat.savedRememberBody'), [
        { text: t('chat.savedToVaultVedi'), onPress: () => { setShowMemoryVaultModal(true); setMemoryVaultData(null); refetchMemoryVault(false); } },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert(t('chat.errorTitle'), e?.message || t('chat.saveErrorGeneric'));
      closeMessageMenu();
    }
  }, [selectedMessageText, t, closeMessageMenu, refetchMemoryVault]);

  // Logout: signOut + pulizia AsyncStorage (USER_DATA, IS_LOGGED_IN, SERVER_CONFIG) + reset stati
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.IS_LOGGED_IN,
        STORAGE_KEYS.SERVER_CONFIG,
        STORAGE_KEYS.ADMIN_BYPASS,
      ]);
      setIsLogged(false);
      setUserId(null);
      setUserData({
        nomeUtente: '',
        emailPrincipale: '',
        emailSecondaria: '',
        telefonoRecupero: '',
      });
      setMessaggi([
        { id: '1', tipo: 'bot', testo: getWelcomePhraseForHour() },
      ]);
      setChatHistory([]);
      initialMessageRequestedRef.current = false;
      setSessionWelcomeMessage(null);
      setViewAttiva('chat');
      setShowOxyKeyGate(false);
      setModuloAttivo('Aiuto Mail');
      setShowMenuModal(false);
      setShowRegister(false);
      setShowPasswordSection(false);
      setShow2FAForUpdate(false);
      setShowPlanChoiceAfterSignup(false);
      setPlanChoiceDismissedToBilling(false);
      setShowPlanTierSelection(false);
      setPlanTypeChosen(null);
      setShowVoiceChoiceAfterPayment(false);
      setMenuTab('prompt');
      setMenuSubView(null);
      setIs2FAStage(false);
      setChannelSelected(null);
      setOtpInput('');
      setOtpResendCountdown(0);
      setInputMessage('');
      setTesto('');
      setStaCaricando(false);
      setServerConfig({ host: '', username: '', token: '' });
      setSorgenteSelezionata(null);
      setFeedbackMsg('');
      setOldPasswordInput('');
      setNewPassword('');
      setConfirmNewPassword('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(t('errors.logout'), err);
      setIsLogged(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [t]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!idToken) {
        Alert.alert(t('settings.deleteAccountError'));
        return;
      }
      const base = getBackendBaseUrl();
      const res = await fetch(`${base}/api/me/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      });
      const data = res.ok ? await res.json().catch(() => ({})) : null;
      if (res.ok && data?.ok) {
        setShowMenuModal(false);
        setMenuSubView(null);
        Alert.alert(t('settings.deleteAccountSuccess'), '', [{ text: 'OK', onPress: handleLogout }]);
      } else {
        const msg = (data?.error || (res.status === 401 ? 'Non autorizzato' : 'Errore di rete')) || t('settings.deleteAccountError');
        Alert.alert(t('settings.deleteAccountError'), typeof msg === 'string' ? msg : undefined);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error('delete-account', err);
      Alert.alert(t('settings.deleteAccountError'), err?.message || '');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [t, handleLogout]);

  // Lista messaggi da mostrare: in cima il messaggio di benvenuto di sessione (quando si rientra nell'app), poi la cronologia.
  // Normalizza ogni messaggio (id, tipo, testo, createdAt) per evitare crash da undefined in render.
  const messagesToShow = useMemo(
    () => {
      const list = sessionWelcomeMessage
        ? [{ id: 'session_welcome', tipo: 'bot', testo: sessionWelcomeMessage, createdAt: null }, ...messaggi]
        : messaggi;
      return list.map((m, idx) => ({
        id: m?.id ?? `msg_${idx}`,
        tipo: m?.tipo === 'user' ? 'user' : 'bot',
        testo: typeof m?.testo === 'string' ? m.testo : '',
        createdAt: m?.createdAt ?? null,
      }));
    },
    [sessionWelcomeMessage, messaggi]
  );

  // Primo frame: solo View + Text per evitare crash da moduli nativi (SafeAreaProvider, LinearGradient, OxyLogo/Animated)
  if (!safeToShowFullUI) {
    return (
      <View style={{ flex: 1, backgroundColor: '#002b4d', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#c5a059', fontSize: 26, fontWeight: '800', letterSpacing: 2 }}>OXY Real™</Text>
      </View>
    );
  }

  if (isLoading) {
    // Solo logo, niente spinner né "Caricamento...": lo splash nativo resta visibile fino a hideAsync()
    return (
      <ErrorBoundary>
      <SafeAreaProvider>
        <LinearGradient colors={['#002b4d', '#002b4d']} style={styles.loadingContainer}>
          <SafeAreaView style={styles.loadingSafe} edges={['top']}>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 30, overflow: 'visible' }}>
              <OxyLogo large />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (authConnectionError) {
    return (
      <ErrorBoundary>
      <SafeAreaProvider>
        <LinearGradient colors={['#002b4d', '#002b4d']} style={styles.loadingContainer}>
          <SafeAreaView style={styles.loadingSafe} edges={['top']}>
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
              <OxyLogo large />
              <Text style={{ color: '#ff6b6b', fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: 24 }}>
                {t('ui.securityConnectionError')}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Sconto lancio 50%: giorni rimanenti dai primi 30 dal go-live (solo descrittivo; prezzi scontati vanno configurati su Stripe)
  const daysLeftLaunchDiscount = (() => {
    try {
      const goLive = new Date(GO_LIVE_DATE_STR).getTime();
      if (Number.isNaN(goLive)) return 0;
      return Math.max(0, 30 - Math.floor((Date.now() - goLive) / 86400000));
    } catch (_) { return 0; }
  })();

  // Schermata Starter / Pro / Elite (dopo tap Abbonamento o Lifetime)
  const tierPlans = planTypeChosen ? PLANS.filter((p) => p.group === planTypeChosen) : [];
  if (showPlanTierSelection && planTypeChosen && tierPlans.length > 0) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }} edges={['top']}>
              <TouchableOpacity
                style={{ position: 'absolute', top: 56, left: 24, zIndex: 1, padding: 8 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPlanTierSelection(false);
                  setPlanTypeChosen(null);
                }}
              >
                <Text style={{ color: '#c5a059', fontSize: 16 }}>{t('common.back')}</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <OxyLogo large />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 24 }}>
                {planTypeChosen === 'subscription' ? t('register.planSubscription') : t('register.planLifetime')}
              </Text>
              {tierPlans.map((plan) => {
                const planName = t(`pricing.plans.${plan.id}.name`);
                const price = daysLeftLaunchDiscount > 0 ? getLaunchDiscountPrice(plan.suggestedPrice) : plan.suggestedPrice;
                const priceStr = String(Math.floor(price)).replace('.', ',');
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={{ backgroundColor: 'rgba(197,160,89,0.25)', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#c5a059', width: '100%' }}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (userId) AsyncStorage.setItem(STORAGE_KEYS.HAS_CHOSEN_PLAN_PREFIX + userId, 'true').catch(() => {});
                      setPlanChoiceDismissedToBilling(true);
                      setShowPlanTierSelection(false);
                      setPlanTypeChosen(null);
                      setViewAttiva('chat');
                      await openCheckoutForPlan(plan.id);
                    }}
                  >
                    <Text style={{ color: '#c5a059', fontWeight: '600', fontSize: 16 }}>{planName}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 }}>
                      {priceStr} {CURRENCY_DEFAULT}{planTypeChosen === 'subscription' ? `/${t('billing.perMonth')}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </SafeAreaView>
          </LinearGradient>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Payment gate: scelta piano full-screen (Abbonamento / Lifetime).
  const showPlanChoice = (showPlanChoiceAfterSignup || (isLogged && !billingStatus.active)) && !planChoiceDismissedToBilling && !showPlanTierSelection;
  if (showPlanChoice) {
    if (isLogged && !billingStatus.active) hadSeenNotPaidThisSessionRef.current = true;
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }} edges={['top']}>
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <OxyLogo large />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 24 }}>
                {t('register.planChoiceTitle')}
              </Text>
              <>
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(197,160,89,0.25)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#c5a059' }}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (userId) AsyncStorage.setItem(STORAGE_KEYS.HAS_CHOSEN_PLAN_PREFIX + userId, 'true').catch(() => {});
                      setShowPlanChoiceAfterSignup(false);
                      setShowPlanTierSelection(true);
                      setPlanTypeChosen('subscription');
                    }}
                  >
                    <Text style={{ color: '#c5a059', fontWeight: '600', fontSize: 16 }}>{t('register.planSubscription')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(197,160,89,0.25)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#c5a059' }}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (userId) AsyncStorage.setItem(STORAGE_KEYS.HAS_CHOSEN_PLAN_PREFIX + userId, 'true').catch(() => {});
                      setShowPlanChoiceAfterSignup(false);
                      setShowPlanTierSelection(true);
                      setPlanTypeChosen('lifetime');
                    }}
                  >
                    <Text style={{ color: '#c5a059', fontWeight: '600', fontSize: 16 }}>{t('register.planLifetime')}</Text>
                  </TouchableOpacity>
                </>
            </SafeAreaView>
          </LinearGradient>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Share gate disattivato.
  const showShareGateForFree = false;
  if (showShareGateForFree) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }} edges={['top']}>
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <OxyLogo large />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
                {t('shareOxy.shareGateTitle')}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, textAlign: 'center', marginBottom: 28 }}>
                {t('shareOxy.shareGateBody')}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#c5a059', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center', flexDirection: 'row', gap: 10 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  shareOxyForDiscount();
                }}
              >
                <FontAwesome name="share-alt" size={20} color="#0a0a0a" />
                <Text style={{ color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 }}>{t('shareOxy.button')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 16, paddingVertical: 10 }}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (userId) await AsyncStorage.setItem(STORAGE_KEYS.HAS_SKIPPED_SHARE_GATE_PREFIX + userId, 'true').catch(() => {});
                  setSkippedShareGateForFree(true);
                  setViewAttiva('chat');
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{t('shareOxy.enterWithoutSharing')}</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </LinearGradient>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Oxy Key Gate: in subscription solo messaggio (nessuna chiave in app).
  if (isLogged && showOxyKeyGate && !isFreePlan && SHOW_UPGRADE) {
    if (!SHOW_OXY_KEY_OPTION) {
      // Modalità abbonamento: nessuna opzione chiave, solo avviso + link alla sezione Abbonamento
      return (
        <ErrorBoundary>
        <SafeAreaProvider>
          <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }} edges={['top']}>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <OxyLogo large />
              </View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                {t('ui.subscriptionTitle')}
              </Text>
              <Text style={{ color: '#b0b0c0', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                {t('ui.subscriptionVisionBody')}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#c5a059', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowOxyKeyGate(false);
                  // Riporta alla scelta Abbonamento | Lifetime (nessuna pagina interna dell'app)
                  setPlanChoiceDismissedToBilling(false);
                  setShowPlanTierSelection(false);
                  setPlanTypeChosen(null);
                }}
              >
                <Text style={{ color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 }}>{t('billing.alertAuthRequiredTitle')}</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </LinearGradient>
        </SafeAreaProvider>
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
      <SafeAreaProvider>
      <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }} edges={['top']}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <OxyLogo large />
          </View>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
            {t('ui.oxyKeyRequiredTitle')}
          </Text>
          <Text style={{ color: '#b0b0c0', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            {t('ui.oxyKeyRequiredBodySend')}
          </Text>
          <TextInput
            style={{
              backgroundColor: '#0d0d2b',
              borderWidth: 1.5,
              borderColor: '#c5a059',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: '#fff',
              fontSize: 16,
              marginBottom: 12,
            }}
            placeholder="sk-..."
            placeholderTextColor="#888"
            value={oxyKeyInput}
            onChangeText={(txt) => { setOxyKeyInput(txt); setOxyKeyError(''); }}
            secureTextEntry
            autoCapitalize="none"
          />
          {oxyKeyError ? <Text style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 12 }}>{oxyKeyError}</Text> : null}
          <TouchableOpacity
            style={{
              backgroundColor: '#c5a059',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 24,
            }}
            onPress={handleSaveOxyKey}
          >
            <Text style={{ color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 }}>{t('ui.oxyKeySaveAndEnter')}</Text>
          </TouchableOpacity>
          <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{t('ui.geminiKeyTitle')}</Text>
          <Text style={{ color: '#666', fontSize: 11, textAlign: 'center', marginBottom: 10 }}>{t('ui.geminiKeyHint')}</Text>
          <TextInput
            style={{
              backgroundColor: '#0d0d2b',
              borderWidth: 1.5,
              borderColor: '#5a9fc5',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: '#fff',
              fontSize: 16,
              marginBottom: 12,
            }}
            placeholder={t('ui.geminiKeyPlaceholder')}
            placeholderTextColor="#888"
            value={geminiKeyInput}
            onChangeText={(txt) => { setGeminiKeyInput(txt); setGeminiKeyError(''); }}
            secureTextEntry
            autoCapitalize="none"
          />
          {geminiKeyError ? <Text style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 12 }}>{geminiKeyError}</Text> : null}
          <TouchableOpacity
            style={{
              backgroundColor: '#5a9fc5',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
            }}
            onPress={handleSaveGeminiKey}
          >
            <Text style={{ color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 }}>{t('ui.geminiKeySave')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
      </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Dopo pagamento riuscito: scelta voce, poi con Conferma si va in Chat (Oxy accoglie l'utente)
  if (isLogged && showVoiceChoiceAfterPayment) {
    const selectedVoiceId = voiceChoicePending ?? voiceId;
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }} edges={['top']}>
              <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 24 }}>
                <OxyLogo large />
              </View>
              <Text style={[styles.firstLaunchLanguageTitle, { marginBottom: 8 }]}>{t('register.stepVoiceTitle')}</Text>
              <Text style={[styles.firstLaunchLanguageSubtitle, { marginBottom: 20 }]}>{t('register.stepVoiceSubtitle')}</Text>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {VOICE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setVoiceChoicePending(opt.id);
                      setVoiceId(opt.id);
                    }}
                    activeOpacity={0.8}
                    style={{ marginBottom: 12 }}
                  >
                    <View style={[styles.voiceOptionCard, selectedVoiceId === opt.id && styles.voiceOptionCardActive]}>
                      <Text style={styles.voiceOptionLabel}>{opt.label}</Text>
                      <Text style={styles.voiceOptionDesc}>{opt.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                onPress={async () => {
                  if (!selectedVoiceId) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  try {
                    await AsyncStorage.setItem(STORAGE_KEYS.VOICE_ID, selectedVoiceId);
                  } catch (_) {}
                  setVoiceId(selectedVoiceId);
                  setShowVoiceChoiceAfterPayment(false);
                  setVoiceChoicePending(null);
                  setViewAttiva('chat');
                  const welcomeText =
                    billingStatus?.planId && billingStatus?.mode
                      ? getWelcomeMessageAfterPayment(billingStatus.planId, billingStatus.mode, t)
                      : getWelcomePhraseForHour();
                  setMessaggi([{ id: '1', tipo: 'bot', testo: welcomeText }]);
                }}
                style={[
                  styles.firstLaunchLanguageConfirmButton,
                  !selectedVoiceId && styles.firstLaunchLanguageConfirmButtonDisabled,
                ]}
                activeOpacity={0.8}
                disabled={!selectedVoiceId}
              >
                <Text style={styles.firstLaunchLanguageConfirmText}>{t('register.confirmLanguage')}</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </LinearGradient>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Utente non loggato: prima scelta lingua (solo al primo avvio), poi Login/Registrazione. Se è loggato (registrato, nessun logout) si va direttamente alla chat sopra.
  if (!isLogged) {
    if (!appReady) {
      return (
        <ErrorBoundary>
        <SafeAreaProvider>
          <LinearGradient colors={['#002b4d', '#002b4d']} style={styles.loadingContainer}>
            <SafeAreaView style={styles.loadingSafe} edges={['top']}>
              <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 30, overflow: 'visible' }}>
                <OxyLogo large />
              </View>
            </SafeAreaView>
          </LinearGradient>
        </SafeAreaProvider>
        </ErrorBoundary>
      );
    }
    // Primo avvio: scelta lingua, poi Login/Registrazione. In produzione una tantum; in dev/beta ogni avvio fino a quando l'utente non sceglie (tap) → allora si va a Login/Registrazione.
    const showLanguageScreen = (BETA_ALWAYS_SHOW_LANGUAGE_FIRST && !hasChosenLanguageThisSession) || needFirstLaunchLanguageChoice === true;
    if (showLanguageScreen) {
      return (
        <ErrorBoundary>
          <SafeAreaProvider>
            <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
              <StatusBar barStyle="light-content" />
              <View style={styles.firstLaunchLanguageWrap}>
                <Text style={styles.firstLaunchLanguageTitle}>{translate('en', 'register.stepLanguage')}</Text>
                <Text style={styles.firstLaunchLanguageSubtitle}>{translate('en', 'register.chooseLanguage')}</Text>
                {[...LANGUAGES]
                  .sort((a, b) => (LANGUAGE_LABELS[a] || a).localeCompare(LANGUAGE_LABELS[b] || b, 'en'))
                  .map((lng) => (
                  <TouchableOpacity
                    key={lng}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPendingLanguageChoice(lng);
                    }}
                    style={[
                      styles.firstLaunchLanguageOption,
                      lng === pendingLanguageChoice && styles.firstLaunchLanguageOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.firstLaunchLanguageOptionText,
                        lng === pendingLanguageChoice && styles.firstLaunchLanguageOptionTextActive,
                      ]}
                    >
                      {LANGUAGE_LABELS[lng] || lng.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={async () => {
                    if (pendingLanguageChoice == null) return;
                    const lng = pendingLanguageChoice;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    try {
                      await AsyncStorage.multiSet([
                        [STORAGE_KEYS.LANGUAGE, lng],
                        [STORAGE_KEYS.HAS_CHOSEN_LANGUAGE_AT_STARTUP, 'true'],
                      ]);
                    } catch (_) {}
                    setLanguage(lng);
                    setNeedFirstLaunchLanguageChoice(false);
                    setHasChosenLanguageThisSession(true);
                  }}
                  style={[
                    styles.firstLaunchLanguageConfirmButton,
                    pendingLanguageChoice == null && styles.firstLaunchLanguageConfirmButtonDisabled,
                  ]}
                  activeOpacity={0.8}
                  disabled={pendingLanguageChoice == null}
                >
                  <Text style={styles.firstLaunchLanguageConfirmText}>{translate('en', 'register.confirmLanguage')}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </SafeAreaProvider>
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary>
      <SafeAreaProvider>
        <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          <AuthScreen
            onSuccess={handleAuthSuccess}
            onOpenLanguage={null}
            language={language}
            onLanguageChange={(lng) => {
              setLanguage(lng);
              AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lng).catch(() => {});
            }}
            t={(key, params) => translate(language, key, params)}
          />
        </LinearGradient>
        {/* Modal Selezione Lingua (dal menu/impostazioni, solo se già fatto primo avvio) */}
        <Modal
          visible={showLanguageModal}
          animationType="none"
          transparent
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.settingsPanel}>
              <View style={styles.modalHeader}>
                <Text style={styles.settingsTitle}>{t('settings.languageModalTitle')}</Text>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <Text style={styles.closeModal}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
              {LANGUAGES.map((lng) => (
                <TouchableOpacity
                  key={lng}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLanguage(lng);
                    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lng).catch(() => {});
                    setShowLanguageModal(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginBottom: 10,
                    backgroundColor:
                      lng === language ? 'rgba(197,160,89,0.22)' : 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor:
                      lng === language ? '#c5a059' : 'rgba(255,255,255,0.15)',
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: lng === language ? '700' : '500',
                    }}
                  >
                    {LANGUAGE_LABELS[lng] || lng.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Modal Registrazione */}
        <Modal
          visible={showRegister}
          animationType="slide"
          onRequestClose={() => {
            setRegisterError(''); // Pulisci errori alla chiusura
            setShowRegister(false);
          }}
        >
          <View style={styles.regModal}>
            <Text style={styles.regHeader}>{t('register.modalTitle')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.regInput}
                placeholder={t('register.firstName')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={regData.nome}
                onChangeText={(val) => setRegData({ ...regData, nome: val })}
                accessibilityLabel={t('register.firstName')}
              />
              <TextInput
                style={styles.regInput}
                placeholder={t('register.lastName')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={regData.cognome}
                onChangeText={(val) => setRegData({ ...regData, cognome: val })}
                accessibilityLabel={t('register.lastName')}
              />
              <TextInput
                style={styles.regInput}
                placeholder={t('register.birthDate')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={regData.dataNascita}
                onChangeText={(val) => {
                  const onlyDigits = val.replace(/\D/g, '').slice(0, 8);
                  let formatted = '';
                  if (onlyDigits.length <= 2) {
                    formatted = onlyDigits;
                  } else if (onlyDigits.length <= 4) {
                    formatted = `${onlyDigits.slice(0, 2)}/${onlyDigits.slice(2)}`;
                  } else {
                    formatted = `${onlyDigits.slice(0, 2)}/${onlyDigits.slice(2, 4)}/${onlyDigits.slice(4)}`;
                  }
                  setRegData({ ...regData, dataNascita: formatted });
                }}
                keyboardType="numeric"
                accessibilityLabel={t('register.birthDate')}
              />
              <TextInput
                style={styles.regInput}
                placeholder={t('register.emailMain')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={regData.email}
                onChangeText={(val) => setRegData({ ...regData, email: val })}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel={t('register.emailMain')}
              />
              <TextInput
                style={styles.regInput}
                placeholder={t('register.emailBackup')}
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={regData.emailSecondaria}
                onChangeText={(val) => setRegData({ ...regData, emailSecondaria: val })}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel={t('register.emailBackup')}
              />
              <View
                style={[
                  styles.regInput,
                  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCountryPickerVisible(true);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRightWidth: 1,
                    borderRightColor: 'rgba(255,255,255,0.25)',
                  }}
                  accessibilityLabel="Select country code"
                >
                  <Text style={{ fontSize: 18, marginRight: 6 }}>
                    {phoneCountry.flag}
                  </Text>
                  <Text style={{ fontSize: 16, color: '#c5a059' }}>
                    +{phoneCountry.callingCode}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 14,
                    color: '#fff',
                    fontSize: 16,
                  }}
                  placeholder={t('register.phone')}
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={regData.telefono}
                  onChangeText={(val) => {
                    const digits = val.replace(/\D/g, '');
                    if (digits.length >= 8 && phoneDigitsLengthRef.current < 8) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    phoneDigitsLengthRef.current = digits.length;
                    setRegData({ ...regData, telefono: digits });
                  }}
                  keyboardType="phone-pad"
                  accessibilityLabel={t('register.phone')}
                />
              </View>
              <View
                style={[
                  styles.regInput,
                  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 },
                ]}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 18,
                    paddingRight: 42,
                    color: '#fff',
                    fontSize: 15,
                  }}
                  placeholder={t('register.password')}
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={regData.password}
                  onChangeText={(val) => setRegData({ ...regData, password: val })}
                  secureTextEntry={!regPasswordVisible}
                  accessibilityLabel={t('register.password')}
                />
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRegPasswordVisible((prev) => !prev);
                  }}
                  style={{ position: 'absolute', right: 16, padding: 4 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={
                    regPasswordVisible ? 'Nascondi password' : 'Mostra password'
                  }
                >
                  <FontAwesome
                    name={regPasswordVisible ? 'eye-slash' : 'eye'}
                    size={18}
                    color="#c5a059"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.passwordHint}>{t('register.passwordHint')}</Text>
              <View
                style={[
                  styles.regInput,
                  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 },
                ]}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 18,
                    paddingRight: 42,
                    color: '#fff',
                    fontSize: 15,
                  }}
                  placeholder={t('register.passwordConfirm')}
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={regData.confirmPassword}
                  onChangeText={(val) => setRegData({ ...regData, confirmPassword: val })}
                  secureTextEntry={!regConfirmPasswordVisible}
                  accessibilityLabel={t('register.passwordConfirm')}
                />
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRegConfirmPasswordVisible((prev) => !prev);
                  }}
                  style={{ position: 'absolute', right: 16, padding: 4 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={
                    regConfirmPasswordVisible
                      ? 'Nascondi conferma password'
                      : 'Mostra conferma password'
                  }
                >
                  <FontAwesome
                    name={regConfirmPasswordVisible ? 'eye-slash' : 'eye'}
                    size={18}
                    color="#c5a059"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.ctaRegBtn, staCaricando && styles.disabledBtn]}
                onPress={handleCreateProfile}
                disabled={staCaricando}
              >
                {staCaricando ? (
                  <ActivityIndicator color="#0a0a0a" />
                ) : (
                  <Text style={styles.ctaRegBtnText}>{t('register.button')}</Text>
                )}
              </TouchableOpacity>

              {registerError ? (
                <Text style={styles.errorText}>{registerError}</Text>
              ) : null}

              <TouchableOpacity onPress={() => {
                setRegisterError(''); // Pulisci errori quando si torna al login
                setShowRegister(false);
              }}>
                <Text style={styles.backLogin}>{t('register.backToLogin')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  const countryPickerTheme = {
    ...DARK_THEME,
    primaryColor: '#c5a059',
    primaryColorVariant: '#c5a059',
    backgroundColor: '#0a0a0a',
    onBackgroundTextColor: '#ffffff',
    filterPlaceholderTextColor: 'rgba(255,255,255,0.6)',
  };

  // --- VISTA PRINCIPALE (dopo login) ---
  return (
    <ErrorBoundary>
    <SafeAreaProvider>
    <LinearGradient
      colors={['#002b4d', '#002b4d']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
        enabled
      >
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
          <StatusBar barStyle="light-content" backgroundColor="#002b4d" />
          {isConnected === false && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>{t('chat.offlineBanner')}</Text>
            </View>
          )}

          {Platform.OS === 'web' ? (
            <>
              {/* Top fisso su web/desktop: logo, profilo, hamburger sempre visibili */}
              <View style={[styles.header, styles.headerWebFixed]}>
                <View style={styles.topRow}>
                  <View style={styles.headerLeft}>
                    <OxyLogo />
                  </View>
                  <View style={styles.headerSpacer} />
                  <View style={styles.hamburgerWrap}>
                    <TouchableOpacity
                      style={styles.hamburger}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowMenuModal(true);
                        setMenuTab('prompt');
                      }}
                      accessibilityLabel="Apri menu"
                    >
                      <View style={styles.hamLine} />
                      <View style={[styles.hamLine, { marginVertical: 5 }]} />
                      <View style={styles.hamLine} />
                    </TouchableOpacity>
                    {showUpdatedDot ? <View style={styles.updatedDot} /> : null}
                  </View>
                </View>
                <View style={styles.profileSection}>
                  <View style={styles.profileRow}>
                    <TouchableOpacity
                      style={styles.avatarContainer}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert(t('ui.permissionTitle'), t('ui.permissionGalleryChangePhoto'));
                          return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: true,
                          aspect: [1, 1],
                          quality: 0.8,
                        });
                        if (!result.canceled && result.assets?.[0]?.uri) {
                          setProfileImageUri(result.assets[0].uri);
                          setAvatarError(false);
                          AsyncStorage.setItem(STORAGE_KEYS.PROFILE_IMAGE_URI, result.assets[0].uri);
                        }
                      }}
                      accessibilityLabel="Cambia foto profilo"
                    >
                      <View style={styles.avatarFrame}>
                        <Image
                          source={
                            profileImageUri && !avatarError
                              ? { uri: profileImageUri }
                              : { uri: avatarInitialsUrl(formatDisplayName(userData?.nomeUtente)) }
                          }
                          style={styles.avatarImage}
                          onError={() => setAvatarError(true)}
                          accessibilityLabel={`Avatar di ${formatDisplayName(userData?.nomeUtente) || 'User'}`}
                        />
                      </View>
                      <View style={styles.statusDot} />
                    </TouchableOpacity>
                    <View style={styles.userInfoText}>
                      <Text style={styles.userName}>{formatDisplayName(userData?.nomeUtente) || 'User'}</Text>
                      <Text style={styles.welcomeText} numberOfLines={2} ellipsizeMode="tail">{headerPhrase}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {viewAttiva === 'chat' ? (
                <View style={styles.chatAreaWebWrap}>
                  <View style={[styles.chatContainer, { backgroundColor: 'transparent' }]} collapsable={false}>
                    <View style={styles.bollaKeyboardWrap}>
                      <View style={styles.mainCard}>
                        <ScrollView
                          ref={scrollViewRef}
                          style={styles.chatList}
                          contentContainerStyle={styles.chatListContent}
                          keyboardShouldPersistTaps="handled"
                          keyboardDismissMode="interactive"
                        >
                  {showQuickStart ? (
                    <View style={styles.quickStartCard}>
                      <Text style={styles.quickStartTitle}>{quickStartLabels.title}</Text>
                      <Text style={styles.quickStartSubtitle}>{quickStartLabels.subtitle}</Text>
                      <View style={styles.quickStartGrid}>
                        <TouchableOpacity style={styles.quickStartBtn} onPress={() => activateQuickStart('study', { replaceText: true })} activeOpacity={0.85}>
                          <FontAwesome name="graduation-cap" size={16} color="#c5a059" />
                          <Text style={styles.quickStartBtnText}>{quickStartLabels.study}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickStartBtn} onPress={() => activateQuickStart('work', { replaceText: true })} activeOpacity={0.85}>
                          <FontAwesome name="briefcase" size={16} color="#c5a059" />
                          <Text style={styles.quickStartBtnText}>{quickStartLabels.work}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickStartBtn} onPress={() => activateQuickStart('wellbeing', { replaceText: true })} activeOpacity={0.85}>
                          <FontAwesome name="heart" size={16} color="#c5a059" />
                          <Text style={styles.quickStartBtnText}>{quickStartLabels.wellbeing}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickStartBtn} onPress={() => activateQuickStart('briefing', { replaceText: true })} activeOpacity={0.85}>
                          <FontAwesome name="bolt" size={16} color="#c5a059" />
                          <Text style={styles.quickStartBtnText}>{quickStartLabels.briefing}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                        {messagesToShow.map((m) => {
                          const isUser = m.tipo === 'user';
                          const senderLabel = isUser ? t('chat.youLabel') : effectiveAiName;
                          const timeStr = m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString(getLocaleForLanguage(language), { hour: '2-digit', minute: '2-digit' })
                            : '';
                          const msgText = m.testo || '';
                          const isWelcomeStyle = m.tipo === 'bot' && (m.id === '1' || m.id === 'session_welcome');
                          return (
                            <Pressable
                              key={m.id}
                              style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperBot]}
                              onLongPress={() => openMessageMenu(msgText, !isUser)}
                              delayLongPress={400}
                            >
                              <View style={styles.msgMetaRow}>
                                <Text style={[styles.msgMetaText, { color: isUser ? '#b0b0c0' : 'rgba(197,160,89,0.9)' }]}>
                                  {senderLabel}{timeStr ? ` • ${timeStr}` : ''}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.msgBubble,
                                  isUser ? styles.msgBubbleUser : styles.msgBubbleBot,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.msgText,
                                    { textAlign: isUser ? 'right' : 'left' },
                                    isWelcomeStyle ? { fontStyle: 'italic', color: '#c5a059' } : {},
                                  ]}
                                >
                                  {m.testo}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                    <View style={styles.footerPanelSafeArea} collapsable={false}>
                      {stickyBadge ? (
                        <View style={styles.stickyBadgeChipWrap}>
                          <Text style={styles.stickyBadgeChipLabel} numberOfLines={1}>{t('chat.modeLabel')} {stickyBadge.label}</Text>
                          <TouchableOpacity
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStickyBadge(null); }}
                            style={styles.stickyBadgeChipExit}
                            accessibilityLabel={t('chat.exitMode')}
                          >
                            <Text style={styles.stickyBadgeChipExitText}>{t('chat.exitModeText')}</Text>
                            <FontAwesome name="times" size={12} color="rgba(197,160,89,0.9)" style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {isRecording ? (
                        <View style={styles.recordingBarWrap}>
                          <View style={styles.recordingBarDot} />
                          <Text style={styles.recordingBarText}>
                            {t('chat.recordingLabel')} {recordingDuration > 0 ? `${Math.floor(recordingDuration / 60)}:${String(recordingDuration % 60).padStart(2, '0')}` : '0:00'}
                          </Text>
                          <Text style={styles.recordingBarHint}>{t('chat.recordingHint')}</Text>
                        </View>
                      ) : null}
                      {freeLimitReached ? (
                        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(197,160,89,0.15)', borderTopWidth: 1, borderTopColor: 'rgba(197,160,89,0.3)' }}>
                          <Text style={{ color: '#c5a059', fontSize: 13 }}>{SHOW_UPGRADE ? t('billing.limitReachedMessage') : t('billing.limitReachedShareMessage')}</Text>
                          <TouchableOpacity
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); SHOW_UPGRADE ? openMenuToSubscription() : shareOxyForDiscount(); }}
                            style={{ marginTop: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#c5a059', borderRadius: 8, alignSelf: 'flex-start' }}
                          >
                            <Text style={{ color: '#0a0a0a', fontWeight: '600', fontSize: 14 }}>{SHOW_UPGRADE ? t('billing.upgradeNow') : t('shareOxy.button')}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      <View style={styles.superBar} collapsable={false}>
                        <TouchableOpacity
                          style={[styles.superBarCamera, styles.superBarPlus]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setComposerActionsOpen(true);
                          }}
                          accessibilityLabel={t('chat.actionsLabel')}
                        >
                          <FontAwesome name="plus" size={22} color="#c5a059" />
                        </TouchableOpacity>
                        <TextInput
                          ref={chatInputRef}
                          style={styles.superBarInput}
                          placeholder={t('chat.inputPlaceholder')}
                          placeholderTextColor="rgba(255,255,255,0.38)"
                          value={inputMessage}
                          onChangeText={setInputMessage}
                          maxLength={MAX_MESSAGE_LENGTH}
                          multiline
                          selectionColor="#c5a059"
                          onFocus={() => {
                            // Evita sovrapposizione tastiera/barra: scroll subito e dopo apertura tastiera (Android)
                            scrollViewRef.current?.scrollToEnd?.({ animated: true });
                            setTimeout(() => scrollViewRef.current?.scrollToEnd?.({ animated: true }), 150);
                            if (Platform.OS === 'android') setTimeout(() => scrollViewRef.current?.scrollToEnd?.({ animated: true }), 400);
                          }}
                          onSubmitEditing={() => {
                            if (inputMessage.trim() && !isSendBlocked) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              sendMessage();
                            }
                          }}
                          onKeyPress={(e) => {
                            const { key, shiftKey } = e?.nativeEvent || {};
                            if (key === 'Enter' && !shiftKey && inputMessage.trim() && !isSendBlocked) {
                              e.preventDefault?.();
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              sendMessage();
                            }
                          }}
                        />
                        {staCaricando ? (
                          <TouchableOpacity
                            style={[styles.superBarSend, styles.superBarStop]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              userRequestedStopRef.current = true;
                              chatAbortControllerRef.current?.abort();
                            }}
                            accessibilityLabel={t('chat.stopResponseLabel')}
                          >
                            <FontAwesome name="stop" size={18} color="#0a0a0a" />
                            <Text style={styles.superBarStopText}>{t('chat.stopButton')}</Text>
                          </TouchableOpacity>
                        ) : sendInCooldown ? (
                          <View style={[styles.superBarSend, { opacity: 0.6, justifyContent: 'center', alignItems: 'center', minWidth: 44 }]}>
                            <ActivityIndicator size="small" color="#0a0a0a" />
                          </View>
                        ) : inputMessage.trim() ? (
                          <TouchableOpacity
                            style={styles.superBarSend}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              sendMessage();
                            }}
                            disabled={isSendBlocked}
                            accessibilityLabel={t('chat.sendLabel')}
                          >
                            <FontAwesome name="send" size={18} color="#0a0a0a" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.superBarMic, isRecording && styles.micButtonActive]}
                            onPressIn={handleMicPressInOnly}
                            onPressOut={handleMicPressOutOnly}
                            activeOpacity={1}
                            accessibilityLabel={t('chat.holdToTalkLabel')}
                          >
                            <LinearGradient
                              colors={isRecording ? ['#b03030', '#8b2020'] : ['#c5a059', '#a08040']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.micGradient}
                            >
                              <FontAwesome name="microphone" size={18} color="#fff" />
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
                </View>
              ) : (
                <View style={[styles.mainCard, { padding: 0 }]}>
                  <TouchableOpacity
                    style={styles.cloudBackBar}
                    onPress={() => { setViewAttiva('chat'); setSorgenteSelezionata(null); }}
                    accessibilityLabel="Torna alla chat"
                    accessibilityRole="button"
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  >
                    <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                  </TouchableOpacity>
                  <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    <View style={styles.cloudHeader}>
                      <Text style={styles.cloudTitle}>{t('cloud.title')}</Text>
                      <Text style={[styles.cloudSubtitle, { color: '#c5a059', marginTop: 4 }]}>{t('cloud.comingSoon')}</Text>
                      <Text style={styles.cloudSubtitle}>
                        {t('cloud.subtitleComingSoon')}
                      </Text>
                    </View>
                  </ScrollView>
                </View>
              )}
            </>
          ) : null}

      {/* Header: logo OXY Real (pulsante) + Real Identity (statico), spazio al centro, hamburger a DESTRA — solo non-web */}
      {Platform.OS !== 'web' && (
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.headerLeft}>
            <OxyLogo />
          </View>
          <View style={styles.headerSpacer} />
          <View style={styles.hamburgerWrap}>
            <TouchableOpacity
              style={styles.hamburger}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMenuModal(true);
                setMenuTab('prompt');
              }}
              accessibilityLabel="Apri menu"
            >
              <View style={styles.hamLine} />
              <View style={[styles.hamLine, { marginVertical: 5 }]} />
              <View style={styles.hamLine} />
            </TouchableOpacity>
            {showUpdatedDot ? <View style={styles.updatedDot} /> : null}
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert(t('ui.permissionTitle'), t('ui.permissionGalleryChangePhoto'));
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets?.[0]?.uri) {
                  setProfileImageUri(result.assets[0].uri);
                  setAvatarError(false);
                  AsyncStorage.setItem(STORAGE_KEYS.PROFILE_IMAGE_URI, result.assets[0].uri);
                }
              }}
              accessibilityLabel="Cambia foto profilo"
            >
              <View style={styles.avatarFrame}>
                <Image
                  source={
                    profileImageUri && !avatarError
                      ? { uri: profileImageUri }
                      : { uri: avatarInitialsUrl(formatDisplayName(userData?.nomeUtente)) }
                  }
                  style={styles.avatarImage}
                  onError={() => setAvatarError(true)}
                  accessibilityLabel={`Avatar di ${formatDisplayName(userData?.nomeUtente) || 'User'}`}
                />
              </View>
              <View style={styles.statusDot} />
            </TouchableOpacity>
            <View style={styles.userInfoText}>
              <Text style={styles.userName}>{formatDisplayName(userData?.nomeUtente) || 'User'}</Text>
              <Text style={styles.welcomeText} numberOfLines={2} ellipsizeMode="tail">{headerPhrase}</Text>
            </View>
          </View>
        </View>
      </View>
      )}
      {/* CountryPicker solo nel modal di registrazione, non nella Dashboard */}
      {showRegister && (
        <CountryPicker
          visible={countryPickerVisible}
          withFilter={false}
          withFlag
          withCallingCode
          withCountryNameButton
          onClose={() => setCountryPickerVisible(false)}
          onSelect={(country) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const callingCode = Array.isArray(country.callingCode)
              ? country.callingCode[0]
              : country.callingCode;
            setPhoneCountry({
              cca2: country.cca2,
              callingCode: callingCode || '39',
              flag: country.flag || '🌐',
            });
            setCountryPickerVisible(false);
          }}
          countryCode={phoneCountry.cca2}
          theme={countryPickerTheme}
        />
      )}

      {/* Menu unico a destra: Modal a tutto schermo con doppia linguetta (Prompt | Impostazioni) */}
      <Modal
        visible={showMenuModal}
        animationType="none"
        transparent
        onRequestClose={() => { setShowMenuModal(false); setMenuSubView(null); setAzioniSubView(null); }}
      >
        <View style={styles.menuModalOverlay}>
          <SafeAreaView style={styles.menuModalSafe}>
            <View style={styles.menuModalHeader}>
              <Text style={styles.menuModalTitle}>Menu</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowMenuModal(false);
                  setMenuSubView(null);
                  setAzioniSubView(null);
                }}
                style={styles.powerBadgesCloseBtn}
              >
                <FontAwesome name="times" size={24} color="#c5a059" />
              </TouchableOpacity>
            </View>
            {/* Barra linguette */}
            <View style={styles.menuTabsRow}>
              <TouchableOpacity
                style={[styles.menuTab, menuTab === 'prompt' && styles.menuTabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMenuTab('prompt');
                }}
              >
                <Text style={[styles.menuTabText, menuTab === 'prompt' && styles.menuTabTextActive]}>Azioni</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuTab, menuTab === 'impostazioni' && styles.menuTabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMenuTab('impostazioni');
                  setMenuSubView(null);
                  setAzioniSubView(null);
                }}
              >
                <Text style={[styles.menuTabText, menuTab === 'impostazioni' && styles.menuTabTextActive]}>{t('settings.tabLabel')}</Text>
              </TouchableOpacity>
            </View>
            {/* Contenuto tab */}
            {menuTab === 'prompt' ? (
              <ScrollView
                ref={menuActionsScrollRef}
                key={`menuPrompt-${menuPromptMountKey}`}
                style={styles.menuTabScroll}
                contentContainerStyle={styles.menuActionsPanel}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                collapsable={false}
                renderToHardwareTextureAndroid
                showsVerticalScrollIndicator={true}
              >
                {azioniSubView === null ? (
                  <>
                    <Text style={[styles.settingsSectionTitle, { marginTop: 4, marginBottom: 10 }]}>{t('chat.actionsTitle')}</Text>
                    <View style={styles.menuActionsGridCompact}>
                      <TouchableOpacity style={styles.actionTileCompact} activeOpacity={0.85} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAzioniSubView('avvio'); }}>
                        <View style={styles.actionTileIconWrapCompact}><FontAwesome name="bolt" size={14} color="#c5a059" /></View>
                        <Text style={styles.actionTileLabelCompact}>{t('settings.actionsAvvioRapido')}</Text>
                        <Text style={styles.actionTileHintCompact} numberOfLines={1}>{t('settings.quickStartStudyHint')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionTileCompact} activeOpacity={0.85} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAzioniSubView('strumenti'); }}>
                        <View style={styles.actionTileIconWrapCompact}><FontAwesome name="wrench" size={14} color="#c5a059" /></View>
                        <Text style={styles.actionTileLabelCompact}>{t('settings.actionsStrumenti')}</Text>
                        <Text style={styles.actionTileHintCompact} numberOfLines={1}>Memory Vault, Diario, Storie</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionTileCompact} activeOpacity={0.85} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAzioniSubView('modalita'); }}>
                        <View style={styles.actionTileIconWrapCompact}><FontAwesome name="th-large" size={14} color="#c5a059" /></View>
                        <Text style={styles.actionTileLabelCompact}>{t('settings.actionsModalita')}</Text>
                        <Text style={styles.actionTileHintCompact} numberOfLines={1}>{t('powerBadges.all')}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAzioniSubView(null); }} style={styles.menuBackBar} accessibilityLabel={t('common.back')} accessibilityRole="button" hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                      <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                    </TouchableOpacity>
                    {azioniSubView === 'avvio' ? (
                      <>
                        <Text style={[styles.settingsSectionTitle, { marginTop: 4, marginBottom: 6 }]}>{t('settings.actionsAvvioRapido')}</Text>
                        <View style={styles.menuActionsGridCompact}>
                  <TouchableOpacity
                    style={styles.actionTileCompact}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      activateQuickStart('study', { replaceText: true });
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="graduation-cap" size={14} color="#c5a059" />
                    </View>
                    <Text style={styles.actionTileLabelCompact}>{quickStartLabels.study}</Text>
                    <Text style={styles.actionTileHintCompact} numberOfLines={1}>{t('settings.quickStartStudyHint')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionTileCompact}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      activateQuickStart('work', { replaceText: true });
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="briefcase" size={14} color="#c5a059" />
                    </View>
                    <Text style={styles.actionTileLabelCompact}>{quickStartLabels.work}</Text>
                    <Text style={styles.actionTileHintCompact} numberOfLines={1}>Email, checklist</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionTileCompact}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      activateQuickStart('wellbeing', { replaceText: true });
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="heart" size={14} color="#c5a059" />
                    </View>
                    <Text style={styles.actionTileLabelCompact}>{quickStartLabels.wellbeing}</Text>
                    <Text style={styles.actionTileHintCompact} numberOfLines={1}>Routine, abitudini</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionTileCompact}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      activateQuickStart('briefing', { replaceText: true });
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="bolt" size={14} color="#c5a059" />
                    </View>
                    <Text style={styles.actionTileLabelCompact}>{quickStartLabels.briefing}</Text>
                    <Text style={styles.actionTileHintCompact} numberOfLines={1}>Priorità e 3 azioni</Text>
                  </TouchableOpacity>
                        </View>
                      </>
                    ) : null}
                    {azioniSubView === 'strumenti' ? (
                      <>
                        <Text style={[styles.settingsSectionTitle, { marginTop: 4, marginBottom: 6 }]}>{t('settings.actionsStrumenti')}</Text>
                        <View style={styles.menuActionsGridCompact}>
                  <TouchableOpacity
                    style={styles.actionTileCompact}
                    activeOpacity={0.85}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      setShowMemoryVaultModal(true);
                      setMemoryVaultData(null);
                      await refetchMemoryVault(false);
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="book" size={14} color="#c5a059" />
                    </View>
                    <Text style={styles.actionTileLabelCompact}>Memory Vault</Text>
                    <Text style={styles.actionTileHintCompact} numberOfLines={1}>Obiettivi e promemoria</Text>
                  </TouchableOpacity>

                  {effectiveFlags.diary ? (
                    <TouchableOpacity
                      style={styles.actionTileCompact}
                      activeOpacity={0.85}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowMenuModal(false);
                        setShowDiaryModal(true);
                        setDiaryData({ themes: [], entries: [], progressSummary: '' });
                        await refetchDiary(false);
                        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                        if (idToken) track(EVENTS.FEATURE_OPEN, { feature: 'diary' }, idToken);
                      }}
                    >
                      <View style={styles.actionTileIconWrapCompact}>
                        <FontAwesome name="bookmark-o" size={14} color="#c5a059" />
                      </View>
                      <Text style={styles.actionTileLabelCompact}>Diario</Text>
                      <Text style={styles.actionTileHintCompact} numberOfLines={1}>Scrivi e rileggi</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.actionTileCompact, !effectiveFlags.stories && { opacity: 0.6 }]}
                    activeOpacity={0.85}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (effectiveFlags.stories) {
                        setShowMenuModal(false);
                        setShowStoriesModal(true);
                        await refetchStoryState();
                        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                        if (idToken) track(EVENTS.FEATURE_OPEN, { feature: 'stories' }, idToken);
                      } else {
                        onLockedFeatureTap();
                      }
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="align-left" size={14} color="#c5a059" />
                      {!effectiveFlags.stories ? <FontAwesome name="lock" size={10} color="#c5a059" style={{ position: 'absolute', right: 2, bottom: 2 }} /> : null}
                    </View>
                    <Text style={styles.actionTileLabelCompact}>Storie</Text>
                    <Text style={styles.actionTileHintCompact} numberOfLines={1}>Percorsi guidati</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionTileCompact, !effectiveFlags.community && { opacity: 0.6 }]}
                    activeOpacity={0.85}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (effectiveFlags.community) {
                        setShowMenuModal(false);
                        setShowCommunityModal(true);
                        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                        if (idToken) track(EVENTS.FEATURE_OPEN, { feature: 'community' }, idToken);
                      } else {
                        onLockedFeatureTap();
                      }
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="users" size={14} color="#c5a059" />
                      {!effectiveFlags.community ? <FontAwesome name="lock" size={10} color="#c5a059" style={{ position: 'absolute', right: 2, bottom: 2 }} /> : null}
                    </View>
                    <Text style={styles.actionTileLabelCompact}>Community</Text>
                    <Text style={styles.actionTileHintCompact} numberOfLines={1}>Condividi e impara</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionTileCompact}
                    activeOpacity={0.85}
                    onPress={() => {
                      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (_) {}
                      setShowMenuModal(false);
                      setShowOxyTvComingSoonModal(true);
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="tv" size={14} color="#c5a059" />
                    </View>
                    <Text style={styles.actionTileLabelCompact}>OXY TV</Text>
                    <Text style={styles.actionTileHintCompact} numberOfLines={1}>Coming soon</Text>
                  </TouchableOpacity>
                        </View>
                      </>
                    ) : null}
                    {azioniSubView === 'modalita' ? (
                      <>
                        <Text style={[styles.settingsSectionTitle, { marginTop: 6, marginBottom: 6 }]}>{t('settings.actionsModalita')}</Text>
                        <View style={styles.menuActionsGridCompact}>
                  {POWER_BADGES.slice(0, 7).map((badge) => (
                    <TouchableOpacity
                      key={badge.id}
                      style={[styles.actionTileCompact, stickyBadge?.id === badge.id && styles.modeChipActive]}
                      activeOpacity={0.85}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowMenuModal(false);
                        setStickyBadge(badge);
                      }}
                    >
                      <View style={styles.actionTileIconWrapCompact}>
                        <FontAwesome name={badge.icon} size={14} color="#c5a059" />
                      </View>
                      <Text style={styles.actionTileLabelCompact} numberOfLines={1}>{t(`powerBadges.labels.${badge.id}`)}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.actionTileCompact, styles.modeChipAll]}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowMenuModal(false);
                      setShowModesModal(true);
                    }}
                  >
                    <View style={styles.actionTileIconWrapCompact}>
                      <FontAwesome name="th-large" size={14} color="#c5a059" />
                    </View>
                    <Text style={styles.actionTileLabelCompact} numberOfLines={1}>{t('powerBadges.all')}</Text>
                  </TouchableOpacity>
                        </View>
                      </>
                    ) : null}
                  </>
                )}
              </ScrollView>
            ) : menuSubView === 'profilo' ? (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView(null); }}
                  style={styles.menuBackBar}
                  accessibilityLabel={t('common.back')}
                  accessibilityRole="button"
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                </TouchableOpacity>
                <Text style={[styles.menuModalTitle, styles.menuSubTitle]}>{t('settings.sectionProfileTitle')}</Text>
                <ScrollView style={styles.menuTabScroll} contentContainerStyle={styles.menuSettingsContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>{t('settings.aiNameTitle')}</Text>
                    {HAS_CUSTOM_AI_NAME_FEATURE ? (
                      <View style={styles.settingsRow}>
                        <TextInput
                          style={styles.settingsInputInline}
                          placeholder={DEFAULT_AI_NAME}
                          placeholderTextColor="#888"
                          value={customAiName}
                          onChangeText={setCustomAiName}
                          onBlur={() => {
                            const name = (customAiName || '').trim() || DEFAULT_AI_NAME;
                            setCustomAiName(name);
                            AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_AI_NAME, name);
                          }}
                        />
                      </View>
                    ) : (
                      <View style={styles.settingsRow}>
                        <TextInput
                          style={[styles.settingsInputInline, { color: '#888' }]}
                          value={DEFAULT_AI_NAME}
                          editable={false}
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>Voce</Text>
                    {isFreePlan ? (
                      <>
                        <View style={[styles.settingsRow, { marginBottom: 8 }]}>
                          <FontAwesome name="volume-up" size={20} color="#c5a059" />
                          <Text style={[styles.settingsRowText, { marginLeft: 10, flex: 1 }]}>
                            {(VOICE_OPTIONS.find((v) => v.id === DEFAULT_VOICE_ID) || VOICE_OPTIONS[0])?.label || DEFAULT_VOICE_ID} — {t('settings.voiceFreeDefault')}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onLockedFeatureTap(); }}
                          style={{ marginTop: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(197,160,89,0.2)', borderRadius: 8, alignSelf: 'flex-start' }}
                        >
                          <Text style={{ color: '#c5a059', fontSize: 13 }}>{SHOW_UPGRADE ? t('settings.voiceChoiceUpgrade') : t('shareOxy.button')}</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                    {VOICE_OPTIONS.map((opt) => (
                      <View key={opt.id} style={[styles.settingsRow, { flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-start' }]}>
                        <TouchableOpacity
                          style={{ flex: 1, minWidth: '100%' }}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setVoiceId(opt.id);
                            AsyncStorage.setItem(STORAGE_KEYS.VOICE_ID, opt.id);
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.voiceOptionCard, voiceId === opt.id && styles.voiceOptionCardActive]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                              <Text style={styles.voiceOptionLabel}>{opt.label}</Text>
                              <TouchableOpacity
                                style={[styles.voiceProvaBtn, playingVoiceId === opt.id && styles.voiceProvaBtnDisabled]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  if (playingVoiceId) return;
                                  playVoiceSample(opt);
                                }}
                                disabled={!!playingVoiceId}
                              >
                                {playingVoiceId === opt.id ? (
                                  <ActivityIndicator size="small" color="#0a0a0a" />
                                ) : (
                                  <Text style={styles.voiceProvaBtnText}>Prova</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.voiceOptionDesc}>{opt.description}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                      </>
                    )}
                    <View style={[styles.settingsRow, { marginTop: 16, justifyContent: 'space-between', alignItems: 'center' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.settingsRowText}>Risposta a voce (mani libere)</Text>
                        <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>Quando attiva: tocca il microfono, parla, rilascia → {effectiveAiName} risponde a voce</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.voiceReplyToggleBtn, voiceReplyMode && styles.voiceReplyToggleBtnActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setVoiceReplyMode((v) => {
                            const next = !v;
                            AsyncStorage.setItem(STORAGE_KEYS.VOICE_REPLY_MODE, next ? 'true' : 'false').catch(() => {});
                            return next;
                          });
                        }}
                      >
                        <FontAwesome name={voiceReplyMode ? 'toggle-on' : 'toggle-off'} size={36} color={voiceReplyMode ? '#c5a059' : '#666'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.menuSectionBlock}>
                    <TouchableOpacity
                      style={styles.settingsRowBtn}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert(t('ui.permissionTitle'), t('ui.permissionGalleryChangeProfilePhoto'));
                          return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: true,
                          aspect: [1, 1],
                          quality: 0.8,
                        });
                        if (!result.canceled && result.assets?.[0]?.uri) {
                          setProfileImageUri(result.assets[0].uri);
                          setAvatarError(false);
                          AsyncStorage.setItem(STORAGE_KEYS.PROFILE_IMAGE_URI, result.assets[0].uri);
                        }
                      }}
                    >
                      <FontAwesome name="user-circle" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>Cambia foto profilo</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            ) : menuSubView === 'sicurezza' ? (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView(null); setShowPasswordSection(false); setShow2FAForUpdate(false); }}
                  style={styles.menuBackBar}
                  accessibilityLabel={t('common.back')}
                  accessibilityRole="button"
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                </TouchableOpacity>
                <Text style={[styles.menuModalTitle, styles.menuSubTitle]}>{t('settings.sectionAccountSecurity')}</Text>
                <ScrollView style={styles.menuTabScroll} contentContainerStyle={styles.menuSettingsContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>{t('settings.changePassword')}</Text>
                    <TouchableOpacity
                      style={styles.settingsRowBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowPasswordSection(true);
                        setShow2FAForUpdate(false);
                        setChannelSelected(null);
                        setOldPasswordInput('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                        setOtpInput('');
                      }}
                      accessibilityLabel={t('settings.changePassword')}
                    >
                      <FontAwesome name="lock" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>{t('settings.changePassword')}</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                    {showPasswordSection && !show2FAForUpdate ? (
                      <>
                        <TextInput
                          style={styles.settingsInput}
                          placeholder={t('settings.currentPassword')}
                          placeholderTextColor="#d1d1d1"
                          secureTextEntry
                          value={oldPasswordInput}
                          onChangeText={setOldPasswordInput}
                        />
                        <TextInput
                          style={styles.settingsInput}
                          placeholder={t('settings.newPassword')}
                          placeholderTextColor="#d1d1d1"
                          secureTextEntry
                          value={newPassword}
                          onChangeText={setNewPassword}
                        />
                        <TextInput
                          style={styles.settingsInput}
                          placeholder={t('settings.confirmNewPassword')}
                          placeholderTextColor="#d1d1d1"
                          secureTextEntry
                          value={confirmNewPassword}
                          onChangeText={setConfirmNewPassword}
                        />
                        <TouchableOpacity
                          style={styles.saveBtn}
                          onPress={() => {
                            if (!oldPasswordInput || !newPassword || !confirmNewPassword) {
                              Alert.alert(t('register.error.title'), t('settings.error.fillAll'));
                              return;
                            }
                            if (newPassword !== confirmNewPassword) {
                              Alert.alert(t('register.error.title'), t('settings.error.passwordMismatch'));
                              return;
                            }
                            setShow2FAForUpdate(true);
                            setChannelSelected(null);
                          }}
                        >
                          <Text style={styles.saveBtnText}>{t('settings.startUpdate')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowPasswordSection(false)} style={{ marginTop: 12 }}>
                          <Text style={styles.closeModal}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                      </>
                    ) : showPasswordSection && show2FAForUpdate ? (
                      <View style={styles.twoFAPanel}>
                        {!channelSelected ? (
                          <TouchableOpacity
                            style={styles.socialBigBtn}
                            onPress={() => handleSelectChannel('email')}
                          >
                            <Text style={styles.socialBigText}>{t('settings.2fa.email')}</Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <Text style={styles.twoFAText}>
                              {t('settings.otpSentTo', { target: maskEmail(userData.emailPrincipale || userData.emailSecondaria) })}
                            </Text>
                            <TextInput
                              style={styles.settingsInput}
                              placeholder={t('settings.otpPlaceholder')}
                              placeholderTextColor="#d1d1d1"
                              keyboardType="number-pad"
                              value={otpInput}
                              onChangeText={setOtpInput}
                            />
                            <TouchableOpacity
                              style={styles.saveBtn}
                              onPress={() => {
                                if (otpInput.length >= 4) {
                                  setFeedbackMsg(t('settings.successPasswordUpdated'));
                                  setTimeout(() => {
                                    setFeedbackMsg('');
                                    setShowMenuModal(false);
                                    setShow2FAForUpdate(false);
                                    setShowPasswordSection(false);
                                    setOldPasswordInput('');
                                    setNewPassword('');
                                    setConfirmNewPassword('');
                                    setOtpInput('');
                                  }, 2500);
                                } else {
                                  Alert.alert(t('register.error.title'), t('settings.otpInvalid'));
                                }
                              }}
                            >
                              <Text style={styles.saveBtnText}>{t('settings.confirmPasswordChange')}</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.menuSectionBlock}>
                    <TouchableOpacity
                      style={styles.settingsRowBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert(t('ui.supportTitle'), t('ui.supportBody'));
                      }}
                      accessibilityLabel="Supporto"
                    >
                      <FontAwesome name="life-buoy" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>Supporto</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.settingsRowBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowMenuModal(false);
                        setShowLanguageModal(true);
                      }}
                      accessibilityLabel={t('settings.language')}
                    >
                      <FontAwesome name="globe" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>{t('settings.language')}</Text>
                      <Text style={[styles.settingsRowText, { color: '#888', fontSize: 13 }]}>{LANGUAGE_LABELS[language] || language}</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>{t('settings.infoApp')}</Text>
                    <View style={[styles.settingsRow, { justifyContent: 'space-between' }]}>
                      <Text style={[styles.settingsRowText, { marginLeft: 0 }]}>Versione</Text>
                      <Text style={[styles.settingsRowText, { color: '#888', fontSize: 13 }]}>
                        {buildLabel || '—'}
                      </Text>
                    </View>
                    <View style={[styles.settingsRow, { justifyContent: 'space-between' }]}>
                      <Text style={[styles.settingsRowText, { marginLeft: 0 }]}>Package</Text>
                      <Text style={[styles.settingsRowText, { color: '#888', fontSize: 12 }]}>
                        {Application?.applicationId || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.menuSectionBlock}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert(
                          t('settings.deleteAccountConfirmTitle'),
                          t('settings.deleteAccountConfirmBody'),
                          [
                            { text: t('common.cancel') },
                            { text: t('settings.deleteAccount'), style: 'destructive', onPress: handleDeleteAccount },
                          ]
                        );
                      }}
                      style={[styles.modalLogoutBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(220, 80, 80, 0.8)', marginBottom: 12 }]}
                    >
                      <Text style={[styles.modalLogoutText, { color: 'rgba(220, 80, 80, 0.95)' }]}>{t('settings.deleteAccount')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(t('settings.logout.confirmTitle'), t('settings.logout.confirmBody'), [
                          { text: t('common.cancel') },
                          { text: t('settings.logout.button'), style: 'destructive', onPress: handleLogout },
                        ])
                      }
                      style={styles.modalLogoutBtn}
                    >
                      <Text style={styles.modalLogoutText}>{t('settings.logout.button')}</Text>
                    </TouchableOpacity>
                  </View>
                  {feedbackMsg ? <Text style={styles.successText}>{feedbackMsg}</Text> : null}
                </ScrollView>
              </View>
            ) : menuSubView === 'oxykey' ? (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView(null); }}
                  style={styles.menuBackBar}
                  accessibilityLabel={t('common.back')}
                  accessibilityRole="button"
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                </TouchableOpacity>
                <Text style={[styles.menuModalTitle, styles.menuSubTitle]}>{t('oxykey.title')}</Text>
                <ScrollView style={styles.menuTabScroll} contentContainerStyle={[styles.menuSettingsContent, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
                  {billingStatus.active && billingStatus.mode === 'subscription' ? (
                    <View style={styles.menuSectionBlock}>
                      <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#d1d1d1', marginBottom: 16 }]}>{t('oxykey.includedInPlan')}</Text>
                      <TouchableOpacity
                        style={[styles.ctaBtn, { alignSelf: 'flex-start' }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuTab('impostazioni'); setMenuSubView('abbonamento'); setBillingPlanView('subscription'); }}
                      >
                        <Text style={styles.ctaBtnText}>{t('oxykey.goToSubscription')}</Text>
                        <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                      </TouchableOpacity>
                    </View>
                  ) : billingStatus.active && billingStatus.mode === 'payment' ? (
                    <View style={styles.menuSectionBlock}>
                      <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#d1d1d1', marginBottom: 8 }]}>{t('oxykey.lifetimeIntro')}</Text>
                      <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginBottom: 12 }]}>{t('oxykey.lifetimeHint')}</Text>
                      <TextInput
                        style={[styles.settingsInputInline, { marginBottom: 8, minHeight: 48 }]}
                        placeholder="sk-..."
                        placeholderTextColor="#888"
                        value={oxyKeyInput}
                        onChangeText={(txt) => { setOxyKeyInput(txt); setOxyKeyError(''); }}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                      {oxyKeyError ? <Text style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 8 }}>{oxyKeyError}</Text> : null}
                      <TouchableOpacity style={[styles.ctaBtn, { alignSelf: 'flex-start' }]} onPress={handleSaveOxyKey}>
                        <Text style={styles.ctaBtnText}>{t('oxykey.saveKey')}</Text>
                        <FontAwesome name="check" size={14} color="#c5a059" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.menuSectionBlock}>
                      <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#d1d1d1', marginBottom: 16 }]}>{t('oxykey.noPlan')}</Text>
                      <TouchableOpacity
                        style={[styles.ctaBtn, { alignSelf: 'flex-start' }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuTab('impostazioni'); setMenuSubView('abbonamento'); }}
                      >
                        <Text style={styles.ctaBtnText}>{t('oxykey.goToSubscription')}</Text>
                        <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={[styles.menuSectionBlock, { marginTop: 24 }]}>
                    <Text style={[styles.settingsSectionTitle, { marginBottom: 8 }]}>{t('oxykey.packIntro')}</Text>
                    {TOKEN_PACKS.map((pack) => {
                      const name = t(pack.nameKey) || `${(pack.tokens / 1000).toFixed(0)}k token`;
                      return (
                        <TouchableOpacity
                          key={pack.id}
                          style={[styles.settingsRow, { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 12 }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            openCheckoutForPlan(pack.id);
                          }}
                        >
                          <Text style={[styles.settingsRowText, { fontWeight: '600' }]}>{name}</Text>
                          <Text style={[styles.settingsRowText, { marginTop: 2, color: '#c5a059' }]}>
                            {pack.suggestedPrice.toFixed(2).replace('.', ',')} {CURRENCY_DEFAULT} · {pack.tokens.toLocaleString('it-IT')} token
                          </Text>
                          <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 4 }]}>
                            {t('oxykey.packCta')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : menuSubView ? (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView(null); }}
                  style={styles.menuBackBar}
                  accessibilityLabel={t('billing.back')}
                  accessibilityRole="button"
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                </TouchableOpacity>
                <Text style={[styles.menuModalTitle, styles.menuSubTitle]}>
                  {menuSubView === 'privacy'
                    ? legal.privacyPolicy.title
                    : menuSubView === 'termini'
                      ? legal.termsOfService.title
                      : menuSubView === 'abbonamento'
                        ? t('billing.title')
                        : legal.subscription.title}
                </Text>
                <ScrollView style={styles.menuTabScroll} contentContainerStyle={[styles.menuSettingsContent, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
                  {menuSubView === 'privacy' ? (
                    <>
                      {language !== 'it' ? (
                        <Text style={[styles.settingsRowText, { fontSize: 12, lineHeight: 18, color: '#c5a059', marginBottom: 12 }]}>
                          {t('legal.onlyItalianNotice')}
                        </Text>
                      ) : null}
                      <Text style={[styles.settingsRowText, { fontSize: 12, lineHeight: 18, color: '#d1d1d1' }]}>
                        {[
                          legal.privacyPolicy.intro,
                          ...(legal.privacyPolicy.sections || []).map((s) => `${s.title}\n${s.content}`),
                          legal.privacyPolicy.footer ? `\n${legal.privacyPolicy.footer}` : ''
                        ].filter(Boolean).join('\n\n')}
                      </Text>
                    </>
                  ) : menuSubView === 'termini' ? (
                    <>
                      {language !== 'it' ? (
                        <Text style={[styles.settingsRowText, { fontSize: 12, lineHeight: 18, color: '#c5a059', marginBottom: 12 }]}>
                          {t('legal.onlyItalianNotice')}
                        </Text>
                      ) : null}
                      <Text style={[styles.settingsRowText, { fontSize: 12, lineHeight: 18, color: '#d1d1d1' }]}>
                        {[
                          ...(legal.termsOfService.sections || []).map((s) => `${s.title}\n${s.content}`),
                          `\nUltimo aggiornamento: ${legal.lastUpdated}`
                        ].filter(Boolean).join('\n\n')}
                      </Text>
                    </>
                  ) : menuSubView === 'abbonamento' ? (
                    <>
                      {billingStatus.active ? (
                        <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#d1d1d1', marginBottom: 12 }]}>
                          {(() => {
                            const activePlan = getPlanForDisplay(billingStatus.planId);
                            if (!activePlan) {
                              return t('billing.introActiveGeneric');
                            }
                            const activePlanName = t(`pricing.plans.${activePlan.id}.name`);
                            if (billingStatus.mode === 'subscription') {
                              return t('billing.introActiveSubscription', { planName: activePlanName });
                            }
                            return t('billing.introActiveLifetime', { planName: activePlanName });
                          })()}
                        </Text>
                      ) : (
                        <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#d1d1d1', marginBottom: 12 }]}>
                          {t('billing.introNoActive')}
                        </Text>
                      )}
                      <View style={{ marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(197,160,89,0.1)', borderRadius: 8 }}>
                        <Text style={{ color: '#c5a059', fontSize: 12 }}>{t('billing.lifetimeTagline')}</Text>
                        <Text style={{ color: 'rgba(197,160,89,0.9)', fontSize: 12, marginTop: 4 }}>{t('billing.launchPriceTagline')}</Text>
                      </View>
                      <View style={{ paddingVertical: 8, marginBottom: 8 }}>
                        <Text style={[styles.settingsSectionTitle, { marginBottom: 4 }]}>{t('billing.statusTitle')}</Text>
                        {billingStatus.loading ? (
                          <Text style={[styles.settingsRowText, { color: '#d1d1d1' }]}>{t('billing.statusChecking')}</Text>
                        ) : billingStatus.active ? (
                          <>
                            <Text style={[styles.settingsRowText, { color: '#c5a059' }]}>
                              {t('billing.statusActiveLabel')}{' '}
                              {(() => {
                                const activePlan = getPlanForDisplay(billingStatus.planId);
                                if (!activePlan) return billingStatus.planId || 'non riconosciuto';
                                const isSub = billingStatus.mode === 'subscription';
                                const typeLabel = isSub ? t('billing.typeSubscription') : t('billing.typeLifetime');
                                const activePlanName = t(`pricing.plans.${activePlan.id}.name`);
                                return `${activePlanName} (${typeLabel})`;
                              })()}
                            </Text>
                            <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 4 }]}>
                              {t('billing.statusActiveHint')}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.settingsRowText, { color: '#d1d1d1' }]}>
                              {t('billing.statusNone')}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                refreshBillingStatus();
                              }}
                              style={[styles.ctaBtnSecondary, { marginTop: 10, alignSelf: 'flex-start' }]}
                            >
                              <Text style={styles.ctaBtnText}>{t('billing.statusRefresh')}</Text>
                              <FontAwesome name="refresh" size={14} color="#c5a059" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                      {/* Sconto lancio 50% — primi 30 gg dal go-live */}
                      {daysLeftLaunchDiscount > 0 && (
                        <View style={{ marginBottom: 16, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(197,160,89,0.2)', borderRadius: 10, borderWidth: 1, borderColor: '#c5a059' }}>
                          <Text style={{ color: '#c5a059', fontSize: 13, fontWeight: '600' }}>{t('billing.launchDiscount50')}</Text>
                          <Text style={{ color: '#e8e8e8', fontSize: 12, marginTop: 4 }}>
                            {daysLeftLaunchDiscount === 1 ? t('billing.launchDiscountLastDay') : t('billing.launchDiscountDaysLeft', { count: daysLeftLaunchDiscount })}
                          </Text>
                        </View>
                      )}
                      {/* Barra utilizzo messaggi oggi — mostrata se abbiamo usage (anche senza piano attivo, così si vede sempre X messaggi/crediti) */}
                      {billingStatus.usage != null && typeof billingStatus.usage.used === 'number' && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={[styles.settingsSectionTitle, { marginBottom: 4 }]}>{t('billing.usageTitle')}</Text>
                          <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginBottom: 6 }]}>
                            {isFreePlan && billingStatus.usage?.limit === 5
                              ? t('billing.usageSubtitleFree')
                              : (billingStatus.usage.limit != null ? t('billing.usageSubtitleSubscription') : t('billing.usageSubtitleLifetime'))}
                          </Text>
                          <Text style={[styles.settingsRowText, { fontSize: 13, color: '#d1d1d1', marginBottom: 6 }]}>
                            {isFreePlan && billingStatus.usage?.limit === 5
                              ? t('billing.usageLabelFree', { used: billingStatus.usage.used, limit: billingStatus.usage.limit })
                              : (billingStatus.usage.limit != null
                                ? t('billing.usageLabel', { used: billingStatus.usage.used, limit: billingStatus.usage.limit })
                                : t('billing.usageLabelNoLimit', { used: billingStatus.usage.used }))}
                          </Text>
                          {billingStatus.usage.tokensUsed != null && billingStatus.usage.tokensUsed >= 0 && (
                            <Text style={[styles.settingsRowText, { fontSize: 13, color: '#c5a059', marginBottom: 6 }]}>
                              {t('billing.usageTokensLabel', { count: billingStatus.usage.tokensUsed })}
                            </Text>
                          )}
                          {billingStatus.usage?.tokenBalance != null && billingStatus.usage.tokenBalance > 0 && (
                            <Text style={[styles.settingsRowText, { fontSize: 13, color: '#5a9e5a', marginBottom: 6 }]}>
                              {t('oxykey.tokenBalance', { count: billingStatus.usage.tokenBalance })}
                            </Text>
                          )}
                          <View
                            style={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              overflow: 'hidden',
                            }}
                          >
                            <View
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: (() => {
                                  const used = billingStatus.usage.used;
                                  const limit = billingStatus.usage.limit;
                                  if (limit != null) return `${Math.min(100, (used / limit) * 100)}%`;
                                  // One-shot: scala fissa 0–100 messaggi = 0–100% così il cliente vede il consumo
                                  const pct = Math.min(100, (used / 100) * 100);
                                  return `${pct}%`;
                                })(),
                                borderRadius: 4,
                                backgroundColor: (() => {
                                  const used = billingStatus.usage.used;
                                  const limit = billingStatus.usage.limit;
                                  const pct = limit != null ? (used / limit) * 100 : Math.min(100, (used / 100) * 100);
                                  if (pct >= 90) return '#c94a4a';
                                  if (pct >= 70) return '#c5a059';
                                  return '#5a9e5a';
                                })(),
                              }}
                            />
                          </View>
                          {/* Avviso 90%: solo per abbonamento con limite — invito a ricaricare/upgrade */}
                          {billingStatus.usage?.limit != null && billingStatus.usage.limit > 0 && (billingStatus.usage.used / billingStatus.usage.limit) >= 0.9 && (
                            <View style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'rgba(201,74,74,0.15)', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#c94a4a' }}>
                              <Text style={[styles.settingsRowText, { fontSize: 13, color: '#e8b4b4' }]}>
                                {t('billing.usageWarning90')}
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setBillingPlanView('subscription');
                                }}
                                style={[styles.ctaBtnSecondary, { marginTop: 8, alignSelf: 'flex-start' }]}
                              >
                                <Text style={styles.ctaBtnText}>{t('billing.upgradeNow')}</Text>
                                <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}
                      {/* Tab interni: Abbonamenti vs Lifetime */}
                      <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 8, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.3)', padding: 2 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: billingPlanView === 'subscription' ? 'rgba(197,160,89,0.2)' : 'transparent',
                          }}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setBillingPlanView('subscription');
                          }}
                        >
                          <Text
                            style={[
                              styles.settingsRowText,
                              {
                                textAlign: 'center',
                                fontSize: 13,
                                color: billingPlanView === 'subscription' ? '#c5a059' : '#d1d1d1',
                              },
                            ]}
                          >
                            {t('billing.tabSubscriptions')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: billingPlanView === 'lifetime' ? 'rgba(197,160,89,0.2)' : 'transparent',
                          }}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setBillingPlanView('lifetime');
                          }}
                        >
                          <Text
                            style={[
                              styles.settingsRowText,
                              {
                                textAlign: 'center',
                                fontSize: 13,
                                color: billingPlanView === 'lifetime' ? '#c5a059' : '#d1d1d1',
                              },
                            ]}
                          >
                            {t('billing.tabLifetime')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {billingPlanView === 'subscription' && (
                        <>
                          <Text style={[styles.settingsSectionTitle, { marginTop: 4, marginBottom: 12 }]}>{t('billing.subscriptionsSectionTitle')}</Text>
                          {PLANS.filter((p) => p.group === 'subscription').map((plan) => {
                            const isActiveSub =
                              billingStatus.active &&
                              billingStatus.mode === 'subscription' &&
                              (billingStatus.planId === plan.id || (plan.annualPlanId && billingStatus.planId === plan.annualPlanId));
                            const hasActiveSub =
                              billingStatus.active &&
                              billingStatus.mode === 'subscription' &&
                              !!billingStatus.planId;
                            const planName = t(`pricing.plans.${plan.id}.name`);
                            const planDescription = t(`pricing.plans.${plan.id}.description`);
                            const annualPrice = plan.suggestedPriceAnnual != null
                              ? plan.suggestedPriceAnnual
                              : (plan.suggestedPrice * 12 * (1 - (plan.annualDiscountPercent || 0) / 100));
                            const hasAnnual = !!plan.annualPlanId;
                            const tierLabel = plan.id.includes('elite') ? 'ELITE' : plan.id.includes('pro') ? 'PRO' : 'STARTER';
                            return (
                              <View
                                key={plan.id}
                                style={[
                                  styles.billingPlanCard,
                                  { flexDirection: 'column', alignItems: 'flex-start' },
                                  isActiveSub && styles.activePlanBox,
                                ]}
                              >
                                <Text style={styles.billingPlanCardLabel}>{tierLabel}</Text>
                                <Text style={[styles.settingsRowText, { fontWeight: '600' }]}>
                                  {planName}
                                  {isActiveSub ? ` ${t('billing.planCurrentSuffix')}` : ''}
                                </Text>
                                <Text style={[styles.settingsRowText, { marginTop: 2, color: '#c5a059' }]}>
                                  {daysLeftLaunchDiscount > 0
                                    ? `${getLaunchDiscountPrice(plan.suggestedPrice)} ${CURRENCY_DEFAULT}`
                                    : `${plan.suggestedPrice.toFixed(2).replace('.', ',')} ${CURRENCY_DEFAULT}`} {t('billing.perMonth')}
                                </Text>
                                {hasAnnual && (
                                  <Text style={[styles.settingsRowText, { marginTop: 2, fontSize: 13, color: '#a0a0a0' }]}>
                                    {daysLeftLaunchDiscount > 0
                                      ? `${getLaunchDiscountPrice(annualPrice)} ${CURRENCY_DEFAULT}`
                                      : `${annualPrice.toFixed(2).replace('.', ',')} ${CURRENCY_DEFAULT}`} {t('billing.perYear')} — {t('billing.annualSave', { percent: plan.annualDiscountPercent || 20 })}
                                  </Text>
                                )}
                                <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 13, color: '#d1d1d1' }]}>
                                  {planDescription}
                                </Text>
                                <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 12, color: '#888' }]}>
                                  {t('billing.subscriptionKeyIncludedHint')}
                                </Text>
                                {/* Se non hai già un abbonamento attivo, puoi abbonarti (mensile o annuale). */}
                                {!isActiveSub && !hasActiveSub ? (
                                  <View style={{ marginTop: 10, alignSelf: 'stretch', gap: 8 }}>
                                    <TouchableOpacity
                                      style={[styles.ctaBtn, { alignSelf: 'stretch' }]}
                                      onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        openCheckoutForPlan(plan.id);
                                      }}
                                    >
                                      <Text style={styles.ctaBtnText}>{t('billing.subscribeCta', { planName })} — {daysLeftLaunchDiscount > 0 ? getLaunchDiscountPrice(plan.suggestedPrice) : plan.suggestedPrice.toFixed(2).replace('.', ',')} € {t('billing.perMonth')}</Text>
                                      <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                                    </TouchableOpacity>
                                    {hasAnnual ? (
                                      <TouchableOpacity
                                        style={[styles.ctaBtn, { alignSelf: 'stretch', opacity: 0.95 }]}
                                        onPress={() => {
                                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                          openCheckoutForPlan(plan.annualPlanId);
                                        }}
                                      >
                                        <Text style={styles.ctaBtnText}>{t('billing.subscribeCta', { planName })} — {daysLeftLaunchDiscount > 0 ? getLaunchDiscountPrice(annualPrice) : annualPrice.toFixed(2).replace('.', ',')} € {t('billing.perYear')} ({t('billing.annualSave', { percent: plan.annualDiscountPercent || 20 })})</Text>
                                        <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>
                                ) : null}
                                {isActiveSub && plan.upgradeTargetId ? (
                                  <TouchableOpacity
                                    style={[styles.ctaBtn, { marginTop: 10, alignSelf: 'stretch' }]}
                                    onPress={() => {
                                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                      const targetId = plan.upgradeTargetId || plan.id;
                                      openCheckoutForPlan(targetId);
                                    }}
                                  >
                                    <Text style={styles.ctaBtnText}>
                                      {t('billing.upgradeCta', { planName: plan.upgradeTargetId ? t(`pricing.plans.${plan.upgradeTargetId}.name`) : plan.upgradeTargetId })}
                                    </Text>
                                    <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                                  </TouchableOpacity>
                                ) : null}
                                {isActiveSub && plan.upgradeTargetId ? (
                                  <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 12, color: '#888' }]}>
                                  {t('billing.upgradeSubtitle')}
                                </Text>
                                ) : null}
                              </View>
                            );
                          })}
                        </>
                      )}

                      {billingPlanView === 'lifetime' && (
                        <>
                          <Text style={[styles.settingsSectionTitle, { marginTop: 16, marginBottom: 12 }]}>{t('billing.lifetimeSectionTitle')}</Text>
                          <Text style={[styles.settingsRowText, { marginBottom: 12, fontSize: 13, color: '#d1d1d1' }]}>
                            {t('billing.lifetimeIntro')}
                          </Text>
                          {PLANS.filter((p) => p.group === 'lifetime').map((plan) => {
                        const isActiveLife =
                          billingStatus.active &&
                          billingStatus.mode === 'payment' &&
                          billingStatus.planId === plan.id;
                        const upgradeTarget = plan.upgradeTargetId ? PLANS.find((p) => p.id === plan.upgradeTargetId) : null;
                        const planName = t(`pricing.plans.${plan.id}.name`);
                        const planDescription = t(`pricing.plans.${plan.id}.description`);
                        const lifeTierLabel = plan.id.includes('elite') ? 'LIFETIME ELITE' : plan.id.includes('pro') ? 'LIFETIME PRO' : 'LIFETIME STARTER';
                        return (
                        <View
                          key={plan.id}
                          style={[
                            styles.billingPlanCard,
                            { flexDirection: 'column', alignItems: 'flex-start' },
                            isActiveLife && styles.activePlanBox,
                          ]}
                        >
                          <Text style={styles.billingPlanCardLabel}>{lifeTierLabel}</Text>
                          <Text style={[styles.settingsRowText, { fontWeight: '600' }]}>
                            {planName}
                            {isActiveLife ? ` ${t('billing.lifetimeActiveSuffix')}` : ''}
                          </Text>
                          <Text style={[styles.settingsRowText, { marginTop: 2, color: '#c5a059' }]}>
                            {daysLeftLaunchDiscount > 0
                              ? `${getLaunchDiscountPrice(plan.suggestedPrice)} ${CURRENCY_DEFAULT}`
                              : `${plan.suggestedPrice.toFixed(2).replace('.', ',')} ${CURRENCY_DEFAULT}`} {t('billing.oneTime')}
                          </Text>
                          <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 13, color: '#d1d1d1' }]}>
                            {planDescription}
                          </Text>
                          <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 12, color: '#888' }]}>
                            {t('billing.lifetimeKeyHint')}
                          </Text>
                          {/* CTA acquisto Lifetime sempre visibile */}
                          <TouchableOpacity
                            style={[styles.ctaBtn, { marginTop: 10, alignSelf: 'stretch' }]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              openCheckoutForPlan(plan.id);
                            }}
                          >
                            <Text style={styles.ctaBtnText}>{t('billing.buyLifetimeCta', { planName })}</Text>
                            <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                          </TouchableOpacity>
                          {isActiveLife && plan.upgradeTargetId && plan.upgradePricing ? (
                            <>
                              <TouchableOpacity
                                style={[styles.ctaBtn, { marginTop: 10, alignSelf: 'stretch' }]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                  const targetId = plan.upgradeTargetId || plan.id;
                                  openCheckoutForPlan(targetId);
                                }}
                              >
                                <Text style={styles.ctaBtnText}>
                                  {t('billing.upgradeLifetimeCta', { price: daysLeftLaunchDiscount > 0 ? String(getLaunchDiscountPrice(plan.upgradePricing.difference)) : plan.upgradePricing.difference.toFixed(2).replace('.', ','), currency: CURRENCY_DEFAULT })}
                                </Text>
                                <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                              </TouchableOpacity>
                              <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 12, color: '#888' }]}>
                                {t('billing.upgradeLifetimeExplainer')}
                              </Text>
                              <Text style={[styles.settingsRowText, { marginTop: 2, fontSize: 12, color: '#888' }]}>
                                {t('billing.upgradeLifetimeExample', {
                                  fromPrice: String(daysLeftLaunchDiscount > 0 ? getLaunchDiscountPrice(plan.suggestedPrice) : Math.round(plan.suggestedPrice)),
                                  toPrice: upgradeTarget ? String(daysLeftLaunchDiscount > 0 ? getLaunchDiscountPrice(upgradeTarget.suggestedPrice) : Math.round(upgradeTarget.suggestedPrice)) : '',
                                  diffPrice: String(daysLeftLaunchDiscount > 0 ? getLaunchDiscountPrice(plan.upgradePricing.difference) : Math.round(plan.upgradePricing.difference)),
                                })}
                              </Text>
                            </>
                          ) : null}
                        </View>
                        );
                          })}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {legal.subscription.sections.map((s) => (
                        <View key={s.id} style={{ marginBottom: 16 }}>
                          <Text style={[styles.settingsSectionTitle, { marginBottom: 6 }]}>{s.title}</Text>
                          <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#d1d1d1' }]}>{s.content}</Text>
                        </View>
                      ))}
                      <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#c5a059', marginTop: 8 }]}>{legal.subscription.contactNote}</Text>
                    </>
                  )}
                </ScrollView>
              </View>
            ) : (
              <ScrollView style={styles.menuTabScroll} contentContainerStyle={styles.menuSettingsContent} showsVerticalScrollIndicator={false}>
                {/* Sezione: Identità Digitale */}
                <View style={[styles.menuSectionBlock, { marginTop: 0, paddingTop: 0, borderTopWidth: 0 }]}>
                  <Text style={styles.settingsSectionTitle}>{t('settings.sectionProfileTitle')}</Text>
                  <TouchableOpacity
                    style={styles.menuEntryRow}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('profilo'); }}
                    accessibilityLabel={t('settings.profileVoicePhotoRow')}
                  >
                    <FontAwesome name="user-circle" size={20} color="#c5a059" />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.settingsRowText}>{t('settings.profileVoicePhotoRow')}</Text>
                      <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>{t('settings.aiNameHint')}</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuEntryRow, { marginTop: 10 }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowMenuModal(false);
                      setUseCaseOnboardingStep('usecase');
                      setShowUseCaseOnboarding(true);
                    }}
                    accessibilityLabel={`${t('settings.path')}: ${useCase === 'study' ? t('studentEdition.studyTab') : useCase === 'life' ? t('studentEdition.lifeTab') : t('studentEdition.choosePath')}`}
                  >
                    <FontAwesome name="map-signs" size={20} color="#c5a059" />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.settingsRowText}>{t('settings.path')}</Text>
                      <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>
                        {useCase === 'study'
                          ? t('studentEdition.studyTab')
                          : useCase === 'life'
                            ? t('studentEdition.lifeTab')
                            : t('studentEdition.choosePath')}
                      </Text>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                </View>

                {/* Sezione: Account e sicurezza */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>{t('settings.sectionAccountSecurity')}</Text>
                  <TouchableOpacity
                    style={styles.menuEntryRow}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('sicurezza'); }}
                    accessibilityLabel={t('settings.password2FASupport')}
                  >
                    <FontAwesome name="lock" size={20} color="#c5a059" />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.settingsRowText}>{t('settings.password2FASupport')}</Text>
                      <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>{t('settings.password2FASupportSubtitle')}</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                </View>

                {/* Sezione: Condividi OXY (50% sconto quando si attivano i piani) */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>{t('shareOxy.sectionTitle')}</Text>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); shareOxyForDiscount(); }}
                    accessibilityLabel={t('shareOxy.button')}
                  >
                    <FontAwesome name="share-alt" size={20} color="#c5a059" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingsRowText}>{t('shareOxy.button')}</Text>
                      {billingStatus?.sharedForDiscount ? (
                        <Text style={[styles.settingsRowText, { fontSize: 12, color: '#c5a059', marginTop: 2 }]}>{t('shareOxy.alreadyShared')}</Text>
                      ) : null}
                    </View>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                </View>

                {/* Sezione: Legale e abbonamento */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>{t('settings.legalAndBilling')}</Text>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('privacy'); }}
                    accessibilityLabel={t('settings.privacyPolicy')}
                  >
                    <FontAwesome name="shield" size={20} color="#c5a059" />
                    <Text style={styles.settingsRowText}>{t('settings.privacyPolicy')}</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('termini'); }}
                    accessibilityLabel={t('settings.termsOfService')}
                  >
                    <FontAwesome name="file-text" size={20} color="#c5a059" />
                    <Text style={styles.settingsRowText}>{t('settings.termsOfService')}</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                  {SHOW_UPGRADE ? (
                    <TouchableOpacity
                      style={styles.settingsRowBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuTab('impostazioni'); setMenuSubView('abbonamento'); }}
                      accessibilityLabel={t('settings.subscriptionAndPayments')}
                    >
                      <FontAwesome name="credit-card" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>{t('settings.subscriptionAndPayments')}</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.settingsRowBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPianiInArrivoModal(true); }}
                      accessibilityLabel={t('billing.pianiInArrivoTitle')}
                    >
                      <FontAwesome name="gift" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>{t('billing.pianiInArrivoTitle')}</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                  )}
                  {SHOW_UPGRADE && !isFreePlan ? (
                    <TouchableOpacity
                      style={styles.settingsRowBtn}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('oxykey'); }}
                      accessibilityLabel={t('settings.buyOxyKey')}
                    >
                      <FontAwesome name="key" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>{t('settings.buyOxyKey')}</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Sezione: Cloud e dati (disponibile solo con piano Elite) */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>{t('settings.cloudAndData')}</Text>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (effectiveFlags.cloud) {
                        setShowMenuModal(false);
                        setViewAttiva('cloud');
                      } else {
                        onLockedFeatureTap();
                      }
                    }}
                    accessibilityLabel={t('settings.manageCloud')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FontAwesome name="cloud" size={20} color="#c5a059" style={!effectiveFlags.cloud ? { opacity: 0.6 } : undefined} />
                      {!effectiveFlags.cloud ? <FontAwesome name="lock" size={12} color="#c5a059" /> : null}
                    </View>
                    <Text style={[styles.settingsRowText, !effectiveFlags.cloud && { opacity: 0.6 }]}>{t('settings.manageCloud')}{!effectiveFlags.cloud ? ` (${t('features.eliteOnly')})` : ''}</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                </View>

                {/* Sezione: Chat e gruppi */}
                {featureFlags.groupChat ? (
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>Chat e gruppi</Text>
                    <TouchableOpacity
                      style={styles.settingsRowBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowMenuModal(false);
                        setShowCreateGroupModal(true);
                      }}
                      accessibilityLabel="Crea Chat di Gruppo"
                    >
                      <FontAwesome name="users" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>Crea Chat di Gruppo</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Oxy Key (one_time_purchase) */}
                {SHOW_OXY_KEY_OPTION ? (
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>Oxy Key</Text>
                    {hasOxyKey ? (
                      <>
                        <View style={[styles.settingsRow, { marginBottom: 8 }]}>
                          <FontAwesome name="key" size={20} color="#c5a059" />
                          <Text style={[styles.settingsRowText, { marginLeft: 14, color: '#888' }]}>
                            Chiave configurata: sk-••••••••••••
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.settingsRowBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Alert.alert(
                              t('settings.oxyKeyReplaceTitle'),
                              t('settings.oxyKeyReplaceBody'),
                              [
                                { text: t('common.cancel') },
                                {
                                  text: t('settings.oxyKeyReplaceButton'),
                                  onPress: () => {
                                    setShowMenuModal(false);
                                    setShowOxyKeyGate(true);
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <FontAwesome name="edit" size={20} color="#c5a059" />
                          <Text style={styles.settingsRowText}>{t('settings.oxyKeyEditRow')}</Text>
                          <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.settingsRowBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Alert.alert(
                              t('settings.oxyKeyRemoveTitle'),
                              t('settings.oxyKeyRemoveBody'),
                              [
                                { text: t('common.cancel') },
                                {
                                  text: t('settings.oxyKeyRemoveButton'),
                                  style: 'destructive',
                                  onPress: async () => {
                                    await removeOxyKey();
                                    setHasOxyKey(false);
                                    setShowOxyKeyGate(true);
                                    setShowMenuModal(false);
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <FontAwesome name="trash" size={20} color="#ff6b6b" />
                          <Text style={[styles.settingsRowText, { color: '#ff6b6b' }]}>Rimuovi chiave</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.settingsRowBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowMenuModal(false);
                            setShowOxyKeyGate(true);
                          }}
                        >
                          <FontAwesome name="key" size={20} color="#c5a059" />
                          <Text style={styles.settingsRowText}>Inserisci Oxy Key</Text>
                          <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : null}

                {/* Chiave Gemini (gratuita, costo zero) — sempre visibile se mostriamo Oxy Key */}
                {SHOW_OXY_KEY_OPTION ? (
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>{t('ui.geminiKeyTitle')}</Text>
                    {hasGeminiKey ? (
                      <>
                        <View style={[styles.settingsRow, { marginBottom: 8 }]}>
                          <FontAwesome name="key" size={20} color="#5a9fc5" />
                          <Text style={[styles.settingsRowText, { marginLeft: 14, color: '#888' }]}>
                            Chiave Gemini configurata
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.settingsRowBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowMenuModal(false);
                            setShowOxyKeyGate(true);
                          }}
                        >
                          <FontAwesome name="edit" size={20} color="#5a9fc5" />
                          <Text style={styles.settingsRowText}>{t('settings.oxyKeyEditRow')}</Text>
                          <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.settingsRowBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Alert.alert(
                              t('ui.geminiKeyRemoveTitle'),
                              t('ui.geminiKeyRemoveBody'),
                              [
                                { text: t('common.cancel') },
                                {
                                  text: t('settings.oxyKeyRemoveButton'),
                                  style: 'destructive',
                                  onPress: async () => {
                                    await removeGeminiKey();
                                    setHasGeminiKey(false);
                                    if (!hasOxyKey) setShowOxyKeyGate(true);
                                    setShowMenuModal(false);
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <FontAwesome name="trash" size={20} color="#ff6b6b" />
                          <Text style={[styles.settingsRowText, { color: '#ff6b6b' }]}>{t('ui.geminiKeyRemoveTitle')}</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={styles.settingsRowBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowMenuModal(false);
                          setShowOxyKeyGate(true);
                        }}
                      >
                        <FontAwesome name="key" size={20} color="#5a9fc5" />
                        <Text style={styles.settingsRowText}>{t('ui.geminiKeyInsert')}</Text>
                        <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                {/* Sezione: Sistema */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>Sistema</Text>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const url = getBackendBaseUrl();
                      try {
                        const ctrl = new AbortController();
                        const to = setTimeout(() => ctrl.abort(), 8000);
                        const res = await fetch(`${url}/health`, { signal: ctrl.signal });
                        clearTimeout(to);
                        if (res.ok) {
                          const data = await res.json().catch(() => ({}));
                          const source = backendUrlIsFromEnv ? 'URL impostato in env' : 'Fallback produzione (Render)';
                          Alert.alert(t('serverVerify.title'), `${t('serverVerify.successBody', { source })}\n${url}\n\n${data?.service || ''} ${data?.time ? '\n' + data.time : ''}`);
                        } else {
                          Alert.alert(t('serverVerify.title'), t('serverVerify.errorBody', { status: res.status }));
                        }
                      } catch (e) {
                        const msg = e?.name === 'AbortError' ? t('serverVerify.timeoutMessage') : (e?.message || t('serverVerify.unreachableMessage'));
                        Alert.alert(t('serverVerify.title'), `${msg}\n\n${t('serverVerify.quickChecks')}`);
                      }
                    }}
                    accessibilityLabel={t('serverVerify.title')}
                  >
                    <FontAwesome name="server" size={20} color="#c5a059" />
                    <Text style={styles.settingsRowText}>{t('serverVerify.title')}</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                  <View style={[styles.settingsRow, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 }]}>
                    <Text style={[styles.settingsRowText, { fontSize: 13 }]}>Ricerca web</Text>
                    <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 4 }]}>
                      La ricerca web in tempo reale è disponibile quando configurata sul server. Se non configurata, l’IA risponderà usando solo la sua conoscenza di base (senza navigazione).
                    </Text>
                  </View>
                </View>

                {/* Disclaimer di proprietà (identità legale) */}
                <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center' }}>{t('legal.ownershipDisclaimer')}</Text>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal: tutte le modalità (Power Badges) */}
      <Modal
        visible={showModesModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowModesModal(false)}
      >
        <View style={styles.powerBadgesOverlay}>
          <SafeAreaView style={styles.powerBadgesContent}>
            <View style={styles.powerBadgesHeader}>
              <Text style={styles.powerBadgesTitle}>{t('powerBadges.modalTitle')}</Text>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowModesModal(false); }}
                style={styles.powerBadgesCloseBtn}
              >
                <FontAwesome name="times" size={24} color="#c5a059" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.powerBadgesGrid, { paddingBottom: 24 }]}>
              {POWER_BADGES.map((badge) => (
                <TouchableOpacity
                  key={badge.id}
                  style={[styles.powerBadgeCardCompact, stickyBadge?.id === badge.id && { backgroundColor: 'rgba(197,160,89,0.10)' }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowModesModal(false);
                    setStickyBadge(badge);
                    setTimeout(() => chatInputRef.current?.focus?.(), 60);
                  }}
                >
                  <View style={styles.powerBadgeIconWrapCompact}>
                    <FontAwesome name={badge.icon} size={18} color="#c5a059" />
                  </View>
                  <Text style={styles.powerBadgeLabelCompact} numberOfLines={2}>{t(`powerBadges.labels.${badge.id}`)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Lingua (quando utente è loggato, da Menu → Account e sicurezza → Lingua) */}
      <Modal
        visible={showLanguageModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.settingsTitle}>{t('register.stepLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Text style={styles.closeModal}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            {LANGUAGES.map((lng) => (
              <TouchableOpacity
                key={lng}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLanguage(lng);
                  await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lng).catch(() => {});
                  setShowLanguageModal(false);
                }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  marginBottom: 10,
                  backgroundColor: lng === language ? 'rgba(197,160,89,0.22)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: lng === language ? '#c5a059' : 'rgba(255,255,255,0.15)',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: lng === language ? '700' : '500' }}>
                  {LANGUAGE_LABELS[lng] || lng.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Student Edition — Onboarding percorso (Studio / Vita & Lavoro) */}
      <Modal
        visible={showUseCaseOnboarding}
        animationType="fade"
        transparent
        onRequestClose={() => {
          // Se non ha ancora scelto, non chiudiamo per evitare stato "mezzo configurato"
          if (useCase === 'study' || useCase === 'life') setShowUseCaseOnboarding(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.settingsTitle}>
                {useCaseOnboardingStep === 'usecase' ? t('studentEdition.welcome') : t('studentEdition.studentEditionTitle')}
              </Text>
              {(useCase === 'study' || useCase === 'life') && (
                <TouchableOpacity onPress={() => setShowUseCaseOnboarding(false)}>
                  <Text style={styles.closeModal}>{t('common.close')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {useCaseOnboardingStep === 'usecase' ? (
              <>
                <Text style={[styles.settingsRowText, { color: '#d1d1d1', marginBottom: 14, lineHeight: 20 }]}>
                  {t('studentEdition.chooseHowToUse')}
                </Text>

                <TouchableOpacity
                  style={styles.menuEntryRow}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setUseCase('study');
                    await AsyncStorage.setItem(STORAGE_KEYS.USE_CASE, 'study').catch(() => {});
                    setUseCaseOnboardingStep('level');
                  }}
                >
                  <FontAwesome name="graduation-cap" size={20} color="#c5a059" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.settingsRowText, { marginLeft: 0, flex: 0, flexShrink: 1 }]}>
                      {t('studentEdition.studyTab')}
                    </Text>
                    <Text style={[styles.settingsRowText, { marginLeft: 0, flex: 0, flexShrink: 1, fontSize: 12, lineHeight: 16, color: '#888', marginTop: 2 }]}>
                      {t('studentEdition.studyTabSubtitle')}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuEntryRow, { marginTop: 10 }]}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setUseCase('life');
                    await AsyncStorage.setItem(STORAGE_KEYS.USE_CASE, 'life').catch(() => {});
                    setShowUseCaseOnboarding(false);
                  }}
                >
                  <FontAwesome name="heart" size={20} color="#c5a059" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.settingsRowText, { marginLeft: 0, flex: 0, flexShrink: 1 }]}>
                      {t('studentEdition.lifeTab')}
                    </Text>
                    <Text style={[styles.settingsRowText, { marginLeft: 0, flex: 0, flexShrink: 1, fontSize: 12, lineHeight: 16, color: '#888', marginTop: 2 }]}>
                      {t('studentEdition.lifeTabSubtitle')}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                </TouchableOpacity>
              </>
            ) : useCaseOnboardingStep === 'level' ? (
              <>
                <Text style={[styles.settingsRowText, { color: '#d1d1d1', marginBottom: 14, lineHeight: 20 }]}>
                  {t('studentEdition.whichLevel')}
                </Text>
                <TouchableOpacity
                  style={styles.menuEntryRow}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStudentLevel('highschool');
                    await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_LEVEL, 'highschool').catch(() => {});
                    setUseCaseOnboardingStep('focus');
                  }}
                >
                  <FontAwesome name="book" size={20} color="#c5a059" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.settingsRowText, { marginLeft: 0, flex: 0, flexShrink: 1 }]}>
                      {t('studentEdition.highschool')}
                    </Text>
                    <Text style={[styles.settingsRowText, { marginLeft: 0, flex: 0, flexShrink: 1, fontSize: 12, lineHeight: 16, color: '#888', marginTop: 2 }]}>
                      {t('studentEdition.highschoolSubtitle')}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuEntryRow, { marginTop: 10 }]}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStudentLevel('university');
                    await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_LEVEL, 'university').catch(() => {});
                    setUseCaseOnboardingStep('focus');
                  }}
                >
                  <FontAwesome name="university" size={20} color="#c5a059" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.settingsRowText, { marginLeft: 0, flex: 0, flexShrink: 1 }]}>
                      {t('studentEdition.university')}
                    </Text>
                    <Text style={[styles.settingsRowText, { marginLeft: 0, flex: 0, flexShrink: 1, fontSize: 12, lineHeight: 16, color: '#888', marginTop: 2 }]}>
                      {t('studentEdition.universitySubtitle')}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setUseCaseOnboardingStep('usecase')}
                  style={[styles.menuBackBar, { marginTop: 14 }]}
                  accessibilityLabel={t('common.back')}
                  accessibilityRole="button"
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.settingsRowText, { color: '#d1d1d1', marginBottom: 10, lineHeight: 20 }]}>
                  {t('studentEdition.setFocusHint')}
                </Text>

                <TextInput
                  style={[styles.regInput, { marginTop: 6 }]}
                  placeholder={t('studentEdition.focusPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={studentFocus}
                  onChangeText={(v) => setStudentFocus(v)}
                />

                <TextInput
                  style={styles.regInput}
                  placeholder={studentLevel === 'university' ? t('studentEdition.examPlaceholder') : t('studentEdition.subjectPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={studentExamName}
                  onChangeText={setStudentExamName}
                />

                <TextInput
                  style={styles.regInput}
                  placeholder={studentLevel === 'university' ? t('studentEdition.examDatePlaceholder') : t('studentEdition.subjectDatePlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={formatDateDDMMYYYY(studentExamDate)}
                  onChangeText={(v) => setStudentExamDate(formatDateDDMMYYYY(v))}
                />

                <TouchableOpacity
                  style={[styles.legalCheckRow, { marginTop: 8, marginBottom: 6 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStudentReminderEnabled((x) => !x);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={studentReminderEnabled ? 'checkbox' : 'checkbox-outline'} size={16} color="rgba(197,160,89,0.9)" />
                  <Text style={[styles.legalCheckText, { fontSize: 12, color: 'rgba(255,255,255,0.75)' }]}>
                    {t('studentEdition.studyReminderLabel')}
                  </Text>
                </TouchableOpacity>

                {studentReminderEnabled ? (
                  <TextInput
                    style={styles.regInput}
                    placeholder={t('studentEdition.studyReminderTimePlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.55)"
                    value={studentReminderTime}
                    onChangeText={(v) => setStudentReminderTime(v.replace(/[^\d:]/g, '').slice(0, 5))}
                  />
                ) : null}

                <TouchableOpacity
                  style={[styles.btn, { marginTop: 6 }]}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const examIso = normalizeIsoDate(formatDateDDMMYYYY(studentExamDate));
                    setStudentExamDate(examIso);
                    await AsyncStorage.multiSet([
                      [STORAGE_KEYS.STUDENT_FOCUS, String(studentFocus || '')],
                      [STORAGE_KEYS.STUDENT_EXAM_NAME, String(studentExamName || '')],
                      [STORAGE_KEYS.STUDENT_EXAM_DATE, String(examIso || '')],
                      [STORAGE_KEYS.STUDENT_REMINDER_ENABLED, studentReminderEnabled ? 'true' : 'false'],
                      [STORAGE_KEYS.STUDENT_REMINDER_TIME, String(studentReminderTime || '18:30')],
                    ]).catch(() => {});
                    // Aggiorna scheduling locale dopo salvataggio
                    setTimeout(() => { scheduleStudentReminders().catch(() => {}); }, 50);
                    setShowUseCaseOnboarding(false);
                  }}
                >
                  <Text style={styles.btnText}>{t('studentEdition.continue')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setUseCaseOnboardingStep('level')}
                  style={[styles.menuBackBar, { marginTop: 8 }]}
                  accessibilityLabel={t('billing.back')}
                  accessibilityRole="button"
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Student Edition — Home Student (entry point da chip "Studia") */}
      <Modal
        visible={showStudentHomeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStudentHomeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            key={`studentHome-${studentHomeOpenKey}`}
            style={styles.settingsPanel}
            renderToHardwareTextureAndroid
            collapsable={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.settingsTitle}>{t('studentEdition.oxyStudentTitle')}</Text>
              <TouchableOpacity onPress={() => setShowStudentHomeModal(false)}>
                <Text style={styles.closeModal}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.settingsRowText, { color: '#d1d1d1', marginBottom: 12 }]}>
              {t('studentEdition.fromMaterialToResult')}
            </Text>

            <TouchableOpacity
              style={styles.menuEntryRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowStudentHomeModal(false);
                setStickyBadge(POWER_BADGES.find((b) => b.id === 'planner') || null);
                const base = studentLevel === 'university'
                  ? `Esame: ${studentExamName || '...'}\nTema/modulo: ...\n`
                  : `Materia: ${studentExamName || '...'}\nArgomento/capitolo: ...\n`;
                setInputMessage(`${base}Obiettivo: ...\nTempo disponibile: ...\nCrea un piano + domande + ripasso...`);
                setTimeout(() => chatInputRef.current?.focus?.(), 80);
              }}
            >
              <FontAwesome name="magic" size={20} color="#c5a059" />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.settingsRowText}>{t('studentEdition.examBuilder')}</Text>
                <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>
                  {t('studentEdition.examBuilderSubtitle')}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuEntryRow, { marginTop: 10 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowStudentHomeModal(false);
                setStickyBadge(POWER_BADGES.find((b) => b.id === 'coach') || null);
                setInputMessage(`Simulazione orale (${studentLevel === 'university' ? 'esame' : 'interrogazione'}).\nArgomento: ...\nLivello: standard.\nFai 8 domande, una alla volta. Dopo ogni risposta dammi feedback e cosa migliorare...`);
                setTimeout(() => chatInputRef.current?.focus?.(), 80);
              }}
            >
              <FontAwesome name="comments" size={20} color="#c5a059" />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.settingsRowText}>{t('studentEdition.oral')}</Text>
                <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>
                  {t('studentEdition.oralSubtitle')}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuEntryRow, { marginTop: 10 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowStudentHomeModal(false);
                setStickyBadge(POWER_BADGES.find((b) => b.id === 'analytic') || null);
                setInputMessage(`Quiz rapido (10 domande).\nArgomento: ...\nDifficoltà: standard.\nDopo le risposte: correzione con spiegazioni e cosa ripassare...`);
                setTimeout(() => chatInputRef.current?.focus?.(), 80);
              }}
            >
              <FontAwesome name="check-circle" size={20} color="#c5a059" />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.settingsRowText}>{t('studentEdition.quiz')}</Text>
                <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>
                  {t('studentEdition.quizSubtitle')}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuEntryRow, { marginTop: 10 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowStudentHomeModal(false);
                setStickyBadge(POWER_BADGES.find((b) => b.id === 'planner') || null);
                setInputMessage(`Crea un piano settimana.\nScadenza: ${studentExamDate || '...'}\nTempo al giorno: ... minuti\nMaterie/argomenti: ...\nOutput: calendario giorno per giorno + micro-task...`);
                setTimeout(() => chatInputRef.current?.focus?.(), 80);
              }}
            >
              <FontAwesome name="calendar" size={20} color="#c5a059" />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.settingsRowText}>{t('studentEdition.plan')}</Text>
                <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>
                  {t('studentEdition.planSubtitle')}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal "OXY ricorda" — primo ingresso in chat: mette in evidenza Memory Vault */}
      <Modal visible={isLogged && viewAttiva === 'chat' && !hasSeenMemoryVaultIntro} animationType="fade" transparent onRequestClose={() => {}}>
        <View style={[styles.powerBadgesOverlay, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, padding: 28, maxWidth: 340, borderWidth: 1, borderColor: 'rgba(197,160,89,0.3)' }}>
            <FontAwesome name="book" size={40} color="#c5a059" style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.firstLaunchLanguageTitle, { textAlign: 'center', marginBottom: 8 }]}>{t('onboarding.memoryVaultTitle')}</Text>
            <Text style={[styles.firstLaunchLanguageSubtitle, { textAlign: 'center', marginBottom: 24 }]}>{t('onboarding.memoryVaultBody')}</Text>
            <TouchableOpacity
              style={[styles.firstLaunchLanguageConfirmButton, { alignSelf: 'stretch' }]}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                try { await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_MEMORY_VAULT_INTRO, 'true'); } catch (_) {}
                setHasSeenMemoryVaultIntro(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.firstLaunchLanguageConfirmText}>{t('onboarding.memoryVaultCta')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Memory Vault — Le mie note (colori OXY) */}
      <Modal
        visible={showMemoryVaultModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowMemoryVaultModal(false)}
      >
        <View style={styles.powerBadgesOverlay}>
          <SafeAreaView style={styles.powerBadgesContent}>
            <View style={styles.powerBadgesHeader}>
              <Text style={styles.powerBadgesTitle}>{t('memoryVault.modalTitle')}</Text>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMemoryVaultModal(false); }}
                style={styles.powerBadgesCloseBtn}
              >
                <FontAwesome name="times" size={24} color="#c5a059" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.firstLaunchLanguageSubtitle, { marginHorizontal: 20, marginBottom: 12, color: 'rgba(197,160,89,0.9)' }]} numberOfLines={2}>{t('memoryVault.introLine')}</Text>
            {memoryVaultLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#c5a059" />
                <Text style={{ color: '#d1d1d1', marginTop: 12 }}>{t('common.loading')}</Text>
              </View>
            ) : memoryVaultError ? (
              <View style={styles.memoryVaultErrorWrap}>
                <FontAwesome name="exclamation-circle" size={48} color="rgba(197,160,89,0.6)" style={{ marginBottom: 16 }} />
                <Text style={styles.memoryVaultErrorText}>{memoryVaultError}</Text>
                <TouchableOpacity
                  style={styles.memoryVaultRetryBtn}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); refetchMemoryVault(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.memoryVaultRetryBtnText}>{t('memoryVault.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.menuTabScroll}
                contentContainerStyle={[styles.promptListContainer, { paddingBottom: 40 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={memoryVaultRefreshing}
                    onRefresh={() => refetchMemoryVault(true)}
                    tintColor="#c5a059"
                    colors={['#c5a059']}
                  />
                }
              >
                {Array.isArray(memoryVaultData?.goals) && memoryVaultData.goals.length > 0 ? (
                  <View style={styles.memoryVaultSection}>
                    <Text style={styles.memoryVaultSectionTitle}>{t('memoryVault.sectionGoals')}</Text>
                    {memoryVaultData.goals.map((note) => (
                      <View key={note.id} style={[styles.memoryVaultSection, styles.memoryVaultNoteRow]}>
                        <View style={styles.memoryVaultNoteTextWrap}>
                          <Text style={styles.memoryVaultText}>{note.text}</Text>
                        </View>
                        <TouchableOpacity
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          onPress={() => {
                            Alert.alert(t('memoryVault.deleteNoteTitle'), t('memoryVault.deleteNoteConfirm'), [
                              { text: t('common.cancel'), style: 'cancel' },
                              { text: t('common.delete'), style: 'destructive', onPress: async () => {
                                try {
                                  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                  if (idToken) {
                                    await deleteMemoryNote({ userId, idToken }, note.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    await refetchMemoryVault(false);
                                  }
                                } catch (e) {
                                  Alert.alert(t('chat.errorTitle'), e?.message || t('memoryVault.deleteError'));
                                }
                              } },
                            ]);
                          }}
                          style={styles.memoryVaultClearBtn}
                          accessibilityLabel={t('memoryVault.deleteNoteTitle')}
                        >
                          <FontAwesome name="trash-o" size={16} color="rgba(197,160,89,0.8)" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
                {Array.isArray(memoryVaultData?.keyFacts) && memoryVaultData.keyFacts.length > 0 ? (
                  <View style={styles.memoryVaultSection}>
                    <Text style={styles.memoryVaultSectionTitle}>{t('memoryVault.sectionKeyFacts')}</Text>
                    {memoryVaultData.keyFacts.map((note) => (
                      <View key={note.id} style={[styles.memoryVaultSection, styles.memoryVaultNoteRow]}>
                        <View style={styles.memoryVaultNoteTextWrap}>
                          <Text style={styles.memoryVaultText}>{note.text}</Text>
                        </View>
                        <TouchableOpacity
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          onPress={() => {
                            Alert.alert(t('memoryVault.deleteNoteTitle'), t('memoryVault.deleteNoteConfirm'), [
                              { text: t('common.cancel'), style: 'cancel' },
                              { text: t('common.delete'), style: 'destructive', onPress: async () => {
                                try {
                                  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                  if (idToken) {
                                    await deleteMemoryNote({ userId, idToken }, note.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    await refetchMemoryVault(false);
                                  }
                                } catch (e) {
                                  Alert.alert(t('chat.errorTitle'), e?.message || t('memoryVault.deleteError'));
                                }
                              } },
                            ]);
                          }}
                          style={styles.memoryVaultClearBtn}
                          accessibilityLabel={t('memoryVault.deleteNoteTitle')}
                        >
                          <FontAwesome name="trash-o" size={16} color="rgba(197,160,89,0.8)" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
                {memoryVaultData?.identitySummary ? (
                  <View style={styles.memoryVaultSection}>
                    <View style={styles.memoryVaultSectionHeader}>
<Text style={styles.memoryVaultSectionTitle}>{t('memoryVault.sectionIdentity')}</Text>
                    <TouchableOpacity
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        onPress={() => {
                          Alert.alert(t('memoryVault.deleteIdentityTitle'), t('memoryVault.deleteIdentityConfirm'), [
                            { text: t('common.cancel'), style: 'cancel' },
                            { text: t('common.delete'), style: 'destructive', onPress: async () => {
                              try {
                                const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                if (idToken) await clearMemorySections({ userId, idToken }, ['identitySummary']);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                await refetchMemoryVault(false);
                              } catch (e) {
                                Alert.alert(t('chat.errorTitle'), e?.message || t('memoryVault.deleteError'));
                              }
                            } },
                          ]);
                        }}
                        style={styles.memoryVaultClearBtn}
                        accessibilityLabel={t('memoryVault.deleteIdentityTitle')}
                      >
                        <FontAwesome name="trash-o" size={16} color="rgba(197,160,89,0.8)" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.memoryVaultText}>{memoryVaultData.identitySummary}</Text>
                  </View>
                ) : null}
                {memoryVaultData?.lastContext ? (
                  <View style={styles.memoryVaultSection}>
                    <View style={styles.memoryVaultSectionHeader}>
                      <Text style={styles.memoryVaultSectionTitle}>{t('memoryVault.sectionLastContext')}</Text>
                      <TouchableOpacity
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        onPress={() => {
                          Alert.alert(t('memoryVault.deleteContextTitle'), t('memoryVault.deleteContextConfirm'), [
                            { text: t('common.cancel'), style: 'cancel' },
                            { text: t('common.delete'), style: 'destructive', onPress: async () => {
                              try {
                                const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                if (idToken) await clearMemorySections({ userId, idToken }, ['lastContext']);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                await refetchMemoryVault(false);
                              } catch (e) {
                                Alert.alert(t('chat.errorTitle'), e?.message || t('memoryVault.deleteError'));
                              }
                            } },
                          ]);
                        }}
                        style={styles.memoryVaultClearBtn}
                        accessibilityLabel={t('memoryVault.deleteContextTitle')}
                      >
                        <FontAwesome name="trash-o" size={16} color="rgba(197,160,89,0.8)" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.memoryVaultText}>{memoryVaultData.lastContext}</Text>
                  </View>
                ) : null}
                {!memoryVaultLoading && memoryVaultData && !(Array.isArray(memoryVaultData.goals) && memoryVaultData.goals.length > 0) && !(Array.isArray(memoryVaultData.keyFacts) && memoryVaultData.keyFacts.length > 0) && !memoryVaultData.identitySummary && !memoryVaultData.lastContext ? (
                  <Text style={styles.memoryVaultEmpty}>{t('memoryVault.empty', { name: effectiveAiName })}</Text>
                ) : null}
                <View style={[styles.memoryVaultSection, { marginTop: 20 }]}>
                  <Text style={[styles.memoryVaultSectionTitle, { marginBottom: 8 }]}>{t('memoryVault.addNoteTitle')}</Text>
                  <TextInput
                    style={[styles.settingsInputInline, { minHeight: 56, color: '#fff' }]}
                    placeholder={t('memoryVault.addNotePlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={memoryVaultNewNote}
                    onChangeText={setMemoryVaultNewNote}
                  />
                  <TouchableOpacity
                    style={[styles.memoryVaultRetryBtn, { alignSelf: 'flex-start', marginTop: 8 }]}
                    onPress={async () => {
                      const text = memoryVaultNewNote.trim();
                      if (!text || memoryVaultSavingNote) return;
                      setMemoryVaultSavingNote(true);
                      try {
                        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                        if (!idToken) throw new Error('Accesso richiesto');
                        await saveToMemory({ userId, idToken }, { keyFact: text });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setMemoryVaultNewNote('');
                        await refetchMemoryVault(false);
                      } catch (e) {
                        Alert.alert(t('chat.errorTitle'), e?.message || t('memoryVault.saveError'));
                      } finally {
                        setMemoryVaultSavingNote(false);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={!memoryVaultNewNote.trim() || memoryVaultSavingNote}
                  >
                    <Text style={styles.memoryVaultRetryBtnText}>{memoryVaultSavingNote ? t('memoryVault.saving') : t('memoryVault.addNoteButton')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Diario (roadmap) */}
      <Modal
        visible={showDiaryModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowDiaryModal(false)}
      >
        <View style={styles.powerBadgesOverlay}>
          <SafeAreaView style={styles.powerBadgesContent}>
            <View style={styles.powerBadgesHeader}>
              <Text style={styles.powerBadgesTitle}>{t('diary.modalTitle')}</Text>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDiaryModal(false); setDiaryNewEntry(''); }}
                style={styles.powerBadgesCloseBtn}
              >
                <FontAwesome name="times" size={24} color="#c5a059" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.firstLaunchLanguageSubtitle, { marginHorizontal: 20, marginBottom: 12, color: 'rgba(197,160,89,0.9)' }]} numberOfLines={2}>{t('diary.introLine')}</Text>
            {diaryLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#c5a059" />
                <Text style={{ color: '#d1d1d1', marginTop: 12 }}>{t('common.loading')}</Text>
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.menuTabScroll}
                  contentContainerStyle={[styles.promptListContainer, { paddingBottom: 24 }]}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={diaryRefreshing}
                      onRefresh={() => refetchDiary(true)}
                      tintColor="#c5a059"
                      colors={['#c5a059']}
                    />
                  }
                >
                  {diaryData.progressSummary ? (
                    <View style={styles.memoryVaultSection}>
                      <Text style={styles.memoryVaultSectionTitle}>Progressi</Text>
                      <Text style={styles.memoryVaultText}>{diaryData.progressSummary}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.memoryVaultSectionTitle, { marginTop: 8 }]}>Le tue note</Text>
                  {diaryData.entries && diaryData.entries.length > 0 ? (
                    diaryData.entries.slice().reverse().map((entry) => (
                      <View key={entry.id} style={[styles.memoryVaultSection, styles.memoryVaultNoteRow, { marginTop: 8 }]}>
                        <View style={styles.memoryVaultNoteTextWrap}>
                          <Text style={{ color: '#c5a059', fontSize: 12, marginBottom: 4 }}>{entry.date}</Text>
                          <Text style={styles.memoryVaultText}>{entry.content}</Text>
                        </View>
                        <TouchableOpacity
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          onPress={() => {
                            Alert.alert(t('diary.deleteEntryTitle'), t('diary.deleteEntryConfirm'), [
                              { text: t('common.cancel'), style: 'cancel' },
                              { text: t('common.delete'), style: 'destructive', onPress: async () => {
                                try {
                                  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                  if (idToken) {
                                    await deleteDiaryEntry(idToken, entry.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    await refetchDiary(true);
                                  }
                                } catch (e) {
                                  Alert.alert(t('chat.errorTitle'), e?.message || t('memoryVault.deleteError'));
                                }
                              } },
                            ]);
                          }}
                          style={styles.memoryVaultClearBtn}
                          accessibilityLabel={t('diary.deleteEntryTitle')}
                        >
                          <FontAwesome name="trash-o" size={16} color="rgba(197,160,89,0.8)" />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.memoryVaultEmpty}>Nessuna nota ancora. Scrivi qualcosa qui sotto e OXY la ricorderà nel tempo.</Text>
                  )}
                </ScrollView>
                <View style={styles.diaryComposerBar}>
                  <TextInput
                    style={[styles.settingsInputInline, { minHeight: 80, textAlignVertical: 'top', marginBottom: 10, color: '#fff' }]}
                    placeholder={t('chat.inputPlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={diaryNewEntry}
                    onChangeText={setDiaryNewEntry}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.memoryVaultRetryBtn, { alignSelf: 'flex-end' }]}
                    onPress={async () => {
                      const text = diaryNewEntry.trim();
                      if (!text || diarySaving) return;
                      setDiarySaving(true);
                      try {
                        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                        if (!idToken) throw new Error('Accesso richiesto');
                        await saveDiaryEntry(idToken, { content: text });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setDiaryNewEntry('');
                        await refetchDiary(true);
                        track(EVENTS.DIARY_ENTRY, {}, idToken);
                      } catch (e) {
                        Alert.alert(t('chat.errorTitle'), e?.message || t('memoryVault.saveError'));
                      } finally {
                        setDiarySaving(false);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={!diaryNewEntry.trim() || diarySaving}
                  >
                    <Text style={styles.memoryVaultRetryBtnText}>{diarySaving ? t('memoryVault.saving') : t('memoryVault.save')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Storie (roadmap) */}
      <Modal
        visible={showStoriesModal}
        animationType="none"
        transparent
        onRequestClose={() => { setShowStoriesModal(false); setLastCompletedStoryTitle(null); }}
      >
        <View style={styles.powerBadgesOverlay}>
          <SafeAreaView style={styles.powerBadgesContent}>
            <View style={styles.powerBadgesHeader}>
              <Text style={styles.powerBadgesTitle}>{t('stories.modalTitle')}</Text>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowStoriesModal(false); setLastCompletedStoryTitle(null); }}
                style={styles.powerBadgesCloseBtn}
              >
                <FontAwesome name="times" size={24} color="#c5a059" />
              </TouchableOpacity>
            </View>
            {storyStateLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#c5a059" />
                <Text style={{ color: '#d1d1d1', marginTop: 12 }}>{t('common.loading')}</Text>
              </View>
            ) : storyState.currentStoryId ? (() => {
              const story = STORIES.find((s) => s.id === storyState.currentStoryId);
              if (!story) return <Text style={styles.memoryVaultEmpty}>{t('stories.notFound')}</Text>;
              const storyTitle = t(`stories.items.${story.id}.title`);
              const stepText = t(`stories.items.${story.id}.steps.${storyState.stepIndex}`);
              const isLast = storyState.stepIndex >= (Number(story.stepsCount || 0) - 1);
              const isFirst = storyState.stepIndex === 0;
              const buttonLabel = isLast ? t('stories.button.finish') : isFirst ? t('stories.button.first') : t('stories.button.next');
              return (
                <View style={{ flex: 1, padding: 20 }}>
                  <Text style={[styles.memoryVaultSectionTitle, { marginBottom: 12 }]}>{storyTitle}</Text>
                  <Text style={[styles.memoryVaultText, { marginBottom: 24 }]}>{stepText}</Text>
                  <Text style={[styles.memoryVaultText, { marginBottom: 12, fontSize: 13, color: 'rgba(197,160,89,0.9)' }]}>
                    {isFirst
                      ? t('stories.hint.first')
                      : isLast
                        ? t('stories.hint.last', { aiName: effectiveAiName })
                        : t('stories.hint.middle')}
                  </Text>
                  <TouchableOpacity
                    style={styles.memoryVaultRetryBtn}
                    onPress={async () => {
                      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                      if (!idToken) return;
                      try {
                        if (isLast) {
                          await saveStoryState(idToken, {
                            storyId: null,
                            stepIndex: 0,
                            completed: [...(storyState.completed || []), story.id],
                          });
                          track(EVENTS.STORY_STEP, { storyId: story.id, completed: true }, idToken);
                          await refetchStoryState();
                          setLastCompletedStoryTitle(storyTitle);
                        } else {
                          await saveStoryState(idToken, { stepIndex: storyState.stepIndex + 1 });
                          track(EVENTS.STORY_STEP, { storyId: story.id, step: storyState.stepIndex + 1 }, idToken);
                          await refetchStoryState();
                        }
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (e) {
                        Alert.alert(t('chat.errorTitle'), e?.message || t('stories.errorSave'));
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.memoryVaultRetryBtnText}>{buttonLabel}</Text>
                  </TouchableOpacity>
                </View>
              );
            })() : (
              <ScrollView style={styles.menuTabScroll} contentContainerStyle={[styles.promptListContainer, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
                <Text style={[styles.memoryVaultSectionTitle, { marginBottom: 8 }]}>{t('stories.aboutTitle')}</Text>
                <Text style={[styles.memoryVaultText, { marginBottom: 4 }]}>{t('stories.aboutBody1')}</Text>
                <Text style={[styles.memoryVaultText, { marginBottom: 16, fontStyle: 'italic', color: 'rgba(197,160,89,0.95)' }]}>
                  {t('stories.aboutBody2', { aiName: effectiveAiName })}
                </Text>
                <Text style={[styles.memoryVaultText, { marginBottom: 12, fontSize: 13, color: '#888' }]}>{t('stories.chooseLabel')}</Text>
                {STORIES.filter((s) => !(storyState.completed || []).includes(s.id)).map((story) => (
                  <TouchableOpacity
                    key={story.id}
                    style={[styles.promptRow, { marginBottom: 12 }]}
                    activeOpacity={0.7}
                    onPress={async () => {
                      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                      if (!idToken) return;
                      try {
                        await saveStoryState(idToken, { storyId: story.id, stepIndex: 0 });
                        track(EVENTS.STORY_START, { storyId: story.id }, idToken);
                        await refetchStoryState();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      } catch (e) {
                        Alert.alert(t('chat.errorTitle'), e?.message || t('stories.errorStart'));
                      }
                    }}
                  >
                    <View style={styles.promptRowIcon}>
                      <FontAwesome name="align-left" size={18} color="#c5a059" />
                    </View>
                    <Text style={styles.promptRowLabel}>{t(`stories.items.${story.id}.title`)}</Text>
                    <FontAwesome name="chevron-right" size={12} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                ))}
                {(storyState.completed || []).length > 0 ? (
                  <View style={{ marginTop: 20 }}>
                    {lastCompletedStoryTitle ? (
                      <>
                        <Text style={[styles.memoryVaultText, { marginBottom: 12 }]}>
                          {t('stories.completedJustNow', { title: lastCompletedStoryTitle, aiName: effectiveAiName })}
                        </Text>
                        <Text style={[styles.memoryVaultText, { marginBottom: 16, fontWeight: '600', color: 'rgba(197,160,89,0.95)' }]}>
                          {t('stories.readyToTalkQuestion', { aiName: effectiveAiName })}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                          <TouchableOpacity
                            style={[styles.memoryVaultRetryBtn, { flex: 1, minWidth: 120 }]}
                            onPress={() => {
                              setInputMessage(t('stories.talkPrefill', { title: lastCompletedStoryTitle }));
                              setShowStoriesModal(false);
                              setLastCompletedStoryTitle(null);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.memoryVaultRetryBtnText}>{t('stories.readyToTalkYes')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.memoryVaultRetryBtn, { flex: 1, minWidth: 120, backgroundColor: 'rgba(255,255,255,0.12)' }]}
                            onPress={() => {
                              setLastCompletedStoryTitle(null);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.memoryVaultRetryBtnText}>{t('stories.readyToTalkNo')}</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <Text style={[styles.memoryVaultEmpty]}>
                        {t('stories.completedSummary', { count: String((storyState.completed || []).length), aiName: effectiveAiName })}
                      </Text>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Community (solo se feature attiva) */}
      {effectiveFlags.community ? (
        <Modal
          visible={showCommunityModal}
          animationType="none"
          transparent
          onRequestClose={() => setShowCommunityModal(false)}
        >
          <View style={styles.powerBadgesOverlay}>
            <SafeAreaView style={styles.powerBadgesContent}>
              <View style={styles.powerBadgesHeader}>
                <Text style={styles.powerBadgesTitle}>{t('community.title')}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCommunityModal(false);
                    setCommunityExploreHub(null);
                    setCommunityAskText('');
                    setCommunityTab('forYou');
                  }}
                  style={styles.powerBadgesCloseBtn}
                >
                  <FontAwesome name="times" size={24} color="#c5a059" />
                </TouchableOpacity>
              </View>

              {/* Tabs: Per te | Esplora | Chiedi a OXY */}
              <View style={styles.communityTabsRow}>
                <TouchableOpacity
                  style={[styles.communityTab, communityTab === 'forYou' && styles.communityTabActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCommunityTab('forYou'); }}
                >
                  <Text style={[styles.communityTabText, communityTab === 'forYou' && styles.communityTabTextActive]}>
                    {t('community.tabs.forYou')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.communityTab, communityTab === 'explore' && styles.communityTabActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCommunityExploreHub(null); setCommunityTab('explore'); }}
                >
                  <Text style={[styles.communityTabText, communityTab === 'explore' && styles.communityTabTextActive]}>
                    {t('community.tabs.explore')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.communityTab, communityTab === 'ask' && styles.communityTabActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCommunityTab('ask'); }}
                >
                  <Text style={[styles.communityTabText, communityTab === 'ask' && styles.communityTabTextActive]}>
                    {t('community.tabs.ask')}
                  </Text>
                </TouchableOpacity>
              </View>

              {communityTab === 'forYou' ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.communityScrollContent}>
                  <Text style={styles.communityHint}>{t('community.forYouHint')}</Text>
                  <View style={styles.communityRoomsGrid}>
                    {COMMUNITY_ROOMS
                      .filter((r) => {
                        if (useCase === 'study') return r.hub === 'student' || r.hub === 'help';
                        if (useCase === 'life') return r.hub === 'pro' || r.hub === 'wellbeing' || r.hub === 'help';
                        return r.hub === 'help' || r.hub === 'pro';
                      })
                      .slice(0, 6)
                      .map((room) => (
                        <TouchableOpacity
                          key={room.id}
                          style={styles.communityRoomTile}
                          activeOpacity={0.85}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            if (room.hub === 'help') {
                              setCommunityTab('ask');
                              return;
                            }
                            setCommunityTab('ask');
                            setCommunityAskText(`${t('community.askPrefillRoom')}: ${room.title}. `);
                          }}
                        >
                          <View style={styles.communityRoomIconWrap}>
                            <FontAwesome name={room.icon} size={18} color="#c5a059" />
                          </View>
                          <Text style={styles.communityRoomTitle}>{room.title}</Text>
                          <Text style={styles.communityRoomSubtitle} numberOfLines={2}>{room.subtitle}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.ctaBtnSecondary, { marginTop: 14 }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCommunityTab('explore'); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ctaBtnText}>{t('community.exploreAll')}</Text>
                    <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                  </TouchableOpacity>
                </ScrollView>
              ) : communityTab === 'explore' ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.communityScrollContent}>
                  {!communityExploreHub ? (
                    <>
                      <Text style={styles.communityHint}>{t('community.exploreHint')}</Text>
                      <View style={styles.communityRoomsGrid}>
                        {COMMUNITY_HUBS.map((hub) => (
                          <TouchableOpacity
                            key={hub.id}
                            style={styles.communityRoomTile}
                            activeOpacity={0.85}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCommunityExploreHub(hub.id); }}
                          >
                            <View style={styles.communityRoomIconWrap}>
                              <FontAwesome name={hub.icon} size={18} color="#c5a059" />
                            </View>
                            <Text style={styles.communityRoomTitle}>{hub.title}</Text>
                            <Text style={styles.communityRoomSubtitle} numberOfLines={2}>{hub.subtitle}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => setCommunityExploreHub(null)}
                        style={styles.menuBackBar}
                        accessibilityLabel={t('community.back')}
                        accessibilityRole="button"
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                      >
                        <FontAwesome name="chevron-left" size={22} color="#c5a059" />
                      </TouchableOpacity>
                      <Text style={[styles.memoryVaultSectionTitle, { marginTop: 4 }]}>{COMMUNITY_HUBS.find((h) => h.id === communityExploreHub)?.title || ''}</Text>
                      <View style={styles.communityRoomsGrid}>
                        {COMMUNITY_ROOMS.filter((r) => r.hub === communityExploreHub).map((room) => (
                          <TouchableOpacity
                            key={room.id}
                            style={styles.communityRoomTile}
                            activeOpacity={0.85}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              if (room.hub === 'help') {
                                setCommunityTab('ask');
                                setCommunityExploreHub(null);
                                return;
                              }
                              setCommunityTab('ask');
                              setCommunityExploreHub(null);
                              setCommunityAskText(`${t('community.askPrefillRoom')}: ${room.title}. `);
                            }}
                          >
                            <View style={styles.communityRoomIconWrap}>
                              <FontAwesome name={room.icon} size={18} color="#c5a059" />
                            </View>
                            <Text style={styles.communityRoomTitle}>{room.title}</Text>
                            <Text style={styles.communityRoomSubtitle} numberOfLines={2}>{room.subtitle}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.communityScrollContent}>
                  <Text style={styles.communityHint}>{t('community.askHint')}</Text>

                  <Text style={[styles.settingsSectionTitle, { marginTop: 8 }]}>{t('community.helpTopicsTitle')}</Text>
                  <View style={styles.communityHelpTopicsWrap}>
                    {[
                      { icon: 'book', text: t('community.topic.memoryVault'), q: 'Come funziona Memory Vault e Ricordamelo?' },
                      { icon: 'bell', text: t('community.topic.reminders'), q: 'Come impostare promemoria appuntamenti e notifiche?' },
                      { icon: 'camera', text: t('community.topic.vision'), q: 'Come funziona Vision AI e cosa posso analizzare?' },
                      { icon: 'credit-card', text: t('community.topic.billing'), q: 'Come funzionano abbonamenti e Lifetime?' },
                    ].map((x) => (
                      <TouchableOpacity
                        key={x.text}
                        style={styles.communityHelpTopicRow}
                        activeOpacity={0.85}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setCommunityAskText(x.q);
                        }}
                      >
                        <FontAwesome name={x.icon} size={16} color="#c5a059" />
                        <Text style={styles.communityHelpTopicText}>{x.text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.settingsSectionTitle, { marginTop: 18 }]}>{t('community.askBoxTitle')}</Text>
                  <TextInput
                    style={[styles.settingsInputInline, { minHeight: 70, textAlignVertical: 'top' }]}
                    placeholder={t('community.askPlaceholder')}
                    placeholderTextColor="#888"
                    value={communityAskText}
                    onChangeText={setCommunityAskText}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.ctaBtn, { marginTop: 12 }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      const q = String(communityAskText || '').trim();
                      if (!q) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowCommunityModal(false);
                      setViewAttiva('chat');
                      setStickyBadge(POWER_BADGES.find((b) => b.id === 'analytic') || null);
                      setInputMessage(q);
                      setTimeout(() => chatInputRef.current?.focus?.(), 80);
                      setCommunityAskText('');
                      setCommunityExploreHub(null);
                      setCommunityTab('forYou');
                    }}
                  >
                    <Text style={styles.ctaBtnText}>{t('community.askCta')}</Text>
                    <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                  </TouchableOpacity>
                </ScrollView>
              )}
            </SafeAreaView>
          </View>
        </Modal>
      ) : null}

      {/* OXY TV Coming Soon — placeholder premium fino al lancio */}
      <Modal
        visible={showOxyTvComingSoonModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowOxyTvComingSoonModal(false)}
      >
        <View style={styles.powerBadgesOverlay}>
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowOxyTvComingSoonModal(false); }}
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, padding: 8 }}
              accessibilityLabel={t('common.close')}
              accessibilityRole="button"
            >
              <FontAwesome name="times" size={24} color="#c5a059" />
            </TouchableOpacity>
            <LinearGradient
              colors={['#0a0a0a', '#001a2e', '#002b4d']}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, overflow: 'hidden' }}
            />
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(197,160,89,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                <FontAwesome name="tv" size={44} color="#c5a059" />
              </View>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16, paddingHorizontal: 8 }}>
                {t('settings.oxyTvComingSoon.title')}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
                {t('settings.oxyTvComingSoon.body')}
              </Text>
              <Text style={{ color: 'rgba(197,160,89,0.95)', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 28, paddingHorizontal: 8 }}>
                {t('settings.oxyTvComingSoon.priority')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowOxyTvComingSoonModal(false);
                  setShowMenuModal(true);
                  setMenuTab('impostazioni');
                  setMenuSubView('abbonamento');
                  setBillingPlanView('subscription');
                }}
                style={{ backgroundColor: '#c5a059', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, minWidth: 260, alignItems: 'center', shadowColor: '#c5a059', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 }}
              >
                <Text style={{ color: '#0a0a0a', fontWeight: '800', fontSize: 16 }}>{t('settings.oxyTvComingSoon.cta')}</Text>
              </TouchableOpacity>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 20 }}>
                {t('settings.oxyTvComingSoon.launchDate')}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Smart-Blocking: modal upgrade elegante OXY per funzioni non incluse nel piano */}
      <Modal
        visible={showUpgradeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsPanel, { maxWidth: 360, padding: 24, borderWidth: 1, borderColor: 'rgba(197,160,89,0.35)', borderRadius: 16 }]}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(197,160,89,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <FontAwesome name="lock" size={28} color="#c5a059" />
              </View>
              <Text style={{ color: '#d1d1d1', fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 20, paddingHorizontal: 8 }}>
                {t('features.upgradeModalMessage', { planName: upgradeModalPlanName === 'Elite' ? t('pricing.plans.sub_elite.name') : t('pricing.plans.sub_pro.name') })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowUpgradeModal(false)}
                  style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(197,160,89,0.5)' }}
                >
                  <Text style={{ color: '#c5a059', fontWeight: '700', fontSize: 15 }}>{t('common.close')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeUpgradeModalAndGoToPayments}
                  style={{ backgroundColor: '#c5a059', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 140, alignItems: 'center', shadowColor: '#c5a059', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}
                >
                  <Text style={{ color: '#0a0a0a', fontWeight: '800', fontSize: 15 }}>{t('features.evolviOra')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fase 1: modal "Piani in arrivo" con messaggio 50% e CTA Condividi OXY */}
      <Modal
        visible={showPianiInArrivoModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPianiInArrivoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsPanel, { maxWidth: 360, padding: 24, borderWidth: 1, borderColor: 'rgba(197,160,89,0.35)', borderRadius: 16 }]}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(197,160,89,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <FontAwesome name="gift" size={28} color="#c5a059" />
              </View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>{t('billing.pianiInArrivoTitle')}</Text>
              <Text style={{ color: '#b0b0c0', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24, paddingHorizontal: 4 }}>{t('billing.pianiInArrivoBody')}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowPianiInArrivoModal(false)}
                  style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(197,160,89,0.5)' }}
                >
                  <Text style={{ color: '#c5a059', fontWeight: '700', fontSize: 15 }}>{t('common.close')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowPianiInArrivoModal(false); shareOxyForDiscount(); }}
                  style={{ backgroundColor: '#c5a059', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 140, alignItems: 'center', shadowColor: '#c5a059', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}
                >
                  <Text style={{ color: '#0a0a0a', fontWeight: '800', fontSize: 15 }}>{t('shareOxy.button')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Crea Chat di Gruppo (solo se feature attiva) */}
      {featureFlags.groupChat ? (
        <Modal
          visible={showCreateGroupModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCreateGroupModal(false)}
        >
          <View style={styles.groupModalOverlay}>
            <View style={styles.groupModalContent}>
              <View style={styles.groupModalHeader}>
                <Text style={styles.groupModalTitle}>Crea Chat di Gruppo</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCreateGroupModal(false);
                    setGroupNameInput('');
                    setGroupMemberEmail('');
                    setGroupMembers([]);
                  }}
                  style={styles.groupModalClose}
                >
                  <FontAwesome name="times" size={22} color="#c5a059" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.groupModalInput}
                placeholder={t('community.groupNamePlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={groupNameInput}
                onChangeText={setGroupNameInput}
              />
              <Text style={styles.groupModalSectionLabel}>Aggiungi membri (email)</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
                <TextInput
                  style={[styles.groupModalInput, { flex: 1, marginRight: 10 }]}
                  placeholder="email@esempio.com"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={groupMemberEmail}
                  onChangeText={setGroupMemberEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.groupModalAddBtn}
                  onPress={() => {
                    const email = groupMemberEmail.trim();
                    if (!email || !VALIDATION.email.test(email)) return;
                    if (groupMembers.includes(email)) return;
                    if (groupMembers.length >= MAX_GROUP_MEMBERS - 1) {
                      Alert.alert(t('ui.groupLimitTitle'), t('ui.groupLimitBody', { max: MAX_GROUP_MEMBERS - 1 }));
                      return;
                    }
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGroupMembers((prev) => [...prev, email]);
                    setGroupMemberEmail('');
                  }}
                >
                  <FontAwesome name="plus" size={18} color="#0a0a0a" />
                </TouchableOpacity>
              </View>
              {groupMembers.length > 0 && (
                <View style={styles.groupMembersList}>
                  {groupMembers.map((email) => (
                    <View key={email} style={[styles.groupMemberChip, { marginBottom: 8 }]}>
                      <Text style={styles.groupMemberEmail} numberOfLines={1}>{email}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setGroupMembers((prev) => prev.filter((e) => e !== email));
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <FontAwesome name="times-circle" size={18} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.groupModalCreateBtn}
                onPress={() => {
                  if (!groupNameInput.trim()) {
                    Alert.alert(t('ui.groupMissingNameTitle'), t('ui.groupMissingNameBody'));
                    return;
                  }
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert(
                    t('ui.groupCreatedTitle'),
                    t('ui.groupCreatedBody', { name: groupNameInput.trim(), count: groupMembers.length })
                  );
                  setShowCreateGroupModal(false);
                  setShowMenuModal(false);
                  setGroupNameInput('');
                  setGroupMemberEmail('');
                  setGroupMembers([]);
                }}
              >
                <Text style={styles.groupModalCreateBtnText}>Crea gruppo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Modal invio documento via email (assistito o automatico) */}
      <Modal
        visible={docEmailModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDocEmailModalOpen(false)}
      >
        <View style={styles.groupModalOverlay}>
          <View style={styles.groupModalContent}>
            <View style={styles.groupModalHeader}>
              <Text style={styles.groupModalTitle}>{t('cloud.emailModalTitle')}</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDocEmailModalOpen(false);
                  setDocEmailSending(false);
                }}
                style={styles.groupModalClose}
              >
                <FontAwesome name="times" size={22} color="#c5a059" />
              </TouchableOpacity>
            </View>

            <Text style={styles.groupModalSectionLabel}>{t('cloud.emailToLabel')}</Text>
            <TextInput
              style={styles.groupModalInput}
              placeholder={t('cloud.emailToPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={docEmailTo}
              onChangeText={setDocEmailTo}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={{ marginTop: 8, marginBottom: 10 }}>
              {(lastPickedDocs || []).slice(0, 5).map((d) => (
                <Text key={d.name} style={[styles.settingsRowText, { marginLeft: 0, fontSize: 12, color: '#888' }]} numberOfLines={1}>
                  • {d.name} ({Math.round((d.chars || 0) / 1000)}k)
                </Text>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.ctaBtnSecondary, { marginBottom: 12, opacity: DOCS_EMAIL_AUTOSEND_UI ? 1 : 0.55 }]}
              onPress={() => {
                if (!DOCS_EMAIL_AUTOSEND_UI) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDocEmailAutoMode((v) => !v);
              }}
              activeOpacity={DOCS_EMAIL_AUTOSEND_UI ? 0.85 : 1}
            >
              <Text style={styles.ctaBtnText}>
                {docEmailAutoMode ? t('cloud.emailModeAuto') : t('cloud.emailModeAssisted')}
              </Text>
              <FontAwesome name="exchange" size={14} color="#c5a059" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.groupModalCreateBtn, docEmailSending && styles.disabledBtn]}
              disabled={docEmailSending}
              onPress={async () => {
                const to = String(docEmailTo || '').trim();
                if (!VALIDATION.email.test(to)) {
                  Alert.alert(t('chat.errorTitle'), t('cloud.emailInvalid'));
                  return;
                }
                setDocEmailSending(true);
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (docEmailAutoMode && DOCS_EMAIL_AUTOSEND_UI) {
                    await sendEmailViaBackend({ to, assets: lastPickedDocAssets });
                    Alert.alert(t('cloud.emailSentTitle'), t('cloud.emailSentBody'));
                  } else {
                    await composeEmailWithAttachments({ to, assets: lastPickedDocAssets });
                  }
                  setDocEmailModalOpen(false);
                } catch (e) {
                  Alert.alert(t('chat.errorTitle'), e?.message || t('cloud.emailSendError'));
                } finally {
                  setDocEmailSending(false);
                }
              }}
            >
              <Text style={styles.groupModalCreateBtnText}>
                {docEmailSending ? t('cloud.emailSending') : t('cloud.emailSendCta')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Azioni composer: Risposta a voce, Allegati, Fotocamera */}
      <Modal
        visible={composerActionsOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setComposerActionsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsPanel, { padding: 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.settingsTitle}>{t('chat.actionsTitle')}</Text>
              <TouchableOpacity
                onPress={() => setComposerActionsOpen(false)}
                accessibilityLabel={t('chat.actionsClose')}
              >
                <Text style={styles.closeModal}>{t('chat.actionsClose')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuEntryRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setVoiceReplyMode((v) => {
                  const next = !v;
                  AsyncStorage.setItem(STORAGE_KEYS.VOICE_REPLY_MODE, next ? 'true' : 'false').catch(() => {});
                  return next;
                });
              }}
              accessibilityLabel={voiceReplyMode ? t('chat.voiceReplyOn') : t('chat.voiceReplyOff')}
            >
              <FontAwesome name="volume-up" size={20} color={voiceReplyMode ? '#c5a059' : '#888'} />
              <Text style={styles.settingsRowText}>{voiceReplyMode ? t('chat.voiceReplyOn') : t('chat.voiceReplyOff')}</Text>
              <FontAwesome name={voiceReplyMode ? 'toggle-on' : 'toggle-off'} size={24} color={voiceReplyMode ? '#c5a059' : '#666'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuEntryRow, { marginTop: 10 }, !effectiveFlags.vision && { opacity: 0.6 }]}
              onPress={async () => {
                setComposerActionsOpen(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (effectiveFlags.vision) {
                  await handleCameraVision();
                } else {
                  onLockedFeatureTap();
                }
              }}
              accessibilityLabel={t('chat.visionLabel')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FontAwesome name="camera" size={20} color="#c5a059" />
                {!effectiveFlags.vision ? <FontAwesome name="lock" size={12} color="#c5a059" /> : null}
              </View>
              <Text style={styles.settingsRowText}>{t('chat.visionLabel')}</Text>
              <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuEntryRow, { marginTop: 10 }]}
              onPress={async () => {
                if (docPickerLoading) return;
                setComposerActionsOpen(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await pickDocsAndSendToAi(inputMessage.trim() || t('cloud.docDefaultQuery'), { openEmailFlow: false });
              }}
              disabled={docPickerLoading}
              accessibilityLabel={t('cloud.docButtonLabel')}
            >
              <FontAwesome name="file-text-o" size={20} color="#c5a059" />
              <Text style={styles.settingsRowText}>{t('cloud.docButtonLabel')}</Text>
              <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuEntryRow, { marginTop: 10 }, (docPickerLoading || docEmailSending) && styles.disabledBtn]}
              onPress={async () => {
                if (docPickerLoading || docEmailSending) return;
                setComposerActionsOpen(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (Array.isArray(lastPickedDocAssets) && lastPickedDocAssets.length > 0) {
                  openDocEmailModal();
                  return;
                }
                await pickDocsAndSendToAi(inputMessage.trim() || t('cloud.docDefaultQuery'), { openEmailFlow: true });
              }}
              disabled={docPickerLoading || docEmailSending}
              accessibilityLabel={t('cloud.emailButtonLabel')}
            >
              <FontAwesome name="envelope-o" size={20} color="#c5a059" />
              <Text style={styles.settingsRowText}>{t('cloud.emailButtonLabel')}</Text>
              <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setComposerActionsOpen(false)}
              style={[styles.toggleBtn, { marginTop: 14 }]}
              accessibilityLabel={t('chat.actionsCancel')}
            >
              <Text style={styles.toggleText}>{t('chat.actionsCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menu messaggio (long-press stile WhatsApp): Copia, Inoltra, Condividi */}
      <Modal
        visible={messageMenuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMessageMenu}
      >
        <Pressable style={styles.messageMenuOverlay} onPress={closeMessageMenu}>
          <Pressable style={styles.messageMenuSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.messageMenuHandle} />
            <TouchableOpacity
              style={styles.messageMenuItem}
              onPress={handleCopyMessage}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
              <Text style={styles.messageMenuLabel}>{t('chat.messageMenu.copy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageMenuItem}
              onPress={handleForwardMessage}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-redo-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
              <Text style={styles.messageMenuLabel}>{t('chat.messageMenu.forward')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageMenuItem}
              onPress={handleShareMessage}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
              <Text style={styles.messageMenuLabel}>{t('chat.messageMenu.share')}</Text>
            </TouchableOpacity>
            {selectedMessageFromBot ? (
              <>
                <TouchableOpacity
                  style={styles.messageMenuItem}
                  onPress={handleSaveAsGoal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
                  <Text style={styles.messageMenuLabel}>{t('chat.messageMenu.saveGoal')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.messageMenuItem}
                  onPress={handleRememberThis}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bookmark-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
                  <Text style={styles.messageMenuLabel}>{t('chat.messageMenu.remember')}</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <View style={styles.messageMenuDivider} />
            <TouchableOpacity
              style={[styles.messageMenuItem, styles.messageMenuCancel]}
              onPress={closeMessageMenu}
              activeOpacity={0.7}
            >
              <Text style={styles.messageMenuCancelLabel}>{t('chat.messageMenu.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Contenuto principale — Solo Logo, Utente e nuvola messaggi (solo native; su web è dentro lo ScrollView sopra) */}
      {Platform.OS !== 'web' && (viewAttiva === 'chat' ? (
        <View style={[styles.chatContainer, { backgroundColor: 'transparent' }]} collapsable={false}>
          <View style={styles.bollaKeyboardWrap}>
            <View style={styles.mainCard}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatList}
                contentContainerStyle={styles.chatListContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                {showQuickStart ? (
                  <View style={styles.quickStartCard}>
                    <Text style={styles.quickStartTitle}>{quickStartLabels.title}</Text>
                    <Text style={styles.quickStartSubtitle}>{quickStartLabels.subtitle}</Text>
                    <View style={styles.quickStartGrid}>
                      <TouchableOpacity style={styles.quickStartBtn} onPress={() => activateQuickStart('study', { replaceText: true })} activeOpacity={0.85}>
                        <FontAwesome name="graduation-cap" size={16} color="#c5a059" />
                        <Text style={styles.quickStartBtnText}>{quickStartLabels.study}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickStartBtn} onPress={() => activateQuickStart('work', { replaceText: true })} activeOpacity={0.85}>
                        <FontAwesome name="briefcase" size={16} color="#c5a059" />
                        <Text style={styles.quickStartBtnText}>{quickStartLabels.work}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickStartBtn} onPress={() => activateQuickStart('wellbeing', { replaceText: true })} activeOpacity={0.85}>
                        <FontAwesome name="heart" size={16} color="#c5a059" />
                        <Text style={styles.quickStartBtnText}>{quickStartLabels.wellbeing}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickStartBtn} onPress={() => activateQuickStart('briefing', { replaceText: true })} activeOpacity={0.85}>
                        <FontAwesome name="bolt" size={16} color="#c5a059" />
                        <Text style={styles.quickStartBtnText}>{quickStartLabels.briefing}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
                {messagesToShow.map((m) => {
                  const isUser = m.tipo === 'user';
                  const senderLabel = isUser ? t('chat.youLabel') : effectiveAiName;
                  const timeStr = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString(getLocaleForLanguage(language), { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const msgText = m.testo || '';
                  const isWelcomeStyle = m.tipo === 'bot' && (m.id === '1' || m.id === 'session_welcome');
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperBot]}
                      onLongPress={() => openMessageMenu(msgText, !isUser)}
                      delayLongPress={400}
                    >
                      <View style={styles.msgMetaRow}>
                        <Text style={[styles.msgMetaText, { color: isUser ? '#b0b0c0' : 'rgba(197,160,89,0.9)' }]}>
                          {senderLabel}{timeStr ? ` • ${timeStr}` : ''}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.msgBubble,
                          isUser ? styles.msgBubbleUser : styles.msgBubbleBot,
                        ]}
                      >
                        <Text
                          style={[
                            styles.msgText,
                            { textAlign: isUser ? 'right' : 'left' },
                            isWelcomeStyle ? { fontStyle: 'italic', color: '#c5a059' } : {},
                          ]}
                        >
                          {m.testo}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Super-Barra: unica barra input — zIndex e sfondo solido per evitare sdoppiamento */}
            <View style={styles.footerPanelSafeArea} collapsable={false}>
              {stickyBadge ? (
                <View style={styles.stickyBadgeChipWrap}>
                  <Text style={styles.stickyBadgeChipLabel} numberOfLines={1}>{t('chat.modeLabel')} {stickyBadge.label}</Text>
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStickyBadge(null); }}
                    style={styles.stickyBadgeChipExit}
                    accessibilityLabel={t('chat.exitMode')}
                  >
                    <Text style={styles.stickyBadgeChipExitText}>{t('chat.exitModeText')}</Text>
                    <FontAwesome name="times" size={12} color="rgba(197,160,89,0.9)" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              ) : null}
              {isRecording ? (
                <View style={styles.recordingBarWrap}>
                  <View style={styles.recordingBarDot} />
                  <Text style={styles.recordingBarText}>
                    {t('chat.recordingLabel')} {recordingDuration > 0 ? `${Math.floor(recordingDuration / 60)}:${String(recordingDuration % 60).padStart(2, '0')}` : '0:00'}
                  </Text>
                  <Text style={styles.recordingBarHint}>{t('chat.recordingHint')}</Text>
                </View>
              ) : null}
              {freeLimitReached ? (
                <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(197,160,89,0.15)', borderTopWidth: 1, borderTopColor: 'rgba(197,160,89,0.3)' }}>
                  <Text style={{ color: '#c5a059', fontSize: 13 }}>{SHOW_UPGRADE ? t('billing.limitReachedMessage') : t('billing.limitReachedShareMessage')}</Text>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); SHOW_UPGRADE ? openMenuToSubscription() : shareOxyForDiscount(); }}
                    style={{ marginTop: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#c5a059', borderRadius: 8, alignSelf: 'flex-start' }}
                  >
                    <Text style={{ color: '#0a0a0a', fontWeight: '600', fontSize: 14 }}>{SHOW_UPGRADE ? t('billing.upgradeNow') : t('shareOxy.button')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.superBar} collapsable={false}>
                <TouchableOpacity
                  style={[styles.superBarCamera, styles.superBarPlus]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setComposerActionsOpen(true);
                  }}
                  accessibilityLabel={t('chat.actionsLabel')}
                >
                  <FontAwesome name="plus" size={22} color="#c5a059" />
                </TouchableOpacity>
                <TextInput
                  ref={chatInputRef}
                  style={styles.superBarInput}
                  placeholder={t('chat.inputPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.38)"
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  maxLength={MAX_MESSAGE_LENGTH}
                  multiline
                  selectionColor="#c5a059"
                  onFocus={() => {
                    scrollViewRef.current?.scrollToEnd?.({ animated: true });
                    setTimeout(() => scrollViewRef.current?.scrollToEnd?.({ animated: true }), 150);
                    if (Platform.OS === 'android') setTimeout(() => scrollViewRef.current?.scrollToEnd?.({ animated: true }), 400);
                  }}
                  onSubmitEditing={() => {
                    if (inputMessage.trim() && !isSendBlocked) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      sendMessage();
                    }
                  }}
                  onKeyPress={(e) => {
                    const { key, shiftKey } = e?.nativeEvent || {};
                    if (key === 'Enter' && !shiftKey && inputMessage.trim() && !isSendBlocked) {
                      e.preventDefault?.();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      sendMessage();
                    }
                  }}
                />
                        {staCaricando ? (
                          <TouchableOpacity
                            style={[styles.superBarSend, styles.superBarStop]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              userRequestedStopRef.current = true;
                              chatAbortControllerRef.current?.abort();
                            }}
                            accessibilityLabel={t('chat.stopResponseLabel')}
                          >
                            <FontAwesome name="stop" size={18} color="#0a0a0a" />
                            <Text style={styles.superBarStopText}>{t('chat.stopButton')}</Text>
                          </TouchableOpacity>
                        ) : sendInCooldown ? (
                          <View style={[styles.superBarSend, { opacity: 0.6, justifyContent: 'center', alignItems: 'center', minWidth: 44 }]}>
                            <ActivityIndicator size="small" color="#0a0a0a" />
                          </View>
                        ) : inputMessage.trim() ? (
                          <TouchableOpacity
                            style={styles.superBarSend}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              sendMessage();
                            }}
                            disabled={isSendBlocked}
                            accessibilityLabel={t('chat.sendLabel')}
                          >
                            <FontAwesome name="send" size={18} color="#0a0a0a" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.superBarMic, isRecording && styles.micButtonActive]}
                            onPressIn={handleMicPressInOnly}
                            onPressOut={handleMicPressOutOnly}
                            activeOpacity={1}
                            accessibilityLabel={t('chat.holdToTalkLabel')}
                          >
                            <LinearGradient
                              colors={isRecording ? ['#b03030', '#8b2020'] : ['#c5a059', '#a08040']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.micGradient}
                            >
                              <FontAwesome name="microphone" size={18} color="#fff" />
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
        // Vista Cloud Management (accessibile dal menu)
        <View style={[styles.mainCard, { padding: 0 }]}>
          <TouchableOpacity
            style={styles.cloudBackBar}
            onPress={() => {
              setViewAttiva('chat');
              setSorgenteSelezionata(null);
              setCloudImportOpen(false);
              setCloudImportPayload('');
            }}
            accessibilityLabel="Torna alla chat"
            accessibilityRole="button"
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <FontAwesome name="chevron-left" size={22} color="#c5a059" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.cloudHeader}>
              <Text style={styles.cloudTitle}>{t('cloud.title')}</Text>
              <Text style={[styles.cloudSubtitle, { color: '#c5a059', marginTop: 4 }]}>{t('cloud.comingSoon')}</Text>
              <Text style={styles.cloudSubtitle}>
                {t('cloud.subtitleComingSoon')}
              </Text>
            </View>

            <View style={styles.sorgentiGrid}>
              <TouchableOpacity
                style={[
                  styles.sorgenteCard,
                  sorgenteSelezionata === 'drive' && styles.sorgenteCardActive,
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSorgenteSelezionata('drive'); setCloudImportOpen(false); }}
              >
                <DriveIcon active={sorgenteSelezionata === 'drive'} />
                <Text
                  style={[
                    styles.sorgenteLabel,
                    sorgenteSelezionata === 'drive' && styles.sorgenteLabelActive,
                  ]}
                >
                  {t('cloud.drive')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sorgenteCard,
                  sorgenteSelezionata === 'icloud' && styles.sorgenteCardActive,
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSorgenteSelezionata('icloud'); setCloudImportOpen(false); }}
              >
                <ICloudIcon active={sorgenteSelezionata === 'icloud'} />
                <Text
                  style={[
                    styles.sorgenteLabel,
                    sorgenteSelezionata === 'icloud' && styles.sorgenteLabelActive,
                  ]}
                >
                  {t('cloud.icloud')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sorgenteCard,
                  sorgenteSelezionata === 'locale' && styles.sorgenteCardActive,
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSorgenteSelezionata('locale'); }}
              >
                <LocalIcon active={sorgenteSelezionata === 'locale'} />
                <Text
                  style={[
                    styles.sorgenteLabel,
                    sorgenteSelezionata === 'locale' && styles.sorgenteLabelActive,
                  ]}
                >
                  {t('cloud.local')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sorgenteCard,
                  sorgenteSelezionata === 'server' && styles.sorgenteCardActive,
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSorgenteSelezionata('server'); setCloudImportOpen(false); }}
              >
                <ServerIcon active={sorgenteSelezionata === 'server'} />
                <Text
                  style={[
                    styles.sorgenteLabel,
                    sorgenteSelezionata === 'server' && styles.sorgenteLabelActive,
                  ]}
                >
                  {t('cloud.server')}
                </Text>
              </TouchableOpacity>
            </View>

            {(sorgenteSelezionata === 'drive' || sorgenteSelezionata === 'icloud') && (
              <View style={styles.configPanel}>
                <Text style={[styles.configTitle, { color: '#d1d1d1' }]}>
                  {sorgenteSelezionata === 'drive' ? t('cloud.drive') : t('cloud.icloud')}
                </Text>
                <Text style={[styles.cloudSubtitle, { textAlign: 'center' }]}>{t('cloud.sourceComingSoon')}</Text>
                <TouchableOpacity
                  style={[styles.saveConfigBtn, { marginTop: 14 }, cloudLocalExporting && styles.disabledBtn]}
                  onPress={handleExportLocalBackup}
                  disabled={cloudLocalExporting}
                >
                  <Text style={styles.saveConfigBtnText}>
                    {cloudLocalExporting
                      ? t('cloud.backupExporting')
                      : t('cloud.exportBackupToProviderButton', { provider: (sorgenteSelezionata === 'drive' ? 'Google Drive' : 'iCloud') })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ctaBtn, { marginTop: 12 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setViewAttiva('chat');
                    setSorgenteSelezionata(null);
                    setInputMessage(t('cloud.askOxyPrefill'));
                    setTimeout(() => chatInputRef.current?.focus?.(), 80);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ctaBtnText}>{t('cloud.askOxyCta')}</Text>
                  <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                </TouchableOpacity>
              </View>
            )}

            {sorgenteSelezionata === 'locale' && (
              <View style={styles.configPanel}>
                <Text style={[styles.configTitle, { color: '#d1d1d1' }]}>{t('cloud.localBackupTitle')}</Text>
                <Text style={[styles.cloudSubtitle, { textAlign: 'center' }]}>{t('cloud.localBackupHint')}</Text>
                <TouchableOpacity
                  style={[styles.saveConfigBtn, cloudLocalExporting && styles.disabledBtn]}
                  onPress={handleExportLocalBackup}
                  disabled={cloudLocalExporting}
                >
                  <Text style={styles.saveConfigBtnText}>
                    {cloudLocalExporting ? t('cloud.backupExporting') : t('cloud.exportBackupButton')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.ctaBtnSecondary, { marginTop: 12 }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCloudImportOpen((v) => !v); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ctaBtnText}>{t('cloud.importBackupButton')}</Text>
                  <FontAwesome name={cloudImportOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#c5a059" />
                </TouchableOpacity>

                {cloudImportOpen ? (
                  <View style={{ marginTop: 12 }}>
                    <TextInput
                      style={[styles.settingsInputInline, { minHeight: 120, textAlignVertical: 'top' }]}
                      placeholder={t('cloud.importBackupPlaceholder')}
                      placeholderTextColor="#888"
                      value={cloudImportPayload}
                      onChangeText={setCloudImportPayload}
                      multiline
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={[styles.ctaBtn, { marginTop: 10 }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleImportLocalBackup(); }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.ctaBtnText}>{t('cloud.importBackupApplyButton')}</Text>
                      <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.ctaBtnSecondary, { marginTop: 14, borderColor: 'rgba(197,160,89,0.35)' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(
                      t('cloud.clearChatCacheConfirmTitle'),
                      t('cloud.clearChatCacheConfirmBody'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.ok'), onPress: () => clearLocalChatCacheAndReload() },
                      ]
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ctaBtnText}>{t('cloud.clearChatCacheBtn')}</Text>
                  <FontAwesome name="trash" size={14} color="#c5a059" />
                </TouchableOpacity>
              </View>
            )}

            {sorgenteSelezionata === 'server' && (
              <View style={styles.configPanel}>
                <Text style={[styles.configTitle, { color: '#d1d1d1' }]}>{t('cloud.serverConfigTitle')}</Text>
                <TextInput
                  style={styles.configInput}
                  placeholder={t('cloud.serverHostPlaceholder')}
                  value={serverConfig.host}
                  onChangeText={(v) => setServerConfig({ ...serverConfig, host: v })}
                />
                <TextInput
                  style={styles.configInput}
                  placeholder={t('cloud.serverUsernamePlaceholder')}
                  value={serverConfig.username}
                  onChangeText={(v) => setServerConfig({ ...serverConfig, username: v })}
                />
                <TextInput
                  style={styles.configInput}
                  placeholder={t('cloud.serverTokenPlaceholder')}
                  secureTextEntry
                  value={serverConfig.token}
                  onChangeText={(v) => setServerConfig({ ...serverConfig, token: v })}
                />
                <TouchableOpacity
                  style={[styles.saveConfigBtn, cloudServerTesting && styles.disabledBtn]}
                  onPress={handleCloudServerConnect}
                  disabled={cloudServerTesting}
                >
                  <Text style={styles.saveConfigBtnText}>
                    {cloudServerTesting ? t('cloud.serverTesting') : t('cloud.serverConnectButton')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      ))}

        </View>
    </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Stili aggiornati e ottimizzati
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  loadingSafe: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: '#b71c1c',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 13,
  },
  loadingText: {
    color: '#d1d1d1',
    marginTop: 20,
    fontSize: 18,
    fontWeight: '500',
  },
  loginContainer: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
    overflow: 'visible',
  },
  otpScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
    paddingBottom: 100,
    overflow: 'visible',
  },
  brand: {
    color: '#c5a059',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandItalic: {
    fontWeight: '300',
    fontStyle: 'italic',
  },
  mottoLogin: {
    color: '#c5a059',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  brandTagline: {
    color: '#c5a059',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  socialBigBtn: {
    width: '100%',
    height: 58,
    backgroundColor: '#c5a059',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#c5a059',
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    color: '#0a0a0a',
    fontSize: 24,
    fontWeight: 'bold',
  },
  socialBigText: {
    color: '#0a0a0a',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  maskedInfo: {
    color: '#c5a059',
    fontSize: 13,
    marginTop: 4,
  },
  sepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
    width: '100%',
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sepText: {
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 20,
    fontSize: 14,
  },
  loginInput: {
    width: '100%',
    height: 54,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 20,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  loginBtn: {
    backgroundColor: '#c5a059',
    width: '100%',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#0a0a0a',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  minimalForgotBtn: {
    alignSelf: 'center',
    marginVertical: 16,
  },
  minimalForgotText: {
    color: 'rgba(197,160,89,0.8)',
    fontSize: 13,
  },
  linkRegText: {
    color: '#c5a059',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  regModal: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 30,
    paddingTop: 60,
  },
  regHeader: {
    color: '#d1d1d1',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  regInput: {
    width: '100%',
    height: 54,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 18,
    color: '#d1d1d1',
    marginBottom: 16,
    fontSize: 15,
  },
  passwordHint: {
    color: 'rgba(197,160,89,0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  ctaRegBtn: {
    backgroundColor: '#c5a059',
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  ctaRegBtnText: {
    color: '#0a0a0a',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  backLogin: {
    color: '#c5a059',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 20,
  },
  // Header e main (container flex: 1 così header + chat riempiono lo schermo e niente taglio in alto su web/desktop)
  container: {
    flex: 1,
    backgroundColor: '#002b4d',
  },
  chatContainer: {
    flex: 1,
    // Sfondo chat in stile piani sito: blu profondo con leggero glow
    backgroundColor: 'transparent',
    ...(Platform.OS !== 'web'
      ? { backgroundColor: 'transparent' }
      : {}),
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  headerWebFixed: {
    ...(Platform.OS === 'web' ? { backgroundColor: '#002b4d', flexShrink: 0 } : {}),
  },
  chatAreaWebWrap: {
    ...(Platform.OS === 'web' ? { flex: 1, minHeight: 0 } : {}),
  },
  headerLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'visible',
  },
  headerSpacer: {
    flex: 1,
  },
  realIdentitySub: {
    color: '#c5a059',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    textTransform: 'lowercase',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'visible',
  },
  profileIconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Menu unico (doppia linguetta)
  menuModalOverlay: {
    flex: 1,
    backgroundColor: '#002b4d',
  },
  menuModalSafe: {
    flex: 1,
  },
  menuModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197,160,89,0.3)',
  },
  menuModalTitle: {
    color: '#c5a059',
    fontSize: 20,
    fontWeight: '800',
  },
  menuTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  menuTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#c5a059',
  },
  menuTabText: {
    color: '#d1d1d1',
    fontSize: 15,
    fontWeight: '600',
  },
  menuTabTextActive: {
    color: '#c5a059',
    fontWeight: '700',
  },
  menuTabScroll: {
    flex: 1,
    minHeight: 0,
  },
  menuSettingsContent: {
    padding: 20,
    paddingBottom: 40,
  },
  menuBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  menuBackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
    minHeight: 48,
  },
  toggleBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    color: 'rgba(197,160,89,0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  menuSubTitle: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  menuSectionBlock: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  menuEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  settingsSectionTitle: {
    color: '#c5a059',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  activePlanBox: {
    borderWidth: 1,
    borderColor: '#c5a059',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(197,160,89,0.06)',
  },
  billingPlanCard: {
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.35)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(0,43,77,0.6)',
  },
  billingPlanCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(197,160,89,0.9)',
    marginBottom: 10,
  },
  settingsInputInline: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
  },
  voiceOptionCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceOptionCardActive: {
    borderColor: '#c5a059',
    backgroundColor: 'rgba(197,160,89,0.12)',
  },
  voiceOptionLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  voiceOptionDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  voiceProvaBtn: {
    backgroundColor: '#c5a059',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  voiceProvaBtnDisabled: {
    opacity: 0.7,
  },
  voiceProvaBtnText: {
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: '600',
  },
  logoText: {
    color: '#c5a059',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandMain: {
    color: '#c5a059',
    fontSize: 38,
    fontWeight: '900',
  },
  mottoSubMain: {
    color: '#c5a059',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.8,
    marginTop: 4,
  },
  hamburgerWrap: {
    position: 'relative',
  },
  hamburger: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  updatedDot: {
    position: 'absolute',
    top: 8,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
  },
  hamLine: {
    width: 32,
    height: 3,
    backgroundColor: '#c5a059',
    borderRadius: 2,
  },
  profileSection: {
    marginTop: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 68,
    height: 68,
    position: 'relative',
  },
  avatarFrame: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#c5a059',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#00E676',
    borderWidth: 2,
    borderColor: '#c5a059',
  },
  userInfoText: {
    marginLeft: 16,
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: '#d1d1d1',
    fontSize: 24,
    fontWeight: '700',
  },
  welcomeText: {
    color: '#c5a059',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
    maxWidth: '100%',
  },
  cloudBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cloudBtnText: {
    color: '#d1d1d1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bollaKeyboardWrap: {
    flex: 1,
    minHeight: 0,
  },
  mainCard: {
    backgroundColor: '#121212',
    flex: 1,
    marginTop: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.35)',
    overflow: 'hidden',
  },
  modContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#c5a059',
  },
  modBadge: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  modActive: {
    backgroundColor: 'rgba(197,160,89,0.2)',
    borderColor: '#c5a059',
  },
  modInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSectionLabel: {
    color: '#d1d1d1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  modalModContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  msgWrapper: {
    marginBottom: 18,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: SCREEN_WIDTH * 0.85,
  },
  msgWrapperUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 8,
  },
  msgWrapperBot: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgMetaRow: {
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  msgMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b0b0c0',
  },
  msgBubble: {
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '100%',
  },
  msgBubbleUser: {
    backgroundColor: 'rgba(197,160,89,0.15)',
    borderColor: 'rgba(197,160,89,0.5)',
    borderBottomLeftRadius: 4,
  },
  msgBubbleBot: {
    backgroundColor: '#1a1a1a',
    borderColor: 'rgba(197,160,89,0.3)',
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#d1d1d1',
  },
  bollaFooterSafe: {
    backgroundColor: 'transparent',
  },
  bollaFooter: {
    backgroundColor: '#000000',
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197,160,89,0.2)',
  },
  footerPanelSafeArea: {
    backgroundColor: '#002b4d',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 4,
    zIndex: 9999,
    elevation: 9999,
  },
  stickyBadgeChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(197,160,89,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.25)',
  },
  stickyBadgeChipLabel: {
    fontSize: 12,
    color: 'rgba(197,160,89,0.95)',
    flex: 1,
  },
  stickyBadgeChipExit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
  },
  stickyBadgeChipExitText: {
    fontSize: 11,
    color: 'rgba(197,160,89,0.9)',
  },
  footerPanel: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    marginHorizontal: 0,
  },
  superBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,43,77,0.95)',
    zIndex: 9999,
    elevation: 9999,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 10,
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
    minHeight: 40,
  },
  superBarCamera: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  superBarPlus: {
    marginRight: 4,
  },
  superBarCameraRight: {
    marginRight: 2,
  },
  superBarInput: {
    flex: 1,
    color: '#d1d1d1',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    fontSize: 16,
    lineHeight: 20,
    minHeight: 32,
    maxHeight: 86,
    textAlignVertical: 'center',
  },
  superBarSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#c5a059',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    flexShrink: 0,
  },
  superBarStop: {
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  superBarStopText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  superBarMic: {
    marginLeft: 6,
    flexShrink: 0,
  },
  micButton: {
    marginLeft: 8,
  },
  micGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: 'rgba(197,160,89,0.6)',
    borderRadius: 22,
  },
  recordingBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,43,77,0.85)',
    borderLeftWidth: 4,
    borderLeftColor: '#c5a059',
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 0,
  },
  recordingBarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#c5a059',
    marginRight: 10,
  },
  recordingBarText: {
    color: '#c5a059',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  recordingBarHint: {
    color: 'rgba(197,160,89,0.75)',
    fontSize: 12,
  },
  voiceReplyModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(197,160,89,0.15)',
    borderRadius: 8,
  },
  voiceReplyModeBadgeText: {
    color: '#c5a059',
    fontSize: 12,
    fontWeight: '600',
  },
  voiceReplyToggleActive: {
    backgroundColor: 'rgba(197,160,89,0.2)',
    borderRadius: 8,
  },
  voiceReplyToggleBtn: {
    padding: 4,
  },
  voiceReplyToggleBtnActive: {},
  input: {
    flex: 1,
    minHeight: 60,
    maxHeight: 120,
    backgroundColor: '#1e1e1e',
    color: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  terminaSessioneStrip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197,160,89,0.2)',
    backgroundColor: '#000000',
  },
  terminaSessioneBtnInCard: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  terminaSessioneTextInCard: {
    color: '#c5a059',
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  sendBtn: {
    backgroundColor: '#c5a059',
    flex: 0,
    minWidth: 72,
    height: 45,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  sendBtnText: {
    color: '#0a0a0a',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  terminaSessioneBtn: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 45,
    paddingVertical: 8,
  },
  terminaSessioneText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  terminaSessioneBtnModal: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 10,
  },
  terminaSessioneTextModal: {
    color: '#ff6b6b',
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // Cloud styles (rimasti simili ma ottimizzati)
  cloudBackBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cloudBackBtnText: {
    color: '#c5a059',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cloudBackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  cloudBackBarText: {
    color: '#c5a059',
    fontSize: 15,
    fontWeight: '600',
  },
  cloudHeader: {
    padding: 28,
    paddingBottom: 12,
  },
  cloudTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#d1d1d1',
  },
  cloudSubtitle: {
    fontSize: 15,
    color: '#d1d1d1',
    marginTop: 4,
    opacity: 0.9,
  },
  sorgentiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  sorgenteCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    paddingVertical: 28,
    borderRadius: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sorgenteCardActive: {
    borderColor: '#c5a059',
    borderWidth: 2.5,
    backgroundColor: 'rgba(197,160,89,0.15)',
  },
  sorgenteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 12,
  },
  sorgenteLabelActive: {
    color: '#c5a059',
    fontWeight: '700',
  },
  iconContainer: {
    height: 36,
    justifyContent: 'center',
  },
  driveTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  cloudCircle: {
    width: 24,
    height: 14,
    borderRadius: 12,
    borderWidth: 2.5,
  },
  cloudCircleSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    position: 'absolute',
    bottom: -2,
    backgroundColor: '#1a1a1a',
  },
  folderBody: {
    width: 28,
    height: 20,
    borderWidth: 2.5,
    borderRadius: 4,
  },
  folderTab: {
    width: 12,
    height: 5,
    position: 'absolute',
    top: -6,
    left: -2,
    borderTopLeftRadius: 3,
  },
  dbStack: {
    width: 26,
    height: 10,
    borderWidth: 2.5,
    borderRadius: 12,
  },
  configPanel: {
    margin: 24,
    padding: 28,
    backgroundColor: '#1a1a1a',
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  configInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 16,
  },
  saveConfigBtn: {
    backgroundColor: '#c5a059',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveConfigBtnText: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  // Power Badges modal (full screen, stesso blu chat #002b4d)
  powerBadgesOverlay: {
    flex: 1,
    backgroundColor: '#002b4d',
    justifyContent: 'flex-start',
  },
  powerBadgesContent: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#002b4d',
  },
  powerBadgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  powerBadgesTitle: {
    color: '#c5a059',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  powerBadgesCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptListContainer: {
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: 40,
  },
  // Azioni: contenuto scrollabile (niente flex:1 sul content così lo scroll funziona)
  menuActionsPanel: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 20,
  },
  menuActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 10,
  },
  // Griglia compatta: tutti i tasti a prima vista
  menuActionsGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
    columnGap: 6,
  },
  actionTile: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.22)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 86,
  },
  // Variante compatta per il menu Azioni (tutti i tasti visibili senza scroll)
  actionTileCompact: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.22)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 64,
  },
  actionTileIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(197,160,89,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTileIconWrapCompact: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(197,160,89,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  actionTileLabel: {
    color: '#d1d1d1',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionTileLabelCompact: {
    color: '#d1d1d1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionTileHint: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
  },
  actionTileHintCompact: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    lineHeight: 12,
    marginTop: 2,
  },
  modeChipsScroll: {
    marginTop: 2,
  },
  modeChipsRow: {
    paddingRight: 16,
    gap: 8,
    paddingBottom: 6,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modeChipActive: {
    backgroundColor: 'rgba(197,160,89,0.14)',
    borderColor: 'rgba(197,160,89,0.35)',
  },
  modeChipAll: {
    borderColor: 'rgba(197,160,89,0.30)',
    backgroundColor: 'rgba(197,160,89,0.08)',
  },
  modeChipText: {
    color: '#d1d1d1',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 160,
  },
  quickStartCard: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.22)',
    padding: 14,
    marginBottom: 14,
  },
  quickStartTitle: {
    color: '#c5a059',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  quickStartSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  quickStartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickStartChipsScroll: {
    paddingHorizontal: 6,
  },
  quickStartChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    paddingRight: 6,
  },
  quickStartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  quickStartChipActive: {
    backgroundColor: 'rgba(197,160,89,0.14)',
    borderColor: 'rgba(197,160,89,0.35)',
  },
  quickStartChipText: {
    color: '#d1d1d1',
    fontSize: 12,
    fontWeight: '700',
  },
  quickStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexBasis: '48%',
    flexGrow: 1,
  },
  quickStartBtnText: {
    color: '#d1d1d1',
    fontSize: 13,
    fontWeight: '700',
  },
  menuHintText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.25)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  promptRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(197,160,89,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promptRowLabel: {
    flex: 1,
    color: '#d1d1d1',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  memoryVaultSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.25)',
  },
  memoryVaultNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  memoryVaultNoteTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  memoryVaultSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  memoryVaultSectionTitle: {
    color: '#c5a059',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  memoryVaultClearBtn: {
    padding: 6,
  },
  memoryVaultText: {
    color: '#d1d1d1',
    fontSize: 15,
    lineHeight: 22,
  },
  memoryVaultErrorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  memoryVaultErrorText: {
    color: '#d1d1d1',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  memoryVaultRetryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(197,160,89,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.5)',
  },
  memoryVaultRetryBtnText: {
    color: '#c5a059',
    fontSize: 16,
    fontWeight: '700',
  },
  memoryVaultEmpty: {
    color: '#888',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  powerBadgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: MODES_GRID_GAP,
  },
  powerBadgeCardCompact: {
    width: MODES_CARD_WIDTH,
    minHeight: 76,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(197,160,89,0.5)',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerBadgeIconWrapCompact: {
    marginBottom: 6,
  },
  powerBadgeLabelCompact: {
    color: '#d1d1d1',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  // Diario: barra input+salva deve stare sopra la navbar Android
  diaryComposerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 72 : 36,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197,160,89,0.2)',
  },
  powerBadgeCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    minHeight: 120,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#c5a059',
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerBadgeIconWrap: {
    marginBottom: 10,
  },
  powerBadgeLabel: {
    color: '#d1d1d1',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  createGroupCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(197,160,89,0.4)',
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  createGroupLabel: {
    color: '#d1d1d1',
    fontSize: 15,
    fontWeight: '700',
  },
  groupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  groupModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#002b4d',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.3)',
  },
  groupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  groupModalTitle: {
    color: '#c5a059',
    fontSize: 20,
    fontWeight: '800',
  },
  groupModalClose: {
    padding: 6,
  },
  groupModalInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.3)',
  },
  groupModalSectionLabel: {
    color: 'rgba(197,160,89,0.9)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  groupModalAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#c5a059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupMembersList: {
    marginBottom: 20,
  },
  groupMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  groupMemberEmail: {
    color: '#d1d1d1',
    fontSize: 14,
    flex: 1,
  },
  groupModalCreateBtn: {
    backgroundColor: '#c5a059',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  groupModalCreateBtnText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '800',
  },
  messageMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  messageMenuSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  messageMenuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,215,0,0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  messageMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  messageMenuIcon: {
    marginRight: 14,
  },
  messageMenuLabel: {
    color: '#e8e8e8',
    fontSize: 16,
    fontWeight: '600',
  },
  messageMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 6,
    marginHorizontal: 8,
  },
  messageMenuCancel: {
    justifyContent: 'center',
  },
  messageMenuCancelLabel: {
    color: '#b0b0c0',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal settings (profilo)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  settingsPanel: {
    backgroundColor: '#0a0a0a',
    padding: 28,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  settingsTitle: {
    color: '#d1d1d1',
    fontSize: 22,
    fontWeight: '700',
  },
  closeModal: {
    color: '#c5a059',
    fontSize: 16,
    fontWeight: '600',
  },
  firstLaunchLanguageWrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  firstLaunchLanguageTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  firstLaunchLanguageSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },
  firstLaunchLanguageOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  firstLaunchLanguageOptionActive: {
    backgroundColor: 'rgba(197,160,89,0.2)',
    borderColor: '#c5a059',
  },
  firstLaunchLanguageOptionText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  firstLaunchLanguageOptionTextActive: {
    color: '#c5a059',
    fontWeight: '700',
  },
  firstLaunchLanguageConfirmButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#c5a059',
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstLaunchLanguageConfirmButtonDisabled: {
    opacity: 0.5,
  },
  firstLaunchLanguageConfirmText: {
    color: '#0a0a0a',
    fontSize: 17,
    fontWeight: '700',
  },
  settingsRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  // CTA coerente (stesso colore gold, ma aspetto "button" e non "row")
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(197,160,89,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.30)',
  },
  ctaBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ctaBtnText: {
    flex: 1,
    color: '#c5a059',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
  // Community (modal)
  communityTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  communityTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityTabActive: {
    backgroundColor: 'rgba(197,160,89,0.12)',
    borderColor: 'rgba(197,160,89,0.35)',
  },
  communityTabText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '700',
  },
  communityTabTextActive: {
    color: '#c5a059',
  },
  communityScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  communityHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  communityRoomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  communityRoomTile: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
    minHeight: 108,
  },
  communityRoomIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(197,160,89,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  communityRoomTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  communityRoomSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  communityHelpTopicsWrap: {
    gap: 10,
  },
  communityHelpTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  communityHelpTopicText: {
    color: '#d1d1d1',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsRowText: {
    flex: 1,
    color: '#d1d1d1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 14,
  },
  settingsInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 18,
    color: '#d1d1d1',
    marginBottom: 16,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.3)',
  },
  saveBtnText: {
    color: '#c5a059',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 24,
  },
  modalLogoutBtn: {
    paddingVertical: 12,
  },
  modalLogoutText: {
    color: '#ff4d4d',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
  },
  successText: {
    color: '#00E676',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff4d4d',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
  twoFAPanel: {
    marginTop: 12,
  },
  twoFAText: {
    color: '#c5a059',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 15,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: '82%',
    backgroundColor: '#1a1a1a',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,160,89,0.3)',
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#c5a059',
    marginBottom: 12,
  },
  alertMsg: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  alertData: {
    fontWeight: '700',
    color: '#c5a059',
  },
  alertBtn: {
    backgroundColor: '#c5a059',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 16,
  },
  alertBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  appleIconWrapper: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleBody: {
    width: 16,
    height: 18,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  appleLeaf: {
    width: 7,
    height: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderBottomLeftRadius: 0,
    position: 'absolute',
    top: -3,
    right: 3,
    transform: [{ rotate: '30deg' }],
  },
  // OTP Screen Styles
  otpHeaderContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#d1d1d1',
    textAlign: 'center',
    marginBottom: 10,
  },
  otpSubtitle: {
    fontSize: 16,
    color: '#c5a059',
    textAlign: 'center',
    marginBottom: 30,
  },
  otpChannelContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpChannelBox: {
    width: '100%',
    minHeight: 80,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#c5a059',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  otpChannelLabel: {
    color: '#c5a059',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  otpButtonsContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  otpButton: {
    width: '100%',
    height: 60,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#c5a059',
    marginBottom: 12,
  },
  otpButtonText: {
    color: '#c5a059',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  otpInput: {
    width: '100%',
    height: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    fontSize: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#c5a059',
  },
  otpCodeContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(197,160,89,0.5)',
    color: '#c5a059',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpBoxFocused: {
    borderColor: '#c5a059',
    backgroundColor: '#1a1a1a',
  },
  otpSentText: {
    color: '#c5a059',
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  otpBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  otpBackText: {
    color: '#c5a059',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    textAlign: 'center',
  },
  otpResendButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpResendButtonDisabled: {
    opacity: 0.5,
  },
  otpResendText: {
    color: '#c5a059',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  otpResendTextDisabled: {
    color: '#999',
  },
});