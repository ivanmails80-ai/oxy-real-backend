/**
 * AuthScreen — Login e Registrazione con Firebase Auth
 * Logo OXY + Real + Real Identity (breathing), accesso Google/Apple/Microsoft,
 * flusso registrazione a step: Lingua → Dati personali → Sicurezza finale.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CountryPicker, { DARK_THEME } from '../components/CountryPickerAdapter';
import { signInWithEmailPassword, signUpWithProfile, requestPasswordReset } from '../services/authService';
import { signInWithGoogle, signInWithApple } from '../services/socialAuthService';
import { LANGUAGES, LANGUAGE_LABELS } from '../i18n/translations';
import { Ionicons } from '@expo/vector-icons';
import { VOICE_OPTIONS, DEFAULT_VOICE_ID } from '../data/voiceOptions';

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
  const size = large ? 42 : 28;
  const spacing = large ? 4 : 3;
  return (
    <View style={styles.logoAnimWrap}>
      <Animated.View style={[styles.logoRow, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={[styles.logoBold, { fontSize: size, letterSpacing: spacing }]}>OXY</Text>
        <Text style={[styles.logoItalic, { fontSize: size, letterSpacing: spacing, marginLeft: 2 }]}>Real</Text>
      </Animated.View>
      <Text style={styles.taglineLogo}>Real Identity</Text>
    </View>
  );
};

export default function AuthScreen({ onSuccess, onOpenLanguage, language, onLanguageChange, t = (k) => k }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [regStep, setRegStep] = useState('voice'); // 'voice' | 'personal' | 'security' — lingua scelta al primo avvio dell'app
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const consentsAccepted = consentTerms && consentPrivacy;
  const [consentRequiredForUser, setConsentRequiredForUser] = useState(true);

  const backendUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');

  useEffect(() => {
    if (!backendUrl || !email.trim()) {
      setConsentRequiredForUser(true);
      return;
    }
    if (!VALIDATION.email.test(email.trim())) {
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

  const effectiveConsents = consentsAccepted || !consentRequiredForUser;

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

  const handleToggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setRegStep('voice');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSocial = async (provider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (provider === 'Microsoft') {
      Alert.alert(t('common.loading') || 'In arrivo', 'Accesso con Microsoft sarà disponibile a breve.');
      return;
    }
    setLoading(true);
    try {
      let result;
      if (provider === 'Google') {
        result = await signInWithGoogle();
      } else if (provider === 'Apple') {
        result = await signInWithApple();
      } else {
        setLoading(false);
        return;
      }
      if (result?.session && result?.profile) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess?.({ session: result.session, profile: result.profile });
      }
    } catch (err) {
      const msg = err?.message || 'Errore di accesso. Riprova.';
      Alert.alert('Accesso ' + provider, msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const e = email.trim();
    const p = (password || '').trim();
    if (!e) {
      Alert.alert(t('login.error.missingEmailTitle'), t('login.error.missingEmailBody'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!p) {
      Alert.alert(t('register.validation.passwordMatch') || 'Password mancante', 'Inserisci la password.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!VALIDATION.email.test(e)) {
      Alert.alert(t('register.validation.emailMain') || 'Email non valida', 'Inserisci un indirizzo email valido.');
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
        Alert.alert('Accesso negato', 'Email o password non corretti. Controlla che l\'email sia quella con cui ti sei registrato e che la password non abbia spazi extra.');
      } else if (msg.includes('user-not-found') || code.includes('user-not-found')) {
        Alert.alert('Utente non trovato', 'Nessun account con questa email. Registrati.');
      } else if (msg.includes('too-many-requests') || code.includes('too-many-requests')) {
        Alert.alert('Troppi tentativi', 'Attendi qualche minuto e riprova.');
      } else {
        const raw = err?.message || String(err);
        Alert.alert('Errore di accesso', raw && raw.length < 200 ? raw : 'Impossibile accedere. Riprova.');
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
      Alert.alert(t('register.validation.title'), 'Compila tutti i campi obbligatori.');
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
        Alert.alert('Email già in uso', 'Esiste già un account con questa email. Accedi.');
      } else if (msg.includes('weak-password')) {
        Alert.alert('Password debole', t('register.passwordHint'));
      } else {
        Alert.alert(t('register.error.title'), msg && msg.length < 150 ? msg : t('register.error.body'));
      }
    } finally {
      setLoading(false);
    }
  };

  const goNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (regStep === 'voice') setRegStep('personal');
    else if (regStep === 'personal') setRegStep('security');
  };

  const goBackStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (regStep === 'security') setRegStep('personal');
    else if (regStep === 'personal') setRegStep('voice');
    else if (regStep === 'voice') handleToggleMode();
  };

  const inputWrap = [styles.input, styles.inputRow];
  const currentLang = language || 'it';

  return (
    <LinearGradient colors={['#002b4d', '#002b4d']} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoWrap}>
              <OxyLogoAuth large />
            </View>

            {/* ---------- LOGIN ---------- */}
            {mode === 'login' && (
              <>
                <View style={styles.socialWrap}>
                  <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocial('Google')}>
                    <FontAwesome name="google" size={20} color="#fff" />
                    <Text style={styles.socialBtnText}>{t('login.social.google')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocial('Apple')}>
                    <FontAwesome name="apple" size={20} color="#fff" />
                    <Text style={styles.socialBtnText}>{t('login.social.apple')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocial('Microsoft')}>
                    <FontAwesome name="windows" size={20} color="#fff" />
                    <Text style={styles.socialBtnText}>{t('login.social.microsoft')}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.orText}>{t('login.or')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('login.username.placeholder')}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={inputWrap}>
                  <TextInput
                    style={styles.inputInner}
                    placeholder={t('login.password.placeholder')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                  />
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPasswordVisible((v) => !v); }}
                    style={styles.eyeBtn}
                  >
                    <FontAwesome name={passwordVisible ? 'eye-slash' : 'eye'} size={18} color="#c5a059" />
                  </TouchableOpacity>
                </View>
                {/* Blocco legale: consensi obbligatori prima del login (salvo proprietario: backend ritorna consentRequired false) */}
                {consentRequiredForUser && (
                  <View style={styles.legalBlock}>
                    <Text style={styles.legalBlockText}>
                      {t('register.errorMissingConsent')}
                    </Text>
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
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.btn, (loading || !effectiveConsents) && styles.btnDisabled]}
                  onPress={handleLogin}
                  disabled={loading || !effectiveConsents}
                >
                  {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.btnText}>{t('login.button')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    const e = (email || '').trim();
                    if (!VALIDATION.email.test(e)) {
                      Alert.alert(t('login.error.missingEmailTitle') || 'Email richiesta', 'Inserisci la tua email nel campo sopra e tocca di nuovo "Password dimenticata?".');
                      return;
                    }
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await requestPasswordReset(e);
                      Alert.alert('Email inviata', 'Controlla la tua casella (anche spam) per il link per reimpostare la password.');
                    } catch (err) {
                      const msg = err?.message || '';
                      if (msg.includes('user-not-found')) Alert.alert('Account non trovato', 'Nessun account associato a questa email.');
                      else Alert.alert('Errore', msg || 'Impossibile inviare l\'email. Riprova più tardi.');
                    }
                  }}
                  style={styles.toggleBtn}
                >
                  <Text style={styles.forgotLink}>{t('login.forgot')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleToggleMode} style={styles.toggleBtn}>
                  <Text style={styles.toggleText}>{t('login.registerLink')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ---------- REGISTRAZIONE A STEP (lingua già scelta al primo avvio) ---------- */}
            {mode === 'register' && (
              <>
                {regStep === 'voice' && (
                  <>
                    <Text style={styles.stepTitle}>{t('register.stepVoiceTitle')}</Text>
                    <Text style={styles.stepSubtitle}>{t('register.stepVoiceSubtitle')}</Text>
                    <Text style={styles.aiNameLabel}>{t('register.aiNameLabel')}</Text>
                    <TextInput
                      style={[styles.input, styles.inputReadOnly]}
                      value={regAiName}
                      editable={false}
                      placeholderTextColor="rgba(255,255,255,0.6)"
                    />
                    {VOICE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.langOption, regVoiceId === opt.id && styles.langOptionActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setRegVoiceId(opt.id);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.langOptionText}>{opt.label}</Text>
                          <Text style={styles.voiceRegDesc}>{opt.description}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.btn} onPress={goNextStep}>
                      <Text style={styles.btnText}>{t('register.continue')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={goBackStep} style={styles.backStepBtn}>
                      <Text style={styles.toggleText}>← Indietro</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleToggleMode} style={styles.backStepBtn}>
                      <Text style={styles.toggleText}>{t('register.backToLogin')}</Text>
                    </TouchableOpacity>
                  </>
                )}

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
                    <TouchableOpacity style={styles.btn} onPress={goNextStep}>
                      <Text style={styles.btnText}>{t('register.continue')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={goBackStep} style={styles.backStepBtn}>
                      <Text style={styles.toggleText}>← Indietro</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleToggleMode} style={styles.backStepBtn}>
                      <Text style={styles.toggleText}>{t('register.backToLogin')}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {regStep === 'security' && (() => {
                  const criteria = getPasswordCriteria(password);
                  const strength = getPasswordStrength(password);
                  const passwordsMatch = criteria.trimmed === (confirmPassword || '').trim() && criteria.trimmed.length >= 8;
                  const allCriteriaMet = criteria.length && criteria.lower && criteria.upper && criteria.number && criteria.symbol;
                  const canSubmit = allCriteriaMet && passwordsMatch && !loading && consentsAccepted;
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
                      <View style={inputWrap}>
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
                      <View style={inputWrap}>
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
                      <View style={[styles.legalBlock, { marginTop: 8 }]}>
                        <Text style={styles.legalBlockText}>
                          {t('register.errorMissingConsent')}
                        </Text>
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
                        <TouchableOpacity
                          style={styles.legalCheckRow}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConsentMarketing((v) => !v); }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={consentMarketing ? 'checkbox' : 'checkbox-outline'} size={14} color="rgba(197, 160, 89, 0.8)" />
                          <Text style={styles.legalCheckText}>{t('register.consentMarketing')}</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={[styles.btn, styles.btnConfirm, !canSubmit && styles.btnConfirmDisabled]}
                        onPress={handleRegisterSubmit}
                        disabled={!canSubmit}
                        activeOpacity={canSubmit ? 0.8 : 1}
                      >
                        {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.btnText}>{t('register.button')}</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={goBackStep} style={styles.backStepBtn}>
                        <Text style={styles.toggleText}>← Indietro</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleToggleMode} style={styles.backStepBtn}>
                        <Text style={styles.toggleText}>{t('register.backToLogin')}</Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}

              </>
            )}

            {onOpenLanguage && mode === 'login' && (
              <TouchableOpacity onPress={onOpenLanguage} style={styles.langBtn}>
                <Text style={styles.toggleText}>Lingua / Language</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: 20 },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logoAnimWrap: { alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoBold: { color: '#c5a059', fontWeight: '900', textTransform: 'uppercase' },
  logoItalic: { color: '#c5a059', fontStyle: 'italic' },
  taglineLogo: { color: 'rgba(197,160,89,0.9)', fontSize: 14, fontStyle: 'italic', marginTop: 6, letterSpacing: 1 },
  socialWrap: { marginBottom: 16 },
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
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 },
  inputInner: { flex: 1, paddingHorizontal: 18, paddingRight: 44, color: '#d1d1d1', fontSize: 16 },
  eyeBtn: { position: 'absolute', right: 16, padding: 4 },
  legalBlock: { marginVertical: 10 },
  legalBlockText: {
    fontSize: 10,
    lineHeight: 12,
    color: 'rgba(197, 160, 89, 0.6)',
    textAlign: 'justify',
    marginBottom: 8,
  },
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
  btnConfirm: { opacity: 1 },
  btnConfirmDisabled: { opacity: 0.5 },
  btnText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 16 },
  toggleBtn: { alignItems: 'center', marginTop: 8 },
  backStepBtn: { alignItems: 'center', marginTop: 8 },
  toggleText: { color: '#c5a059', fontSize: 14 },
  forgotLink: { color: '#c5a059', fontSize: 14 },
  langBtn: { alignItems: 'center', marginTop: 24 },
});
