import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
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
  Vibration,
  Dimensions,
  Animated,
  Share,
  Pressable,
  Clipboard,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; // npm install react-native-safe-area-context
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
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { signUpWithProfile, signOut } from './src/services/authService';
import { configureGoogleSignIn } from './src/services/socialAuthService';
import { auth } from './src/config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import AuthScreen from './src/screens/AuthScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { loadChatHistory, saveMessageToDb, saveToMemory, loadMemory, clearMemorySections, deleteMemoryNote } from './src/services/chatService';
import { callOxyAi, ABORTED_MESSAGE } from './src/services/aiService';
import { getAllFlags, fetchServerFlags, FEATURE_KEYS } from './src/services/featureFlagsService';
import { track, EVENTS } from './src/services/analyticsService';
import { loadDiary, saveDiaryEntry } from './src/services/diaryService';
import { loadStoryState, saveStoryState } from './src/services/storyService';
import { STORIES } from './src/data/stories';
import { PLANS, CURRENCY_DEFAULT } from './src/config/pricingConfig';
import { VOICE_OPTIONS, DEFAULT_VOICE_ID } from './src/data/voiceOptions';
import { transcribe } from './src/services/voiceService';
import { fetchTtsAudio } from './src/services/ttsService';
import * as FileSystem from 'expo-file-system/legacy';
import { getOxyKey, setOxyKey, removeOxyKey, isValidKeyFormat, getMasterKey, isMasterUser, getKeyForCurrentUser } from './src/services/oxyKeyService';

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
        reject(new Error('FileReader non disponibile'));
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
import * as ImagePicker from 'expo-image-picker';
import { getWelcomePhraseForHour, getHeaderPhraseForHour } from './src/utils/motivationalPhrases';
import CountryPicker, { DARK_THEME } from './src/components/CountryPickerAdapter';
import { translations, LANGUAGES, LANGUAGE_LABELS, t as translate } from './src/i18n/translations';
import { useNetInfo } from './src/hooks/useNetInfo';
import { legalContent } from './src/content/legalContent';

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
};

/** Nome predefinito dell'IA. Il cambio nome è un'opzione a pagamento (HAS_CUSTOM_AI_NAME_FEATURE). */
const DEFAULT_AI_NAME = 'OXY';
const HAS_CUSTOM_AI_NAME_FEATURE = false;

// Master/Admin: una sola fonte (EXPO_PUBLIC_MASTER_EMAIL) via isMasterUser in oxyKeyService

// Distribuzione: 'subscription' = abbonamento (Oxy Key nascosta, solo backend); 'one_time_purchase' = acquisto senza abbonamento (mostra Inserisci Oxy Key)
const APP_MODE = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_MODE || 'subscription').toLowerCase();
const SHOW_OXy_KEY_OPTION = APP_MODE === 'one_time_purchase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Chat di gruppo: max 4-5 partecipanti, ognuno deve avere Oxy Key configurata
const MAX_GROUP_MEMBERS = 5;

// Power Badges — prompt esatti per "Agisci come" (originali + intelligenza emotiva, routine, proattivo, personalità, planner, celebrazione)
const POWER_BADGES = [
  // Originali
  { id: 'social', label: 'SOCIAL TITAN', icon: 'share-alt', prompt: 'Agisci come un esperto di contenuti virali. Trasforma questa idea in un post magnetico: ' },
  { id: 'genius', label: 'GENIUS MODE', icon: 'code', prompt: 'Agisci come un ingegnere capo. Analizza questo problema e risolvilo: ' },
  { id: 'business', label: 'BUSINESS SHARK', icon: 'briefcase', prompt: 'Agisci come un predatore delle vendite. Scrivi un pitch aggressivo per: ' },
  { id: 'legal', label: 'LEGAL ARMOR', icon: 'gavel', prompt: 'Agisci come un avvocato d\'affari. Analizza i rischi di questa situazione: ' },
  { id: 'ghost', label: 'GHOST WRITER', icon: 'pencil', prompt: 'Agisci come uno scrittore ombra d\'élite. Riscrivi questo testo in modo magnetico: ' },
  { id: 'diplomatic', label: 'DIPLOMATIC BLADE', icon: 'comments', prompt: 'Agisci come un esperto di comunicazione strategica. Scrivi una risposta impeccabile a una figura autoritaria (avvocato/medico/capo): ' },
  { id: 'gourmet', label: 'GOURMET VISION', icon: 'camera', prompt: 'Agisci come uno Chef stellato. Analizza questi ingredienti (o la foto del mio frigo) e proponimi una ricetta d\'eccellenza: ' },
  // Intelligenza emotiva
  { id: 'emotive', label: 'SUPPORTO EMOTIVO', icon: 'heart', prompt: 'Rileva il tono emotivo di quello che scrivo e rispondi in modo empatico e adattivo. Offri supporto emotivo senza giudizio: ' },
  // Routine e abitudini
  { id: 'routine', label: 'ROUTINE COACH', icon: 'repeat', prompt: 'Agisci come un coach delle abitudini. Suggerisci routine giornaliere personalizzate (es. meditazione mattutina, esercizi serali) basandoti sui miei obiettivi e su ciò che hai in memoria: ' },
  // Suggerimenti proattivi
  { id: 'proactive', label: 'SUGGERIMENTI PROATTIVI', icon: 'lightbulb-o', prompt: 'Quando rispondi, offri 1-2 suggerimenti personalizzati (esercizi, letture, attività) in base ai miei obiettivi e alle conversazioni passate. Sii proattivo ma non invadente: ' },
  // Livelli di personalizzazione (stile risposta)
  { id: 'optimist', label: 'OTTIMISTA', icon: 'smile-o', prompt: 'Rispondi sempre con un tono ottimista e costruttivo. Evidenzia possibilità e soluzioni, senza negare le difficoltà: ' },
  { id: 'analytic', label: 'ANALITICA', icon: 'bar-chart', prompt: 'Rispondi in modo analitico e strutturato: dati, pro/contro, passi chiari. Tono professionale e preciso: ' },
  { id: 'minimal', label: 'MINIMALISTA', icon: 'minus', prompt: 'Rispondi in modo essenziale e diretto. Poche parole, niente fronzoli. Solo il necessario: ' },
  { id: 'coach', label: 'COACH', icon: 'trophy', prompt: 'Agisci come un coach personale. Fai domande mirate, incoraggia l\'azione e aiuta a definire i prossimi passi concreti: ' },
  // Planner / Task (solo stile)
  { id: 'planner', label: 'PLANNER', icon: 'calendar', prompt: 'Agisci come un assistente alla pianificazione. Aiutami a organizzare giornata e impegni; se menziono date o task, strutturali in modo chiaro e actionable: ' },
  // Celebrazione / motivazione (tono gamification)
  { id: 'celebration', label: 'CELEBRAZIONE', icon: 'star', prompt: 'Quando parlo di progressi o traguardi, reagisci con entusiasmo e celebrazione. Sii il mio tifoso: incoraggia e riconosci ogni passo avanti: ' },
  // Marketing app (lancio e vendita). TODO: una volta definito tutto (OXY, fasce, badge), generalizzare questo prompt in un "prompt generale per il marketing" (rimuovere o parametrizzare riferimenti a OXY/Anima/Real Identity/Power Badges).
  { id: 'launch', label: 'LAUNCH COMMANDER', icon: 'rocket', prompt: 'Agisci come un super esperto di marketing per app mobile e subscription. La tua specialità: app come OXY — companion AI, valore emotivo, "Real Identity", memoria a lungo termine, abbonamento premium. Per ogni richiesta fornisci posizionamento chiaro, messaggio che converte, pubblico target, differenziazione vs chatbot generici, copy pronti (store: titolo/descrizione breve/lunga/keyword; social; email; pricing). Sii concreto e actionable: solo output utilizzabile. Considera sempre il payoff "Real Identity", il fatto che l\'app ricorda l\'utente e ha un tono amico (Anima), non assistente. Se chiedo come dividere le fasce di abbonamento (free/base/premium) o quali Power Badges (quali prompt/ funzionalità) includere o escludere per fascia per spingere l\'upgrade, fornisci una strategia chiara con suggerimenti concreti. Obiettivo: vendita e conversione. ' },
];

/** Limite lunghezza messaggio chat (audit 6.2, differenziato per modello commerciale)
 *  - subscription: 1500 caratteri (per contenere costi e favorire messaggi più compatti)
 *  - one_time_purchase: 8000 caratteri (utente usa la propria chiave, costi a suo carico)
 */
const MAX_MESSAGE_LENGTH = APP_MODE === 'subscription' ? 1500 : 8000;

// Avatar di default: require può fallire in alcuni ambienti Expo → fallback sicuro
let DEFAULT_AVATAR_SOURCE = null;
try {
  DEFAULT_AVATAR_SOURCE = require('./foto_ivan.jpg');
} catch (_) {}

// Validazione Regex (sicura e comune standard)
const VALIDATION = {
  // TLD minimo 2 caratteri alfabetici
  email: /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/,
  phone: /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[A-Za-z\s]{2,50}$/,
  date: /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d{2}$/,
};

// Validazione password con messaggi specifici (validazione "lazy" - solo al click)
const validatePasswordDetailed = (password) => {
  const errors = [];
  if (!password || password.trim().length === 0) {
    errors.push('La password non può essere vuota');
    return errors;
  }
  if (password.length < 8) {
    errors.push('La password deve avere almeno 8 caratteri');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Manca una lettera minuscola');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Manca una lettera maiuscola');
  }
  if (!/\d/.test(password)) {
    errors.push('Manca un numero');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Manca un simbolo (@$!%*?&)');
  }
  return errors;
};

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
const OxyLogo = ({ large, showTagline = true }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);
  const size = large ? 42 : 24;
  const spacing = large ? 4 : 3;
  return (
    <View style={{ alignSelf: 'center', alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }], flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap' }}>
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
          fontSize: size,
          fontStyle: 'italic',
          letterSpacing: spacing,
          marginLeft: 2,
        }}>
          Real
        </Text>
      </Animated.View>
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
  const [stickyBadge, setStickyBadge] = useState(null); // modalità "attiva": se l'utente risponde dopo la risposta dell'IA, si mantiene; altrimenti si torna al default
  const [testo, setTesto] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(45); // auto-expand multiline (min 45, max ~5-6 righe)
  const [messaggi, setMessaggi] = useState([
    { id: '1', tipo: 'bot', testo: getWelcomePhraseForHour() },
  ]);
  const [staCaricando, setStaCaricando] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef(null);
  const recordingRef = useRef(null);
  const initialMessageRequestedRef = useRef(false);
  const sendMessageRef = useRef(null);
  const chatAbortControllerRef = useRef(null);

  // Chat history per memorizzare scambi { role, content }
  const [chatHistory, setChatHistory] = useState([]);

  // Cloud / Server
  const [sorgenteSelezionata, setSorgenteSelezionata] = useState(null);
  const [serverConfig, setServerConfig] = useState({ host: '', username: '', token: '' });

  // Menu messaggio (long-press stile WhatsApp): Copia, Inoltra, Condividi, Salva come obiettivo, Ricordamelo
  const [messageMenuVisible, setMessageMenuVisible] = useState(false);
  const [selectedMessageText, setSelectedMessageText] = useState('');
  const [selectedMessageFromBot, setSelectedMessageFromBot] = useState(false);

  // Menu unico a destra (hamburger): doppia linguetta Prompt | Impostazioni
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuTab, setMenuTab] = useState('prompt'); // 'prompt' | 'impostazioni'
  const [menuSubView, setMenuSubView] = useState(null); // null | 'profilo' | 'sicurezza' | 'privacy' | 'termini' | 'abbonamento'
  const [showMemoryVaultModal, setShowMemoryVaultModal] = useState(false);
  const [memoryVaultData, setMemoryVaultData] = useState(null);
  const [memoryVaultLoading, setMemoryVaultLoading] = useState(false);
  const [memoryVaultError, setMemoryVaultError] = useState(null);
  const [memoryVaultRefreshing, setMemoryVaultRefreshing] = useState(false);
  // Roadmap Anima: feature flags (per menu Diario, Storie, Community)
  const [featureFlags, setFeatureFlags] = useState({ [FEATURE_KEYS.DIARY]: true, [FEATURE_KEYS.STORIES]: true });
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

  const refetchMemoryVault = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setMemoryVaultRefreshing(true);
    } else {
      setMemoryVaultLoading(true);
    }
    setMemoryVaultError(null);
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const data = idToken ? await loadMemory(idToken) : null;
      setMemoryVaultData(data);
    } catch (e) {
      setMemoryVaultError(e?.message || 'Errore di caricamento');
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

  // Visibilità password (login + registrazione)
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [regPasswordVisible, setRegPasswordVisible] = useState(false);
  const [regConfirmPasswordVisible, setRegConfirmPasswordVisible] = useState(false);

  // Tracking lunghezza numero telefono per haptics
  const phoneDigitsLengthRef = useRef(0);

  // Lingua (i18n). Scelta solo al primo avvio, poi letta da AsyncStorage.
  const [language, setLanguage] = useState('it');
  // null = in caricamento, true = mostrare schermata lingua (primo avvio), false = già scelta in passato
  const [needFirstLaunchLanguageChoice, setNeedFirstLaunchLanguageChoice] = useState(null);

  // Frase emozionale sotto il nome (cambia ogni ora)
  const [headerPhrase, setHeaderPhrase] = useState(() => getHeaderPhraseForHour());

  // Oxy Key (accesso esclusivo)
  const [hasOxyKey, setHasOxyKey] = useState(false);
  const [oxyKeyInput, setOxyKeyInput] = useState('');
  const [showOxyKeyGate, setShowOxyKeyGate] = useState(false);
  const [oxyKeyError, setOxyKeyError] = useState('');

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
    (key, params) => translate(language, key, params),
    [language]
  );

  const backendUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim();

  // Stato abbonamento/billing lato backend
  const [billingStatus, setBillingStatus] = useState({
    loading: false,
    active: false,
    status: 'none',
    planId: null,
    mode: null,
  });

  const refreshBillingStatus = useCallback(async () => {
    if (!backendUrl) return;
    setBillingStatus((prev) => ({ ...prev, loading: true }));
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!idToken) {
        setBillingStatus({ loading: false, active: false, status: 'none', planId: null, mode: null });
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
      setBillingStatus({
        loading: false,
        active: !!data.active,
        status: data.status || 'none',
        planId: data.planId || null,
        mode: data.mode || null,
      });
    } catch (_) {
      setBillingStatus((prev) => ({ ...prev, loading: false }));
    }
  }, [backendUrl]);

  const openCheckoutForPlan = useCallback(
    async (planId) => {
      const urlBase = backendUrl;
      if (!urlBase) {
        Alert.alert('Non disponibile', 'Il backend non è configurato (EXPO_PUBLIC_BACKEND_URL mancante).');
        return;
      }
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetch(`${urlBase.replace(/\/$/, '')}/api/billing/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken && { Authorization: `Bearer ${idToken}` }),
          },
          body: JSON.stringify({ planId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.url) {
          Alert.alert('Abbonamento', data?.error || 'Impossibile aprire la pagina di pagamento.');
          return;
        }
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window?.open) {
          window.open(data.url, '_blank', 'noopener,noreferrer');
        } else {
          Linking.openURL(data.url);
        }
      } catch (e) {
        Alert.alert('Abbonamento', 'Errore durante l’apertura della pagina di pagamento.');
      }
      // Dopo il redirect l'utente tornerà all'app; il webhook aggiornerà lo stato.
      // Alla prossima apertura della schermata Abbonamento chiameremo refreshBillingStatus.
    },
    [backendUrl]
  );

  // Google Sign-In: configurazione una tantum (webClientId da Firebase Console → Auth → Google → Web client ID)
  useEffect(() => {
    const webClientId = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
    if (webClientId) configureGoogleSignIn(webClientId);
  }, []);

  // Audio: parametri obbligatori all'avvio (expo-av) per evitare crash. Su web non chiamare: può far andare in crash la pagina.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
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
      } catch (e) {
        console.warn('Errore configurazione audio:', e);
      }
    })();
  }, []);

  // Stato di autenticazione reale: esclusivamente onAuthStateChanged Firebase. isLoading = false solo quando Firebase restituisce user o null.
  useEffect(() => {
    const hasFirebase = !!(process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '').trim();
    if (!hasFirebase) {
      setUserId(null);
      setUserData({ nomeUtente: '', emailPrincipale: '', emailSecondaria: '', telefonoRecupero: '' });
      setIsLogged(false);
      setIsLoading(false);
      initialMessageRequestedRef.current = false;
      return;
    }

    const AUTH_TIMEOUT_MS = 12000;
    const timeoutId = setTimeout(() => {
      setAuthConnectionError(true);
      setIsLoading(false);
    }, AUTH_TIMEOUT_MS);

    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutId);
      setAuthConnectionError(false);
      if (user) {
        setUserId(user.uid);
        setUserData({
          nomeUtente: user.displayName || '',
          emailPrincipale: user.email || '',
          emailSecondaria: '',
          telefonoRecupero: user.phoneNumber || '',
        });
        setIsLogged(true);
      } else {
        setUserId(null);
        setUserData({ nomeUtente: '', emailPrincipale: '', emailSecondaria: '', telefonoRecupero: '' });
        setIsLogged(false);
        initialMessageRequestedRef.current = false;
      }
      setIsLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, []);

  // Lingua e flag "primo avvio": leggi da AsyncStorage al mount. La scelta lingua si fa solo al primo avvio.
  useEffect(() => {
    (async () => {
      try {
        const [storedLang, hasChosenAtStartup] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
          AsyncStorage.getItem(STORAGE_KEYS.HAS_CHOSEN_LANGUAGE_AT_STARTUP),
        ]);
        if (storedLang && LANGUAGES.includes(storedLang)) setLanguage(storedLang);
        setNeedFirstLaunchLanguageChoice(hasChosenAtStartup === 'true' ? false : true);
      } catch (_) {
        setNeedFirstLaunchLanguageChoice(true);
      }
    })();
  }, []);

  // Preferenze da AsyncStorage (caricate al mount, non dipendono da auth)
  useEffect(() => {
    (async () => {
      try {
        const [storedServer, storedAiName, storedVoiceId, storedVoiceReply, storedProfileUri] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SERVER_CONFIG),
          AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_AI_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.VOICE_ID),
          AsyncStorage.getItem(STORAGE_KEYS.VOICE_REPLY_MODE),
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE_IMAGE_URI),
        ]);
        if (storedAiName && storedAiName.trim()) {
          setCustomAiName(storedAiName.trim());
          setStoredAiName(storedAiName.trim());
        }
        if (storedVoiceId && VOICE_OPTIONS.some((v) => v.id === storedVoiceId)) setVoiceId(storedVoiceId);
        if (storedVoiceReply === 'true') setVoiceReplyMode(true);
        if (storedProfileUri) setProfileImageUri(storedProfileUri);
        if (storedServer) setServerConfig(JSON.parse(storedServer));
      } catch (_) {}
    })();
  }, []);

  // Oxy Key gate e persistenza USER_DATA quando utente autenticato (dopo onAuthStateChanged)
  // In modalità subscription la chiave non è mai in app: solo backend (Master o futuro abbonamento)
  useEffect(() => {
    if (!isLogged || !userId) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        const masterKey = getMasterKey();
        const isMaster = isMasterUser(userData.emailPrincipale);
        if (isMaster && (backendUrl || (masterKey && isValidKeyFormat(masterKey)))) {
          setHasOxyKey(true);
        } else if (SHOW_OXy_KEY_OPTION) {
          const oxyKey = await getOxyKey();
          if (oxyKey && isValidKeyFormat(oxyKey)) {
            setHasOxyKey(true);
          } else {
            setShowOxyKeyGate(true);
          }
        } else {
          // Modalità subscription, non Master: nessuna chiave in app; gate se backend non basta (futuro: verifica abbonamento)
          setHasOxyKey(false);
          setShowOxyKeyGate(true);
        }
      } catch (_) {}
    })();
  }, [isLogged, userId, userData.emailPrincipale, backendUrl]);

  // Al login (o al ritorno in app da sessione persistita): atterrare sempre sulla chat, non sull'ultima pagina visitata
  useEffect(() => {
    if (!isLogged) return;
    setViewAttiva('chat');
    setShowMenuModal(false);
    setMenuTab('prompt');
    setMenuSubView(null);
    setSorgenteSelezionata(null);
  }, [isLogged]);

  // Carica cronologia chat quando utente è autenticato (fallback se bootstrap non l'ha fatto)
  useEffect(() => {
    if (!isLogged || !userId) return;

    const load = async () => {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const history = await loadChatHistory(userId, idToken);
      console.log('[App] loadChatHistory (useEffect):', history?.length ?? 0, 'messaggi');
      if (history && history.length > 0) {
        setChatHistory(history.map((m) => ({ role: m.role, content: m.content })));
        setMessaggi(history.map((m, idx) => ({
          id: `restored_${idx}`,
          tipo: m.role === 'user' ? 'user' : 'bot',
          testo: m.content,
        })));
      }
      setStickyBadge(null); // tornando alla cronologia = chat default, nessuna modalità sticky
    };
    load();
  }, [isLogged, userId]);

  // Roadmap Anima: carica feature flags da backend (per Diario, Storie, Community in menu)
  useEffect(() => {
    if (!isLogged || !userId) return;
    (async () => {
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const serverFlags = idToken ? await fetchServerFlags(idToken) : null;
        const flags = await getAllFlags(serverFlags);
        setFeatureFlags(flags);
      } catch (_) {
        setFeatureFlags({ [FEATURE_KEYS.DIARY]: true, [FEATURE_KEYS.STORIES]: true });
      }
    })();
  }, [isLogged, userId]);

  // Messaggio iniziale OXY: quando la chat è vuota (solo welcome), chiedi al backend il primo messaggio e sostituisci
  useEffect(() => {
    if (!isLogged || !userId || !backendUrl) return;
    const isMaster = isMasterUser(userData?.emailPrincipale);
    const hasKey = (isMaster && backendUrl) || hasOxyKey;
    if (!hasKey) return;
    if (messaggi.length !== 1 || messaggi[0]?.tipo !== 'bot' || messaggi[0]?.id !== '1') return;
    if (initialMessageRequestedRef.current) return;
    initialMessageRequestedRef.current = true;
    (async () => {
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const key = await getKeyForCurrentUser(userData?.emailPrincipale);
        const result = await callOxyAi({
          apiKey: key || undefined,
          idToken,
          useBackendForMaster: isMaster,
          userId,
          language,
          moduleName: moduloAttivo,
          userProfile: userData,
          history: [],
          message: '',
          customAiName: effectiveAiName,
          voiceId: voiceId || undefined,
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
      } catch (e) {
        console.warn('[App] Initial OXY message failed:', e?.message);
        initialMessageRequestedRef.current = false;
      }
    })();
  }, [isLogged, userId, backendUrl, hasOxyKey, userData?.emailPrincipale, messaggi.length, messaggi[0]?.id, messaggi[0]?.tipo, language, moduloAttivo, effectiveAiName]);

  // Salva configurazione server quando cambia
  useEffect(() => {
    if (serverConfig.host && serverConfig.username && serverConfig.token) {
      AsyncStorage.setItem(STORAGE_KEYS.SERVER_CONFIG, JSON.stringify(serverConfig)).catch(() => {});
    }
  }, [serverConfig]);

  // Scroll automatico chat
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messaggi]);

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
    const mappedUser = profile
      ? {
          nomeUtente: profile.full_name || '',
          emailPrincipale: profile.main_email || '',
          emailSecondaria: profile.backup_email || '',
          telefonoRecupero: profile.phone || '',
        }
      : {};
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mappedUser));
    if (regAiName != null && String(regAiName).trim()) {
      const name = String(regAiName).trim();
      setCustomAiName(name);
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_AI_NAME, name);
    }
    if (regVoiceId != null && VOICE_OPTIONS.some((v) => v.id === regVoiceId)) {
      setVoiceId(regVoiceId);
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE_ID, regVoiceId);
    }
    const uid = session.user.id;
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const history = await loadChatHistory(uid, idToken);
    if (history?.length > 0) {
      setChatHistory(history.map((m) => ({ role: m.role, content: m.content })));
      setMessaggi(history.map((m, idx) => ({
        id: `restored_${idx}`,
        tipo: m.role === 'user' ? 'user' : 'bot',
        testo: m.content,
      })));
    } else {
      setChatHistory([]);
      setMessaggi([{ id: '1', tipo: 'bot', testo: getWelcomePhraseForHour() }]);
    }
    setStickyBadge(null);
    const masterKey = getMasterKey();
    const isMaster = isMasterUser(mappedUser.emailPrincipale);
    const backendUrlAuth = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim();
    if (isMaster && (backendUrlAuth || (masterKey && isValidKeyFormat(masterKey)))) {
      setHasOxyKey(true);
    } else {
      const oxyKey = await getOxyKey();
      if (oxyKey && isValidKeyFormat(oxyKey)) setHasOxyKey(true);
      else setShowOxyKeyGate(true);
    }
  }, []);

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
      setOxyKeyError('Inserisci la tua chiave API (sk-...)');
      return;
    }
    if (!isValidKeyFormat(key)) {
      setOxyKeyError('Formato non valido. La chiave deve iniziare con sk- e avere almeno 20 caratteri.');
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
      setOxyKeyError('Errore nel salvataggio. Riprova.');
    }
  }, [oxyKeyInput]);

  const handleCameraVision = useCallback(async () => {
    const isMaster = isMasterUser(userData?.emailPrincipale);
    const canUseVision = hasOxyKey || (isMaster && backendUrl);
    if (!canUseVision) {
      setShowOxyKeyGate(true);
      if (SHOW_OXy_KEY_OPTION) {
        Alert.alert('Oxy Key richiesta', 'Configura la tua chiave API nelle impostazioni per usare Vision AI.');
      } else {
        Alert.alert('Servizio in abbonamento', 'Vision AI richiede un abbonamento attivo e la connessione al server.');
      }
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso fotocamera', 'Permetti l\'accesso alla fotocamera per scattare foto e analizzarle.');
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
      const backendUrlForVision = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim();
      const key = await getKeyForCurrentUser(userData?.emailPrincipale);
      if (!key && !(isMasterUser(userData?.emailPrincipale) && backendUrlForVision)) return;
      const userMsgId = `u_${Date.now()}`;
      const botMsgId = `b_${Date.now()}`;
      const now = Date.now();
      const prompt = 'Analizza questa immagine. Se è un documento o una lettera, genera una bozza di mail professionale. Altrimenti descrivi cosa vedi.';
      setMessaggi((prev) => [
        ...prev,
        { id: userMsgId, tipo: 'user', testo: '[Foto inviata per analisi]', createdAt: now },
        { id: botMsgId, tipo: 'bot', testo: t('chat.thinking'), createdAt: now },
      ]);
      setStaCaricando(true);
      chatAbortControllerRef.current = new AbortController();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const aiResult = await callOxyAi({
        apiKey: key || undefined,
        idToken,
        useBackendForMaster: isMasterUser(userData?.emailPrincipale),
        userId,
        language,
        moduleName: moduloAttivo,
        userProfile: userData,
        history: chatHistory,
        message: prompt,
        imageBase64: base64,
        customAiName: effectiveAiName,
        voiceId: voiceId || undefined,
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
      console.warn('Errore Vision AI:', err);
      if (err?.message === ABORTED_MESSAGE) {
        setMessaggi((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, testo: ABORTED_MESSAGE } : m))
        );
      } else {
        const msg = err?.message || '';
        const userMsg = msg.includes('camera') || msg.includes('Camera')
          ? 'Fotocamera non disponibile. Su simulatore iOS la fotocamera non è supportata.'
          : (msg || t('chat.errorGeneric'));
        Alert.alert('Errore Vision AI', userMsg);
      }
    } finally {
      chatAbortControllerRef.current = null;
      setStaCaricando(false);
    }
  }, [hasOxyKey, userId, language, moduloAttivo, userData, chatHistory, effectiveAiName, backendUrl, t]);

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

    const phoneDigits = regData.telefono.replace(/\D/g, '');
    const fullPhone = `+${phoneCountry.callingCode}${phoneDigits}`;

    if (!validateField('telefono', fullPhone)) errors.push(t('register.validation.phone'));

    // Validazione password "lazy" - solo al click, con messaggi specifici
    const passwordErrors = validatePasswordDetailed(regData.password);
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
        nomeUtente: `${regData.nome.trim()} ${regData.cognome.trim()}`.trim(),
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
      handleAuthSuccess({ session, profile });
    } catch (err) {
      console.warn('Errore registrazione profilo:', err);
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
          'Permesso microfono',
          'OXY Real ha bisogno del microfono per registrare messaggi vocali. Attivalo nelle impostazioni del dispositivo.'
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
      console.warn('Errore avvio registrazione audio', e);
      const msg = e?.message || String(e);
      const userMsg = msg.toLowerCase().includes('simulator') || msg.includes('not supported')
        ? 'La registrazione non è disponibile sul simulatore iOS. Prova su un dispositivo reale.'
        : msg.length > 80
          ? 'Impossibile avviare la registrazione. Verifica i permessi del microfono nelle impostazioni.'
          : msg || 'Impossibile avviare la registrazione. Riprova.';
      Alert.alert('Errore microfono', userMsg);
    }
  }, []);

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
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: 'Trascrizione non disponibile. Verifica la connessione al backend.' }]);
        return;
      }
      if (durationMs < 600) {
        return;
      }

      let audioBase64 = '';
      try {
        audioBase64 = await readAudioUriAsBase64(uri);
      } catch (readErr) {
        console.warn('Lettura file audio:', readErr);
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: 'Impossibile leggere l\'audio. Riprova.' }]);
        return;
      }
      if (!audioBase64) {
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: 'Impossibile leggere l\'audio. Riprova.' }]);
        return;
      }

      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const key = await getKeyForCurrentUser(userData?.emailPrincipale);
      const isMaster = isMasterUser(userData?.emailPrincipale);
      const apiKey = !isMaster && key ? key : null;
      const { text } = await transcribe(idToken, audioBase64, apiKey || undefined);
      if (text && text.trim()) {
        const uid = auth.currentUser?.uid;
        if (idToken && uid) track(EVENTS.VOICE_INPUT, {}, idToken);
        sendMessageRef.current?.(text.trim(), !!voiceReplyMode);
      } else {
        setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: 'Nessun testo riconosciuto. Riprova a parlare più chiaramente.' }]);
      }
    } catch (e) {
      console.warn('Errore stop/trascrizione registrazione audio', e);
      setMessaggi((prev) => [...prev, { id: `audio_${Date.now()}`, tipo: 'bot', testo: e?.message || 'Trascrizione non disponibile. Riprova.' }]);
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
  }, [backendUrl, userData?.emailPrincipale, voiceReplyMode]);

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

  /** Voce Anima: prima TTS OpenAI (tts-1-hd, nova), se fallisce sintesi sistema con tono più caldo */
  const playAnimaVoice = useCallback(async (text) => {
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
    const backend = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    let apiKey = null;
    try {
      apiKey = await getKeyForCurrentUser(userData?.emailPrincipale) || null;
    } catch (_) {}
    if (backend && idToken) {
      try {
        const data = await fetchTtsAudio(forTts, idToken, apiKey || undefined, voiceId || undefined);
        if (data?.audioBase64) {
          const uri = `data:audio/mp3;base64,${data.audioBase64}`;
          const { sound } = await Audio.Sound.createAsync({ uri });
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate((s) => {
            if (s?.didJustFinishAndNotSeek) sound.unloadAsync().catch(() => {});
          });
          return;
        }
      } catch (e) {
        console.warn('TTS Anima (fallback a sintesi sistema):', e?.message);
      }
    }
    /* Fallback: sintesi di sistema con tono più caldo (pitch e rate leggermente più bassi) */
    try {
      Speech.speak(forTts || raw, {
        language: 'it-IT',
        pitch: 0.98,
        rate: 0.92,
      });
    } catch (e) {
      console.warn('Errore TTS:', e);
    }
  }, [userData?.emailPrincipale, voiceId]);

  /** Prova voce nel menu: TTS con frase di esempio e voce specificata */
  const playVoiceSample = useCallback(async (option) => {
    if (!option?.id || !option.samplePhrase) return;
    const backend = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    let apiKey = null;
    try {
      apiKey = await getKeyForCurrentUser(userData?.emailPrincipale) || null;
    } catch (_) {}
    if (!backend || !idToken) {
      Alert.alert('Prova voce', 'Accedi e configura la Oxy Key per provare le voci.');
      return;
    }
    setPlayingVoiceId(option.id);
    try {
      try {
        Speech.stop();
      } catch (_) {}
      const data = await fetchTtsAudio(option.samplePhrase.trim().slice(0, 4096), idToken, apiKey || undefined, option.id);
      if (data?.audioBase64) {
        const uri = `data:audio/mp3;base64,${data.audioBase64}`;
        const { sound } = await Audio.Sound.createAsync({ uri });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s?.didJustFinishAndNotSeek) sound.unloadAsync().catch(() => {});
        });
      }
    } catch (e) {
      console.warn('TTS Prova voce:', e?.message);
      Alert.alert('Prova voce', e?.message || 'Impossibile riprodurre. Riprova.');
    } finally {
      setPlayingVoiceId(null);
    }
  }, [userData?.emailPrincipale]);

  const inviaMessaggio = useCallback(async () => {
    if (!testo.trim() || staCaricando) return;
    const rawMessage = testo.trim();
    if (rawMessage.length > MAX_MESSAGE_LENGTH) {
      Alert.alert('Messaggio troppo lungo', `Massimo ${MAX_MESSAGE_LENGTH} caratteri. Riduci il testo e riprova.`);
      return;
    }

    const lastFromBot = chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'assistant';
    if (!lastFromBot) setStickyBadge(null);
    let actualMessage = rawMessage;
    if (lastFromBot && stickyBadge) {
      actualMessage = rawMessage.startsWith(stickyBadge.prompt) ? rawMessage : (stickyBadge.prompt + rawMessage);
    }
    for (const b of POWER_BADGES) {
      if (actualMessage.startsWith(b.prompt)) {
        setStickyBadge(b);
        break;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTesto('');
    Keyboard.dismiss();

    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
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
      const isMasterUserFlag = isMasterUser(userData?.emailPrincipale);
      const key = await getKeyForCurrentUser(userData?.emailPrincipale);
      if (!key && !(isMasterUserFlag && backendUrl)) {
        setShowOxyKeyGate(true);
        throw new Error('Oxy Key non configurata. Inserisci la tua chiave Oxy per chattare.');
      }
      const aiResult = await callOxyAi({
        apiKey: key || undefined,
        idToken,
        useBackendForMaster: isMasterUserFlag,
        userId,
        language,
        moduleName: moduloAttivo,
        userProfile: userData,
        history: chatHistory,
        message: actualMessage,
        customAiName: effectiveAiName,
        voiceId: voiceId || undefined,
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
      if (ttsEnabled) playAnimaVoice(risposta);
    } catch (err) {
      console.warn('Chat IA (voce/vision):', err?.message || err);
      const isNetworkError = /network request failed|failed to fetch|load failed|connection refused/i.test(err?.message || '');
      const fallback = isNetworkError ? t('chat.errorNetwork') : t('chat.errorGeneric');
      setMessaggi((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, testo: fallback } : m
        )
      );
      // Audit 4.2: non salvare l'errore come messaggio assistant in cronologia/DB
      if (ttsEnabled) playAnimaVoice(fallback);
    } finally {
      setStaCaricando(false);
    }
  }, [testo, staCaricando, moduloAttivo, userData, userId, language, chatHistory, ttsEnabled, backendUrl, stickyBadge, playAnimaVoice]);

  /** Invia messaggio (da testo digitato o da optionalMessageText in modalità voce). Se forceVoiceReply=true, riproduce sempre la risposta con TTS. */
  const sendMessage = useCallback(async (optionalMessageText, forceVoiceReply = false) => {
    const rawMessage = (optionalMessageText != null ? String(optionalMessageText).trim() : inputMessage.trim());
    if (!rawMessage && optionalMessageText == null) return;
    if (!rawMessage) return;
    if (staCaricando) return;
    if (rawMessage.length > MAX_MESSAGE_LENGTH) {
      Alert.alert('Messaggio troppo lungo', `Massimo ${MAX_MESSAGE_LENGTH} caratteri. Riduci il testo e riprova.`);
      return;
    }
    const isMaster = isMasterUser(userData?.emailPrincipale);
    const masterKey = getMasterKey();
    const hasKey = (isMaster && (backendUrl || masterKey)) || hasOxyKey;
    if (!hasKey) {
      setShowOxyKeyGate(true);
      if (SHOW_OXy_KEY_OPTION) {
        Alert.alert('Oxy Key richiesta', 'Inserisci la tua chiave Oxy per inviare messaggi.');
      } else {
        Alert.alert('Servizio in abbonamento', 'La chat richiede un abbonamento attivo e la connessione al server. Verifica la connessione o contatta il supporto.');
      }
      return;
    }

    // Sticky badge: se l'ultimo messaggio è dell'IA, l'utente sta "rispondendo" → mantieni il mood; altrimenti torna alla chat default
    const lastFromBot = chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'assistant';
    if (!lastFromBot) setStickyBadge(null);

    let actualMessage = rawMessage;
    if (lastFromBot && stickyBadge) {
      actualMessage = rawMessage.startsWith(stickyBadge.prompt) ? rawMessage : (stickyBadge.prompt + rawMessage);
    }

    // Rileva se questo messaggio attiva una modalità (inizio con un prompt badge) → imposta sticky per i prossimi turni
    for (const b of POWER_BADGES) {
      if (actualMessage.startsWith(b.prompt)) {
        setStickyBadge(b);
        break;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (optionalMessageText == null) {
      setInputMessage('');
      Keyboard.dismiss();
    }

    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    const userMsgId = `u_${Date.now()}`;
    const botMsgId = `b_${Date.now()}`;
    const now = Date.now();

    setMessaggi((prev) => [
      ...prev,
      { id: userMsgId, tipo: 'user', testo: actualMessage, createdAt: now },
      { id: botMsgId, tipo: 'bot', testo: t('chat.thinking'), createdAt: now },
    ]);
    setChatHistory((prev) => [...prev, { role: 'user', content: actualMessage }]);
    if (userId) saveMessageToDb(userId, 'user', actualMessage, idToken);

    setStaCaricando(true);
    chatAbortControllerRef.current = new AbortController();
    const signal = chatAbortControllerRef.current.signal;

    try {
      const isMasterUserFlag = isMasterUser(userData?.emailPrincipale);
      const key = await getKeyForCurrentUser(userData?.emailPrincipale);
      if (!key && !(isMasterUserFlag && backendUrl)) {
        setShowOxyKeyGate(true);
        throw new Error('Oxy Key non configurata. Inserisci la tua chiave Oxy per chattare.');
      }
      const aiResult = await callOxyAi({
        apiKey: key || undefined,
        idToken,
        useBackendForMaster: isMasterUserFlag,
        userId,
        language,
        moduleName: moduloAttivo,
        userProfile: userData,
        history: chatHistory,
        message: actualMessage,
        customAiName: effectiveAiName,
        voiceId: voiceId || undefined,
        signal,
      });

        if (!aiResult || !aiResult.answer) {
          throw new Error('Risposta IA non valida');
        }

        const risposta = aiResult.answer;

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
        if (forceVoiceReply) playAnimaVoice(risposta);
    } catch (err) {
      if (__DEV__) {
        console.warn('[Chat] Errore invio:', err?.message || err);
        console.warn('[Chat] Diagnostica: backendUrl=', backendUrl ? `${backendUrl.substring(0, 30)}...` : '(vuoto)', 'isMaster=', isMasterUser(userData?.emailPrincipale), 'hasOxyKey=', hasOxyKey);
      }
      console.warn('Chat IA:', err?.message || err);
      const isAborted = err?.message === ABORTED_MESSAGE;
      const isRateLimit = !isAborted && (/429|rate limit|rate limit raggiunto/i.test(err?.message || ''));
      const isNetworkError = !isAborted && !isRateLimit && /network request failed|failed to fetch|load failed|connection refused/i.test(err?.message || '');
      const errMsg = isAborted
        ? ABORTED_MESSAGE
        : (isRateLimit
            ? t('chat.errorRateLimit')
            : (isNetworkError ? t('chat.errorNetwork') : (err?.message || t('chat.errorGeneric'))));
      const errTesto = typeof errMsg === 'string' && errMsg.length < 500 ? errMsg : t('chat.errorGeneric');

      // Non salvare / mostrare l'errore come messaggio dell'assistente: rimuovi il placeholder "sta pensando"
      setMessaggi((prev) => prev.filter((m) => m.id !== botMsgId));

      if (!isAborted) {
        Alert.alert('Errore', errTesto);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      if (forceVoiceReply && !isAborted) {
        const fallback = isRateLimit
          ? t('chat.errorRateLimit')
          : (isNetworkError ? t('chat.errorNetwork') : t('chat.errorGeneric'));
        playAnimaVoice(fallback);
      }
    } finally {
      chatAbortControllerRef.current = null;
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
      setStaCaricando(false);
    }
  }, [inputMessage, staCaricando, moduloAttivo, userData, userId, language, chatHistory, hasOxyKey, effectiveAiName, backendUrl, stickyBadge, voiceId, playAnimaVoice, t]);

  sendMessageRef.current = sendMessage;

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

  const handleCopyMessage = useCallback(() => {
    if (!selectedMessageText) return;
    try {
      Clipboard.setString(selectedMessageText);
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
        title: language === 'en' ? 'Forward message' : language === 'ar' ? 'إعادة توجيه' : 'Inoltra messaggio',
      });
      closeMessageMenu();
    } catch (e) {
      if (e?.message !== 'User did not share') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      closeMessageMenu();
    }
  }, [selectedMessageText, language, closeMessageMenu]);

  const handleShareMessage = useCallback(async () => {
    if (!selectedMessageText) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: selectedMessageText,
        title: language === 'en' ? 'Share message' : language === 'ar' ? 'مشاركة' : 'Condividi messaggio',
      });
      closeMessageMenu();
    } catch (e) {
      if (e?.message !== 'User did not share') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      closeMessageMenu();
    }
  }, [selectedMessageText, language, closeMessageMenu]);

  const handleSaveAsGoal = useCallback(async () => {
    if (!selectedMessageText) return;
    const backendUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim();
    if (!backendUrl) {
      Alert.alert('Non disponibile', 'Salvataggio memoria richiede il backend. Configura EXPO_PUBLIC_BACKEND_URL.');
      closeMessageMenu();
      return;
    }
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!idToken) throw new Error('Accesso richiesto');
      await saveToMemory(idToken, { goal: selectedMessageText });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Salvato', 'Aggiunto ai tuoi obiettivi. OXY lo ricorderà.');
      closeMessageMenu();
    } catch (e) {
      console.warn('[App] saveToMemory goal:', e?.message);
      Alert.alert('Errore', e?.message || 'Non è stato possibile salvare.');
      closeMessageMenu();
    }
  }, [selectedMessageText, closeMessageMenu]);

  const handleRememberThis = useCallback(async () => {
    if (!selectedMessageText) return;
    const backendUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim();
    if (!backendUrl) {
      Alert.alert('Non disponibile', 'Salvataggio memoria richiede il backend. Configura EXPO_PUBLIC_BACKEND_URL.');
      closeMessageMenu();
      return;
    }
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!idToken) throw new Error('Accesso richiesto');
      await saveToMemory(idToken, { keyFact: selectedMessageText });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Salvato', 'Aggiunto a cosa ricordo di te. OXY lo userà nelle prossime chat.');
      closeMessageMenu();
    } catch (e) {
      console.warn('[App] saveToMemory keyFact:', e?.message);
      Alert.alert('Errore', e?.message || 'Non è stato possibile salvare.');
      closeMessageMenu();
    }
  }, [selectedMessageText, closeMessageMenu]);

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
      setViewAttiva('chat');
      setShowOxyKeyGate(false);
      setModuloAttivo('Aiuto Mail');
      setShowMenuModal(false);
      setShowRegister(false);
      setShowPasswordSection(false);
      setShow2FAForUpdate(false);
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
      console.error('Errore logout:', err);
      setIsLogged(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [t]);

  // ... (continua con il resto del codice: render login, 2FA, main view, settings modal, etc.)

  if (isLoading) {
    return (
      <ErrorBoundary>
      <SafeAreaProvider>
        <LinearGradient colors={['#002b4d', '#002b4d']} style={styles.loadingContainer}>
          <SafeAreaView style={styles.loadingSafe} edges={['top']}>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 30, overflow: 'visible' }}>
              <OxyLogo large />
            </View>
            <ActivityIndicator size="large" color="#c5a059" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
                Errore di connessione ai sistemi di sicurezza. Riprova.
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Oxy Key Gate: in subscription solo messaggio (nessuna chiave in app); in one_time_purchase mostra input Oxy Key
  if (isLogged && showOxyKeyGate) {
    if (!SHOW_OXy_KEY_OPTION) {
      // Modalità abbonamento: nessuna opzione chiave, solo avviso
      return (
        <ErrorBoundary>
        <SafeAreaProvider>
          <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }} edges={['top']}>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <OxyLogo large />
                <Text style={{ color: '#c5a059', fontSize: 14, fontStyle: 'italic', marginTop: 8 }}>real identity</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                Servizio in abbonamento
              </Text>
              <Text style={{ color: '#b0b0c0', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                La chat e Vision AI richiedono un abbonamento attivo e la connessione al server. Verifica la connessione o contatta il supporto per attivare l'abbonamento.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#c5a059', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                onPress={() => setShowOxyKeyGate(false)}
              >
                <Text style={{ color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 }}>OK</Text>
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
            <Text style={{ color: '#c5a059', fontSize: 14, fontStyle: 'italic', marginTop: 8 }}>real identity</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
            Accesso Esclusivo
          </Text>
          <Text style={{ color: '#b0b0c0', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            Inserisci la tua Oxy Key per accedere alla chat e a Vision AI.
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
            onChangeText={(t) => { setOxyKeyInput(t); setOxyKeyError(''); }}
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
            }}
            onPress={handleSaveOxyKey}
          >
            <Text style={{ color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 }}>SALVA E ACCEDI</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
      </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  // Schermata Auth (Login/Registrazione Firebase Email+Password)
  if (!isLogged) {
    // Primo avvio: mostra solo la scelta della lingua; una volta scelta non si ripete più.
    if (needFirstLaunchLanguageChoice === true) {
      return (
        <ErrorBoundary>
          <SafeAreaProvider>
            <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1 }}>
              <StatusBar barStyle="light-content" />
              <View style={styles.firstLaunchLanguageWrap}>
                <Text style={styles.firstLaunchLanguageTitle}>{t('register.stepLanguage')}</Text>
                <Text style={styles.firstLaunchLanguageSubtitle}>{t('register.chooseLanguage')}</Text>
                {LANGUAGES.map((lng) => (
                  <TouchableOpacity
                    key={lng}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      try {
                        await AsyncStorage.multiSet([
                          [STORAGE_KEYS.LANGUAGE, lng],
                          [STORAGE_KEYS.HAS_CHOSEN_LANGUAGE_AT_STARTUP, 'true'],
                        ]);
                      } catch (_) {}
                      setLanguage(lng);
                      setNeedFirstLaunchLanguageChoice(false);
                    }}
                    style={[
                      styles.firstLaunchLanguageOption,
                      lng === language && styles.firstLaunchLanguageOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.firstLaunchLanguageOptionText,
                        lng === language && styles.firstLaunchLanguageOptionTextActive,
                      ]}
                    >
                      {LANGUAGE_LABELS[lng] || lng.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </SafeAreaProvider>
        </ErrorBoundary>
      );
    }
    // Caricamento stato lingua (evita flash): mostra schermata neutra breve
    if (needFirstLaunchLanguageChoice === null) {
      return (
        <ErrorBoundary>
          <SafeAreaProvider>
            <LinearGradient colors={['#002b4d', '#002b4d']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <StatusBar barStyle="light-content" />
              <ActivityIndicator size="large" color="#c5a059" />
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
            onOpenLanguage={() => setShowLanguageModal(true)}
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
                <Text style={styles.settingsTitle}>Lingua / Language</Text>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <Text style={styles.closeModal}>Chiudi</Text>
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
        behavior="padding"
        keyboardVerticalOffset={0}
        enabled
      >
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
          <StatusBar barStyle="light-content" backgroundColor="#002b4d" />
          {isConnected === false && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>Sei offline. Connessione richiesta per inviare messaggi.</Text>
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
                </View>
                <View style={styles.profileSection}>
                  <View style={styles.profileRow}>
                    <TouchableOpacity
                      style={styles.avatarContainer}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert('Permesso', 'Permetti l\'accesso alla galleria per cambiare la foto.');
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
                              : (avatarError || !userData?.nomeUtente)
                                ? { uri: `https://ui-avatars.com/api/?name=${userData?.nomeUtente || 'User'}&background=c5a059&color=fff` }
                                : (DEFAULT_AVATAR_SOURCE || { uri: `https://ui-avatars.com/api/?name=${userData?.nomeUtente || 'User'}&background=c5a059&color=fff` })
                          }
                          style={styles.avatarImage}
                          onError={() => setAvatarError(true)}
                          accessibilityLabel={`Avatar di ${userData?.nomeUtente || 'User'}`}
                        />
                      </View>
                      <View style={styles.statusDot} />
                    </TouchableOpacity>
                    <View style={styles.userInfoText}>
                      <Text style={styles.userName}>{userData?.nomeUtente || 'User'}</Text>
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
                        {messaggi.map((m) => {
                          const isUser = m.tipo === 'user';
                          const senderLabel = isUser ? (language === 'ar' ? 'أنت' : language === 'en' ? 'You' : 'Tu') : effectiveAiName;
                          const timeStr = m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                            : '';
                          const msgText = m.testo || '';
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
                                    m.tipo === 'bot' && m.id === '1'
                                      ? { fontStyle: 'italic', color: '#c5a059' }
                                      : {},
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
                          <Text style={styles.stickyBadgeChipLabel} numberOfLines={1}>Modalità: {stickyBadge.label}</Text>
                          <TouchableOpacity
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStickyBadge(null); }}
                            style={styles.stickyBadgeChipExit}
                            accessibilityLabel="Esci da modalità"
                          >
                            <Text style={styles.stickyBadgeChipExitText}>Esci</Text>
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
                      <View style={styles.superBar} collapsable={false}>
                        <TouchableOpacity
                          style={[styles.superBarCamera, voiceReplyMode && styles.voiceReplyToggleActive]}
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
                          <FontAwesome name="volume-up" size={18} color={voiceReplyMode ? '#c5a059' : '#888'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.superBarCamera, styles.superBarCameraRight]}
                          onPress={handleCameraVision}
                          accessibilityLabel={t('chat.visionLabel')}
                        >
                          <FontAwesome name="camera" size={22} color="#c5a059" />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.superBarInput}
                          placeholder={t('chat.inputPlaceholder')}
                          placeholderTextColor="#d1d1d1"
                          value={inputMessage}
                          onChangeText={setInputMessage}
                          maxLength={MAX_MESSAGE_LENGTH}
                          multiline
                          selectionColor="#c5a059"
                          onSubmitEditing={() => {
                            if (inputMessage.trim() && !staCaricando) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              sendMessage();
                            }
                          }}
                          onKeyPress={(e) => {
                            const { key, shiftKey } = e?.nativeEvent || {};
                            if (key === 'Enter' && !shiftKey && inputMessage.trim() && !staCaricando) {
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
                              chatAbortControllerRef.current?.abort();
                            }}
                            accessibilityLabel={t('chat.stopResponseLabel')}
                          >
                            <FontAwesome name="stop" size={18} color="#0a0a0a" />
                            <Text style={styles.superBarStopText}>{t('chat.stopButton')}</Text>
                          </TouchableOpacity>
                        ) : inputMessage.trim() ? (
                          <TouchableOpacity
                            style={styles.superBarSend}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              sendMessage();
                            }}
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
                    style={styles.cloudBackBtn}
                    onPress={() => { setViewAttiva('chat'); setSorgenteSelezionata(null); }}
                    accessibilityLabel="Torna alla chat"
                  >
                    <Text style={styles.cloudBackBtnText}>{t('cloud.backToChat')}</Text>
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
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileRow}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permesso', 'Permetti l\'accesso alla galleria per cambiare la foto.');
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
                      : (avatarError || !userData?.nomeUtente)
                        ? { uri: `https://ui-avatars.com/api/?name=${userData?.nomeUtente || 'User'}&background=c5a059&color=fff` }
                        : (DEFAULT_AVATAR_SOURCE || { uri: `https://ui-avatars.com/api/?name=${userData?.nomeUtente || 'User'}&background=c5a059&color=fff` })
                  }
                  style={styles.avatarImage}
                  onError={() => setAvatarError(true)}
                  accessibilityLabel={`Avatar di ${userData?.nomeUtente || 'User'}`}
                />
              </View>
              <View style={styles.statusDot} />
            </TouchableOpacity>
            <View style={styles.userInfoText}>
              <Text style={styles.userName}>{userData?.nomeUtente || 'User'}</Text>
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
        onRequestClose={() => { setShowMenuModal(false); setMenuSubView(null); }}
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
                <Text style={[styles.menuTabText, menuTab === 'prompt' && styles.menuTabTextActive]}>Prompt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuTab, menuTab === 'impostazioni' && styles.menuTabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMenuTab('impostazioni');
                  setMenuSubView(null);
                }}
              >
                <Text style={[styles.menuTabText, menuTab === 'impostazioni' && styles.menuTabTextActive]}>Impostazioni</Text>
              </TouchableOpacity>
            </View>
            {/* Contenuto tab */}
            {menuTab === 'prompt' ? (
              <ScrollView
                contentContainerStyle={styles.promptListContainer}
                showsVerticalScrollIndicator={false}
                style={styles.menuTabScroll}
              >
                <TouchableOpacity
                  style={[styles.promptRow, { marginBottom: 16 }]}
                  activeOpacity={0.7}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowMenuModal(false);
                    setShowMemoryVaultModal(true);
                    setMemoryVaultData(null);
                    await refetchMemoryVault(false);
                  }}
                  accessibilityLabel="Memory Vault"
                >
                  <View style={styles.promptRowIcon}>
                    <FontAwesome name="book" size={18} color="#c5a059" />
                  </View>
                  <Text style={styles.promptRowLabel}>MEMORY VAULT</Text>
                  <FontAwesome name="chevron-right" size={12} color="rgba(197,160,89,0.5)" />
                </TouchableOpacity>
                {featureFlags.diary ? (
                  <TouchableOpacity
                    style={[styles.promptRow, { marginBottom: 16 }]}
                    activeOpacity={0.7}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      setShowDiaryModal(true);
                      setDiaryData({ themes: [], entries: [], progressSummary: '' });
                      await refetchDiary(false);
                      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                      if (idToken) track(EVENTS.FEATURE_OPEN, { feature: 'diary' }, idToken);
                    }}
                    accessibilityLabel="Diario"
                  >
                    <View style={styles.promptRowIcon}>
                      <FontAwesome name="bookmark-o" size={18} color="#c5a059" />
                    </View>
                    <Text style={styles.promptRowLabel}>DIARIO</Text>
                    <FontAwesome name="chevron-right" size={12} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                ) : null}
                {featureFlags.stories ? (
                  <TouchableOpacity
                    style={[styles.promptRow, { marginBottom: 16 }]}
                    activeOpacity={0.7}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      setShowStoriesModal(true);
                      await refetchStoryState();
                      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                      if (idToken) track(EVENTS.FEATURE_OPEN, { feature: 'stories' }, idToken);
                    }}
                    accessibilityLabel="Storie"
                  >
                    <View style={styles.promptRowIcon}>
                      <FontAwesome name="align-left" size={18} color="#c5a059" />
                    </View>
                    <Text style={styles.promptRowLabel}>STORIE</Text>
                    <FontAwesome name="chevron-right" size={12} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                ) : null}
                {featureFlags.community ? (
                  <TouchableOpacity
                    style={[styles.promptRow, { marginBottom: 16 }]}
                    activeOpacity={0.7}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      setShowCommunityModal(true);
                      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                      if (idToken) track(EVENTS.FEATURE_OPEN, { feature: 'community' }, idToken);
                    }}
                    accessibilityLabel="Community"
                  >
                    <View style={styles.promptRowIcon}>
                      <FontAwesome name="users" size={18} color="#c5a059" />
                    </View>
                    <Text style={styles.promptRowLabel}>COMMUNITY</Text>
                    <FontAwesome name="chevron-right" size={12} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                ) : null}
                {POWER_BADGES.map((badge) => (
                  <TouchableOpacity
                    key={badge.id}
                    style={styles.promptRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowMenuModal(false);
                      setInputMessage((prev) => badge.prompt + (prev ? prev : ''));
                    }}
                    accessibilityLabel={badge.label}
                  >
                    <View style={styles.promptRowIcon}>
                      <FontAwesome name={badge.icon} size={18} color="#c5a059" />
                    </View>
                    <Text style={styles.promptRowLabel} numberOfLines={1}>{badge.label}</Text>
                    <FontAwesome name="chevron-right" size={12} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : menuSubView === 'profilo' ? (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView(null); }}
                  style={styles.menuBackRow}
                >
                  <FontAwesome name="arrow-left" size={20} color="#c5a059" style={{ marginRight: 8 }} />
                  <Text style={[styles.settingsRowText, { color: '#c5a059' }]}>Indietro</Text>
                </TouchableOpacity>
                <Text style={[styles.menuModalTitle, styles.menuSubTitle]}>Profilo e assistente</Text>
                <ScrollView style={styles.menuTabScroll} contentContainerStyle={styles.menuSettingsContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>Nome della tua IA</Text>
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
                        <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 4 }]}>
                          Nome personalizzato disponibile con pacchetto a pagamento.
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>Voce</Text>
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
                          Alert.alert('Permesso', 'Permetti l\'accesso alla galleria per cambiare la foto profilo.');
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
                  style={styles.menuBackRow}
                >
                  <FontAwesome name="arrow-left" size={20} color="#c5a059" style={{ marginRight: 8 }} />
                  <Text style={[styles.settingsRowText, { color: '#c5a059' }]}>Indietro</Text>
                </TouchableOpacity>
                <Text style={[styles.menuModalTitle, styles.menuSubTitle]}>Account e sicurezza</Text>
                <ScrollView style={styles.menuTabScroll} contentContainerStyle={styles.menuSettingsContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.menuSectionBlock}>
                    <Text style={styles.settingsSectionTitle}>Cambio password</Text>
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
                      accessibilityLabel="Cambio Password"
                    >
                      <FontAwesome name="lock" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>Cambio Password</Text>
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
                          <Text style={styles.closeModal}>Annulla</Text>
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
                        Alert.alert('Supporto', 'Contatta il supporto: support@oxyreal.app');
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
                      accessibilityLabel="Lingua"
                    >
                      <FontAwesome name="globe" size={20} color="#c5a059" />
                      <Text style={styles.settingsRowText}>Lingua</Text>
                      <Text style={[styles.settingsRowText, { color: '#888', fontSize: 13 }]}>{LANGUAGE_LABELS[language] || language}</Text>
                      <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.menuSectionBlock}>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(t('settings.logout.confirmTitle'), t('settings.logout.confirmBody'), [
                          { text: 'Annulla' },
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
            ) : menuSubView ? (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView(null); }}
                  style={styles.menuBackRow}
                >
                  <FontAwesome name="arrow-left" size={20} color="#c5a059" style={{ marginRight: 8 }} />
                  <Text style={[styles.settingsRowText, { color: '#c5a059' }]}>Indietro</Text>
                </TouchableOpacity>
                <Text style={[styles.menuModalTitle, styles.menuSubTitle]}>
                  {menuSubView === 'privacy'
                    ? legalContent.privacyPolicy.title
                    : menuSubView === 'termini'
                      ? legalContent.termsOfService.title
                      : menuSubView === 'abbonamento'
                        ? 'Piani, abbonamenti e Lifetime'
                        : legalContent.subscription.title}
                </Text>
                <ScrollView style={styles.menuTabScroll} contentContainerStyle={[styles.menuSettingsContent, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
                  {menuSubView === 'privacy' ? (
                    <>
                      <Text style={[styles.settingsRowText, { fontSize: 12, lineHeight: 18, color: '#d1d1d1' }]}>
                        {[
                          legalContent.privacyPolicy.intro,
                          ...(legalContent.privacyPolicy.sections || []).map((s) => `${s.title}\n${s.content}`),
                          legalContent.privacyPolicy.footer ? `\n${legalContent.privacyPolicy.footer}` : ''
                        ].filter(Boolean).join('\n\n')}
                      </Text>
                    </>
                  ) : menuSubView === 'termini' ? (
                    <>
                      <Text style={[styles.settingsRowText, { fontSize: 12, lineHeight: 18, color: '#d1d1d1' }]}>
                        {[
                          ...(legalContent.termsOfService.sections || []).map((s) => `${s.title}\n${s.content}`),
                          `\nUltimo aggiornamento: ${legalContent.lastUpdated}`
                        ].filter(Boolean).join('\n\n')}
                      </Text>
                    </>
                  ) : menuSubView === 'abbonamento' ? (
                    <>
                      <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#d1d1d1', marginBottom: 12 }]}>
                        Scegli come vuoi vivere OXY: con un abbonamento (OXY Pass) con chiave inclusa, oppure con una versione Lifetime in cui usi la tua Oxy Key.
                      </Text>
                      <View style={{ paddingVertical: 8, marginBottom: 8 }}>
                        <Text style={[styles.settingsSectionTitle, { marginBottom: 4 }]}>Il tuo stato</Text>
                        {billingStatus.loading ? (
                          <Text style={[styles.settingsRowText, { color: '#d1d1d1' }]}>Verifico il tuo abbonamento…</Text>
                        ) : billingStatus.active ? (
                          <>
                            <Text style={[styles.settingsRowText, { color: '#c5a059' }]}>
                              Piano attivo: {billingStatus.planId || 'non riconosciuto'}
                            </Text>
                            <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 4 }]}>
                              Se hai cambiato piano da poco, potrebbe volerci qualche minuto perché lo stato si aggiorni ovunque.
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.settingsRowText, { color: '#d1d1d1' }]}>
                              Nessun abbonamento attivo rilevato per questo account.
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                refreshBillingStatus();
                              }}
                              style={[styles.settingsRowBtn, { marginTop: 8, alignSelf: 'flex-start' }]}
                            >
                              <Text style={[styles.settingsRowText, { color: '#c5a059' }]}>Rileggi stato abbonamento</Text>
                              <FontAwesome name="refresh" size={14} color="#c5a059" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                      <Text style={[styles.settingsSectionTitle, { marginTop: 4, marginBottom: 8 }]}>Abbonamenti OXY Pass</Text>
                      {PLANS.filter((p) => p.group === 'subscription').map((plan) => (
                        <View key={plan.id} style={[styles.settingsRow, { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
                          <Text style={[styles.settingsRowText, { fontWeight: '600' }]}>{plan.name}</Text>
                          <Text style={[styles.settingsRowText, { marginTop: 2, color: '#c5a059' }]}>
                            {plan.suggestedPrice.toFixed(2).replace('.', ',')} {CURRENCY_DEFAULT} / mese
                          </Text>
                          <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 13, color: '#d1d1d1' }]}>
                            {plan.description}
                          </Text>
                          <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 12, color: '#888' }]}>
                            Chiave OXY inclusa · uso equo con limiti giornalieri pensati per mantenere stabili prestazioni e qualità del servizio per tutti.
                          </Text>
                          {plan.upgradeTargetId && plan.upgradeMessaging ? (
                            <TouchableOpacity
                              style={[styles.settingsRowBtn, { marginTop: 8, alignSelf: 'stretch' }]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const targetId = plan.upgradeTargetId || plan.id;
                                openCheckoutForPlan(targetId);
                              }}
                            >
                              <Text style={[styles.settingsRowText, { color: '#c5a059' }]}>{plan.upgradeMessaging.cta}</Text>
                              <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                            </TouchableOpacity>
                          ) : null}
                          {plan.upgradeMessaging?.subtitle ? (
                            <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 12, color: '#888' }]}>
                              {plan.upgradeMessaging.subtitle}
                            </Text>
                          ) : null}
                        </View>
                      ))}

                      <Text style={[styles.settingsSectionTitle, { marginTop: 16, marginBottom: 8 }]}>Versioni Lifetime (una tantum)</Text>
                      <Text style={[styles.settingsRowText, { marginBottom: 8, fontSize: 13, color: '#d1d1d1' }]}>
                        Le versioni Lifetime richiedono la tua Oxy Key (chiave OpenAI personale): i costi dei token restano a tuo carico, OXY ti dà l’interfaccia e la memoria.
                      </Text>
                      {PLANS.filter((p) => p.group === 'lifetime').map((plan) => (
                        <View key={plan.id} style={[styles.settingsRow, { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 }]}>
                          <Text style={[styles.settingsRowText, { fontWeight: '600' }]}>{plan.name}</Text>
                          <Text style={[styles.settingsRowText, { marginTop: 2, color: '#c5a059' }]}>
                            {plan.suggestedPrice.toFixed(2).replace('.', ',')} {CURRENCY_DEFAULT} una tantum
                          </Text>
                          <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 13, color: '#d1d1d1' }]}>
                            {plan.description}
                          </Text>
                          <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 12, color: '#888' }]}>
                            Richiede la tua Oxy Key · l’uso dei modelli viene conteggiato sul tuo account OpenAI.
                          </Text>
                          {plan.upgradeTargetId && plan.upgradePricing ? (
                            <>
                              <TouchableOpacity
                                style={[styles.settingsRowBtn, { marginTop: 8, alignSelf: 'stretch' }]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                  const targetId = plan.upgradeTargetId || plan.id;
                                  openCheckoutForPlan(targetId);
                                }}
                              >
                                <Text style={[styles.settingsRowText, { color: '#c5a059' }]}>
                                  Upgrade a piano superiore ({plan.upgradePricing.difference.toFixed(2).replace('.', ',')} {CURRENCY_DEFAULT})
                                </Text>
                                <FontAwesome name="chevron-right" size={14} color="#c5a059" />
                              </TouchableOpacity>
                              <Text style={[styles.settingsRowText, { marginTop: 4, fontSize: 12, color: '#888' }]}>
                                {plan.upgradePricing.explainer}
                              </Text>
                              <Text style={[styles.settingsRowText, { marginTop: 2, fontSize: 12, color: '#888' }]}>
                                {plan.upgradePricing.example}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      ))}
                    </>
                  ) : (
                    <>
                      {legalContent.subscription.sections.map((s) => (
                        <View key={s.id} style={{ marginBottom: 16 }}>
                          <Text style={[styles.settingsSectionTitle, { marginBottom: 6 }]}>{s.title}</Text>
                          <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#d1d1d1' }]}>{s.content}</Text>
                        </View>
                      ))}
                      <Text style={[styles.settingsRowText, { lineHeight: 22, color: '#c5a059', marginTop: 8 }]}>{legalContent.subscription.contactNote}</Text>
                    </>
                  )}
                </ScrollView>
              </View>
            ) : (
              <ScrollView style={styles.menuTabScroll} contentContainerStyle={styles.menuSettingsContent} showsVerticalScrollIndicator={false}>
                {/* Sezione: Profilo e assistente */}
                <View style={[styles.menuSectionBlock, { marginTop: 0, paddingTop: 0, borderTopWidth: 0 }]}>
                  <Text style={styles.settingsSectionTitle}>Profilo e assistente</Text>
                  <TouchableOpacity
                    style={styles.menuEntryRow}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('profilo'); }}
                    accessibilityLabel="Profilo, voce e foto"
                  >
                    <FontAwesome name="user-circle" size={20} color="#c5a059" />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.settingsRowText}>Profilo, voce e foto</Text>
                      <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>Nome IA, voce, risposta a voce, foto profilo</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                </View>

                {/* Sezione: Account e sicurezza */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>Account e sicurezza</Text>
                  <TouchableOpacity
                    style={styles.menuEntryRow}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('sicurezza'); }}
                    accessibilityLabel="Password, 2FA e supporto"
                  >
                    <FontAwesome name="lock" size={20} color="#c5a059" />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.settingsRowText}>Password, 2FA e supporto</Text>
                      <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 2 }]}>Cambio password, verifica in due passaggi, lingua, esci</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                </View>

                {/* Sezione: Legale e abbonamento */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>Legale e abbonamento</Text>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('privacy'); }}
                    accessibilityLabel="Privacy policy"
                  >
                    <FontAwesome name="shield" size={20} color="#c5a059" />
                    <Text style={styles.settingsRowText}>Privacy policy</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('termini'); }}
                    accessibilityLabel="Termini di servizio"
                  >
                    <FontAwesome name="file-text" size={20} color="#c5a059" />
                    <Text style={styles.settingsRowText}>Termini di servizio</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuSubView('abbonamento'); }}
                    accessibilityLabel="Abbonamento e pagamenti"
                  >
                    <FontAwesome name="credit-card" size={20} color="#c5a059" />
                    <Text style={styles.settingsRowText}>Abbonamento e pagamenti</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                </View>

                {/* Sezione: Cloud e dati */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>Cloud e dati</Text>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowMenuModal(false);
                      setViewAttiva('cloud');
                    }}
                    accessibilityLabel="Gestisci Cloud"
                  >
                    <FontAwesome name="cloud" size={20} color="#c5a059" />
                    <Text style={styles.settingsRowText}>Gestisci Cloud</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                </View>

                {/* Sezione: Chat e gruppi */}
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

                {/* Oxy Key: solo in one_time_purchase */}
                {!isMasterUser(userData?.emailPrincipale) && SHOW_OXy_KEY_OPTION ? (
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
                              'Sostituire chiave API?',
                              'Hai già una chiave configurata. La chiave attuale verrà sostituita e non potrai più recuperarla. Continuare?',
                              [
                                { text: 'Annulla' },
                                {
                                  text: 'Sostituisci',
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
                          <Text style={styles.settingsRowText}>Modifica chiave API</Text>
                          <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.settingsRowBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Alert.alert(
                              'Rimuovi Oxy Key',
                              'Rimuovendo la chiave non potrai usare chat e Vision AI finché non ne inserisci una nuova.',
                              [
                                { text: 'Annulla' },
                                {
                                  text: 'Rimuovi',
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

                {/* Sezione: Sistema */}
                <View style={styles.menuSectionBlock}>
                  <Text style={styles.settingsSectionTitle}>Sistema</Text>
                  <TouchableOpacity
                    style={styles.settingsRowBtn}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const url = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');
                      if (!url) {
                        Alert.alert('Verifica server', 'EXPO_PUBLIC_BACKEND_URL non è impostato nel file .env. Aggiungi l\'URL del backend (es. http://10.24.65.179:3030) e riavvia l\'app.');
                        return;
                      }
                      try {
                        const ctrl = new AbortController();
                        const to = setTimeout(() => ctrl.abort(), 8000);
                        const res = await fetch(`${url}/health`, { signal: ctrl.signal });
                        clearTimeout(to);
                        if (res.ok) {
                          const data = await res.json().catch(() => ({}));
                          Alert.alert('Verifica server', `Server raggiungibile.\n${data?.service || ''} ${data?.time ? '\n' + data.time : ''}`);
                        } else {
                          Alert.alert('Verifica server', `Il server ha risposto con errore: ${res.status}. Controlla che il backend sia avviato (npm start in backend/).`);
                        }
                      } catch (e) {
                        const msg = e?.name === 'AbortError' ? 'Timeout: il server non risponde in tempo.' : (e?.message || 'Impossibile raggiungere il server.');
                        Alert.alert('Verifica server', msg + '\n\n• Backend: npm start in backend/\n• Stessa rete Wi‑Fi (il cavo USB non basta per le chiamate)\n• .env: EXPO_PUBLIC_BACKEND_URL = IP del PC (ipconfig), porta 3030\n• Firewall: consenti porta 3030');
                      }
                    }}
                    accessibilityLabel="Verifica server"
                  >
                    <FontAwesome name="server" size={20} color="#c5a059" />
                    <Text style={styles.settingsRowText}>Verifica server</Text>
                    <FontAwesome name="chevron-right" size={14} color="#d1d1d1" />
                  </TouchableOpacity>
                  <View style={[styles.settingsRow, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 }]}>
                    <Text style={[styles.settingsRowText, { fontSize: 13 }]}>Ricerca web</Text>
                    <Text style={[styles.settingsRowText, { fontSize: 12, color: '#888', marginTop: 4 }]}>
                      La ricerca web in tempo reale è disponibile quando configurata sul server. Se non configurata, l'IA risponderà usando solo la sua conoscenza fino a Ottobre 2023.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
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
                <Text style={styles.closeModal}>Chiudi</Text>
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
              <Text style={styles.powerBadgesTitle}>MEMORY VAULT</Text>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMemoryVaultModal(false); }}
                style={styles.powerBadgesCloseBtn}
              >
                <FontAwesome name="times" size={24} color="#c5a059" />
              </TouchableOpacity>
            </View>
            {memoryVaultLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#c5a059" />
                <Text style={{ color: '#d1d1d1', marginTop: 12 }}>Caricamento...</Text>
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
                  <Text style={styles.memoryVaultRetryBtnText}>Riprova</Text>
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
                    <Text style={styles.memoryVaultSectionTitle}>Obiettivi</Text>
                    {memoryVaultData.goals.map((note) => (
                      <View key={note.id} style={[styles.memoryVaultSection, styles.memoryVaultNoteRow]}>
                        <View style={styles.memoryVaultNoteTextWrap}>
                          <Text style={styles.memoryVaultText}>{note.text}</Text>
                        </View>
                        <TouchableOpacity
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          onPress={() => {
                            Alert.alert('Elimina nota', 'Vuoi eliminare solo questa nota?', [
                              { text: 'Annulla', style: 'cancel' },
                              { text: 'Elimina', style: 'destructive', onPress: async () => {
                                try {
                                  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                  if (idToken) {
                                    await deleteMemoryNote(idToken, note.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    await refetchMemoryVault(false);
                                  }
                                } catch (e) {
                                  Alert.alert('Errore', e?.message || 'Impossibile cancellare.');
                                }
                              } },
                            ]);
                          }}
                          style={styles.memoryVaultClearBtn}
                          accessibilityLabel="Elimina questa nota"
                        >
                          <FontAwesome name="trash-o" size={16} color="rgba(197,160,89,0.8)" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
                {Array.isArray(memoryVaultData?.keyFacts) && memoryVaultData.keyFacts.length > 0 ? (
                  <View style={styles.memoryVaultSection}>
                    <Text style={styles.memoryVaultSectionTitle}>Cosa ricordo di te</Text>
                    {memoryVaultData.keyFacts.map((note) => (
                      <View key={note.id} style={[styles.memoryVaultSection, styles.memoryVaultNoteRow]}>
                        <View style={styles.memoryVaultNoteTextWrap}>
                          <Text style={styles.memoryVaultText}>{note.text}</Text>
                        </View>
                        <TouchableOpacity
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          onPress={() => {
                            Alert.alert('Elimina nota', 'Vuoi eliminare solo questa nota?', [
                              { text: 'Annulla', style: 'cancel' },
                              { text: 'Elimina', style: 'destructive', onPress: async () => {
                                try {
                                  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                  if (idToken) {
                                    await deleteMemoryNote(idToken, note.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    await refetchMemoryVault(false);
                                  }
                                } catch (e) {
                                  Alert.alert('Errore', e?.message || 'Impossibile cancellare.');
                                }
                              } },
                            ]);
                          }}
                          style={styles.memoryVaultClearBtn}
                          accessibilityLabel="Elimina questa nota"
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
                      <Text style={styles.memoryVaultSectionTitle}>Identità</Text>
                      <TouchableOpacity
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        onPress={() => {
                          Alert.alert('Elimina identità', 'Vuoi cancellare la sintesi identità dalla memoria?', [
                            { text: 'Annulla', style: 'cancel' },
                            { text: 'Elimina', style: 'destructive', onPress: async () => {
                              try {
                                const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                if (idToken) await clearMemorySections(idToken, ['identitySummary']);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                await refetchMemoryVault(false);
                              } catch (e) {
                                Alert.alert('Errore', e?.message || 'Impossibile cancellare.');
                              }
                            } },
                          ]);
                        }}
                        style={styles.memoryVaultClearBtn}
                        accessibilityLabel="Elimina identità"
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
                      <Text style={styles.memoryVaultSectionTitle}>Ultimo contesto</Text>
                      <TouchableOpacity
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        onPress={() => {
                          Alert.alert('Elimina ultimo contesto', 'Vuoi cancellare questa sezione dalla memoria?', [
                            { text: 'Annulla', style: 'cancel' },
                            { text: 'Elimina', style: 'destructive', onPress: async () => {
                              try {
                                const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
                                if (idToken) await clearMemorySections(idToken, ['lastContext']);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                await refetchMemoryVault(false);
                              } catch (e) {
                                Alert.alert('Errore', e?.message || 'Impossibile cancellare.');
                              }
                            } },
                          ]);
                        }}
                        style={styles.memoryVaultClearBtn}
                        accessibilityLabel="Elimina ultimo contesto"
                      >
                        <FontAwesome name="trash-o" size={16} color="rgba(197,160,89,0.8)" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.memoryVaultText}>{memoryVaultData.lastContext}</Text>
                  </View>
                ) : null}
                {!memoryVaultLoading && memoryVaultData && !(Array.isArray(memoryVaultData.goals) && memoryVaultData.goals.length > 0) && !(Array.isArray(memoryVaultData.keyFacts) && memoryVaultData.keyFacts.length > 0) && !memoryVaultData.identitySummary && !memoryVaultData.lastContext ? (
                  <Text style={styles.memoryVaultEmpty}>Ancora nulla. Usa "Salva come obiettivo" o "Ricordamelo" sui messaggi di {effectiveAiName} per riempire la memoria.</Text>
                ) : null}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Diario (roadmap Anima) */}
      <Modal
        visible={showDiaryModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowDiaryModal(false)}
      >
        <View style={styles.powerBadgesOverlay}>
          <SafeAreaView style={styles.powerBadgesContent}>
            <View style={styles.powerBadgesHeader}>
              <Text style={styles.powerBadgesTitle}>DIARIO</Text>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDiaryModal(false); setDiaryNewEntry(''); }}
                style={styles.powerBadgesCloseBtn}
              >
                <FontAwesome name="times" size={24} color="#c5a059" />
              </TouchableOpacity>
            </View>
            {diaryLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#c5a059" />
                <Text style={{ color: '#d1d1d1', marginTop: 12 }}>Caricamento...</Text>
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
                      <View key={entry.id} style={[styles.memoryVaultSection, { marginTop: 8 }]}>
                        <Text style={{ color: '#c5a059', fontSize: 12, marginBottom: 4 }}>{entry.date}</Text>
                        <Text style={styles.memoryVaultText}>{entry.content}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.memoryVaultEmpty}>Nessuna nota ancora. Scrivi qualcosa qui sotto e OXY la ricorderà nel tempo.</Text>
                  )}
                </ScrollView>
                <View style={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(197,160,89,0.2)' }}>
                  <TextInput
                    style={[styles.settingsInputInline, { minHeight: 80, textAlignVertical: 'top', marginBottom: 10 }]}
                    placeholder="Aggiungi una riflessione o un pensiero..."
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
                        Alert.alert('Errore', e?.message || 'Impossibile salvare.');
                      } finally {
                        setDiarySaving(false);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={!diaryNewEntry.trim() || diarySaving}
                  >
                    <Text style={styles.memoryVaultRetryBtnText}>{diarySaving ? 'Salvataggio...' : 'Salva'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Storie (roadmap Anima) */}
      <Modal
        visible={showStoriesModal}
        animationType="none"
        transparent
        onRequestClose={() => { setShowStoriesModal(false); setLastCompletedStoryTitle(null); }}
      >
        <View style={styles.powerBadgesOverlay}>
          <SafeAreaView style={styles.powerBadgesContent}>
            <View style={styles.powerBadgesHeader}>
              <Text style={styles.powerBadgesTitle}>STORIE</Text>
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
                <Text style={{ color: '#d1d1d1', marginTop: 12 }}>Caricamento...</Text>
              </View>
            ) : storyState.currentStoryId ? (() => {
              const story = STORIES.find((s) => s.id === storyState.currentStoryId);
              if (!story) return <Text style={styles.memoryVaultEmpty}>Storia non trovata.</Text>;
              const step = story.steps[storyState.stepIndex];
              const isLast = storyState.stepIndex >= story.steps.length - 1;
              const isFirst = storyState.stepIndex === 0;
              const buttonLabel = isLast ? 'Ho finito — parliamone in chat' : isFirst ? 'Sì, ci provo' : 'Fatto, prossimo passo';
              return (
                <View style={{ flex: 1, padding: 20 }}>
                  <Text style={[styles.memoryVaultSectionTitle, { marginBottom: 12 }]}>{story.title}</Text>
                  <Text style={[styles.memoryVaultText, { marginBottom: 24 }]}>{step?.text}</Text>
                  <Text style={[styles.memoryVaultText, { marginBottom: 12, fontSize: 13, color: 'rgba(197,160,89,0.9)' }]}>
                    {isFirst
                      ? 'Prenditi un attimo per riflettere su quello che hai letto, poi tocca sotto quando sei pronto.'
                      : isLast
                        ? 'Quando sei pronto, tocca sotto e torna in chat per parlarne con ' + effectiveAiName + '.'
                        : 'Prenditi un attimo, poi continua.'}
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
                          setLastCompletedStoryTitle(story.title);
                        } else {
                          await saveStoryState(idToken, { stepIndex: storyState.stepIndex + 1 });
                          track(EVENTS.STORY_STEP, { storyId: story.id, step: storyState.stepIndex + 1 }, idToken);
                          await refetchStoryState();
                        }
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (e) {
                        Alert.alert('Errore', e?.message || 'Impossibile salvare.');
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
                <Text style={[styles.memoryVaultSectionTitle, { marginBottom: 8 }]}>A cosa servono le Storie</Text>
                <Text style={[styles.memoryVaultText, { marginBottom: 4 }]}>Sono percorsi brevi per riflettere e fare un piccolo passo. Non è una lettura da saltare: leggi il passo, prenditi un attimo (o fai l’azione nella vita reale), poi tocca il pulsante quando sei pronto.</Text>
                <Text style={[styles.memoryVaultText, { marginBottom: 16, fontStyle: 'italic', color: 'rgba(197,160,89,0.95)' }]}>Alla fine di ogni storia puoi parlarne in chat con {effectiveAiName} — è lì che prende senso.</Text>
                <Text style={[styles.memoryVaultText, { marginBottom: 12, fontSize: 13, color: '#888' }]}>Scegli una storia:</Text>
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
                        Alert.alert('Errore', e?.message || 'Impossibile avviare.');
                      }
                    }}
                  >
                    <View style={styles.promptRowIcon}>
                      <FontAwesome name="align-left" size={18} color="#c5a059" />
                    </View>
                    <Text style={styles.promptRowLabel}>{story.title}</Text>
                    <FontAwesome name="chevron-right" size={12} color="rgba(197,160,89,0.5)" />
                  </TouchableOpacity>
                ))}
                {(storyState.completed || []).length > 0 ? (
                  <View style={{ marginTop: 20 }}>
                    {lastCompletedStoryTitle ? (
                      <>
                        <Text style={[styles.memoryVaultText, { marginBottom: 12 }]}>Hai completato «{lastCompletedStoryTitle}». Parlarne con {effectiveAiName} è il passo che dà senso al percorso.</Text>
                        <TouchableOpacity
                          style={[styles.memoryVaultRetryBtn, { alignSelf: 'stretch' }]}
                          onPress={() => {
                            setInputMessage(`Ho appena completato la storia "${lastCompletedStoryTitle}". Vorrei parlarne.`);
                            setShowStoriesModal(false);
                            setLastCompletedStoryTitle(null);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.memoryVaultRetryBtnText}>Parlane con {effectiveAiName}</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={[styles.memoryVaultEmpty]}>Completate: {(storyState.completed || []).length}. Torna in chat per parlarne con {effectiveAiName}.</Text>
                    )}
                  </View>
                ) : null}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Community (placeholder roadmap 3.1) */}
      <Modal
        visible={showCommunityModal}
        animationType="none"
        transparent
        onRequestClose={() => setShowCommunityModal(false)}
      >
        <View style={styles.powerBadgesOverlay}>
          <SafeAreaView style={styles.powerBadgesContent}>
            <View style={styles.powerBadgesHeader}>
              <Text style={styles.powerBadgesTitle}>COMMUNITY</Text>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCommunityModal(false); }}
                style={styles.powerBadgesCloseBtn}
              >
                <FontAwesome name="times" size={24} color="#c5a059" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <FontAwesome name="users" size={48} color="rgba(197,160,89,0.5)" style={{ marginBottom: 16 }} />
              <Text style={[styles.memoryVaultSectionTitle, { textAlign: 'center', marginBottom: 8 }]}>In arrivo</Text>
              <Text style={[styles.memoryVaultText, { textAlign: 'center' }]}>Forum e gruppi di supporto saranno disponibili in un prossimo aggiornamento.</Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal Crea Chat di Gruppo */}
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
              placeholder="Nome del gruppo"
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
                    Alert.alert('Limite raggiunto', `Massimo ${MAX_GROUP_MEMBERS - 1} membri oltre a te.`);
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
                  Alert.alert('Nome mancante', 'Inserisci un nome per il gruppo.');
                  return;
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Gruppo creato', `Gruppo "${groupNameInput.trim()}" creato con ${groupMembers.length} membro/i. Funzionalità in arrivo.`);
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
              <Text style={styles.messageMenuLabel}>
                {language === 'en' ? 'Copy' : language === 'ar' ? 'نسخ' : 'Copia'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageMenuItem}
              onPress={handleForwardMessage}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-redo-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
              <Text style={styles.messageMenuLabel}>
                {language === 'en' ? 'Forward' : language === 'ar' ? 'إعادة توجيه' : 'Inoltra'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageMenuItem}
              onPress={handleShareMessage}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
              <Text style={styles.messageMenuLabel}>
                {language === 'en' ? 'Share' : language === 'ar' ? 'مشاركة' : 'Condividi'}
              </Text>
            </TouchableOpacity>
            {selectedMessageFromBot ? (
              <>
                <TouchableOpacity
                  style={styles.messageMenuItem}
                  onPress={handleSaveAsGoal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
                  <Text style={styles.messageMenuLabel}>Salva come obiettivo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.messageMenuItem}
                  onPress={handleRememberThis}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bookmark-outline" size={22} color={GOLD_ICON} style={styles.messageMenuIcon} />
                  <Text style={styles.messageMenuLabel}>Ricordamelo</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <View style={styles.messageMenuDivider} />
            <TouchableOpacity
              style={[styles.messageMenuItem, styles.messageMenuCancel]}
              onPress={closeMessageMenu}
              activeOpacity={0.7}
            >
              <Text style={styles.messageMenuCancelLabel}>
                {language === 'en' ? 'Cancel' : language === 'ar' ? 'إلغاء' : 'Annulla'}
              </Text>
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
                {messaggi.map((m) => {
                  const isUser = m.tipo === 'user';
                  const senderLabel = isUser ? (language === 'ar' ? 'أنت' : language === 'en' ? 'You' : 'Tu') : effectiveAiName;
                  const timeStr = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const msgText = m.testo || '';
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
                            m.tipo === 'bot' && m.id === '1'
                              ? { fontStyle: 'italic', color: '#c5a059' }
                              : {},
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
                  <Text style={styles.stickyBadgeChipLabel} numberOfLines={1}>Modalità: {stickyBadge.label}</Text>
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStickyBadge(null); }}
                    style={styles.stickyBadgeChipExit}
                    accessibilityLabel="Esci da modalità"
                  >
                    <Text style={styles.stickyBadgeChipExitText}>Esci</Text>
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
              <View style={styles.superBar} collapsable={false}>
                <TouchableOpacity
                  style={[styles.superBarCamera, voiceReplyMode && styles.voiceReplyToggleActive]}
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
                  <FontAwesome name="volume-up" size={18} color={voiceReplyMode ? '#c5a059' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.superBarCamera, styles.superBarCameraRight]}
                  onPress={handleCameraVision}
                  accessibilityLabel={t('chat.visionLabel')}
                >
                  <FontAwesome name="camera" size={22} color="#c5a059" />
                </TouchableOpacity>
                <TextInput
                  style={styles.superBarInput}
                  placeholder={t('chat.inputPlaceholder')}
                  placeholderTextColor="#d1d1d1"
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  maxLength={MAX_MESSAGE_LENGTH}
                  multiline
                  selectionColor="#c5a059"
                  onSubmitEditing={() => {
                    if (inputMessage.trim() && !staCaricando) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      sendMessage();
                    }
                  }}
                  onKeyPress={(e) => {
                    const { key, shiftKey } = e?.nativeEvent || {};
                    if (key === 'Enter' && !shiftKey && inputMessage.trim() && !staCaricando) {
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
                              chatAbortControllerRef.current?.abort();
                            }}
                            accessibilityLabel={t('chat.stopResponseLabel')}
                          >
                            <FontAwesome name="stop" size={18} color="#0a0a0a" />
                            <Text style={styles.superBarStopText}>{t('chat.stopButton')}</Text>
                          </TouchableOpacity>
                        ) : inputMessage.trim() ? (
                          <TouchableOpacity
                            style={styles.superBarSend}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              sendMessage();
                            }}
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
            style={styles.cloudBackBtn}
            onPress={() => { setViewAttiva('chat'); setSorgenteSelezionata(null); }}
            accessibilityLabel="Torna alla chat"
          >
            <Text style={styles.cloudBackBtnText}>{t('cloud.backToChat')}</Text>
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
                onPress={() => setSorgenteSelezionata('drive')}
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
                onPress={() => setSorgenteSelezionata('icloud')}
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
                onPress={() => setSorgenteSelezionata('locale')}
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
                onPress={() => setSorgenteSelezionata('server')}
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

            {sorgenteSelezionata === 'server' && (
              <View style={styles.configPanel}>
                <Text style={styles.configTitle}>{t('cloud.serverConfigTitle')}</Text>
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
                  style={styles.saveConfigBtn}
                  onPress={() => {
                    Alert.alert(t('cloud.comingSoon'), t('cloud.serverComingSoon'));
                  }}
                >
                  <Text style={styles.saveConfigBtnText}>{t('cloud.serverConnectButton')}</Text>
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
    backgroundColor: 'transparent',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: 'transparent',
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
  menuSubTitle: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  menuSectionBlock: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  menuEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
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
  hamburger: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
    backgroundColor: 'rgba(0,43,77,0.95)',
    justifyContent: 'flex-start',
  },
  powerBadgesContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  powerBadgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  powerBadgesTitle: {
    color: '#c5a059',
    fontSize: 24,
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
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: 40,
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
    justifyContent: 'space-between',
    paddingBottom: 40,
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
  settingsRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
