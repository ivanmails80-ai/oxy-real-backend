# Handoff: Login — tap non funzionano (occhio, Accedi, link)

**Data:** 10 febbraio 2026  
**Per:** nuovo agente che prende in carico il bug  
**Problema:** sulla schermata di **login**, i tap su **occhio** (mostra/nascondi password), **Accedi**, **Password dimenticata**, **Registrati** e **Lingua** **non vengono registrati** (o non in modo affidabile). L’utente li percepisce come “pulsanti morti”.

---

## 1. Contesto tecnico

- **App:** React Native (Expo), target Android (testato su dispositivo fisico `304edc09`).
- **File principale:** `src/screens/AuthScreen.js`
- **Schermata:** login con email (dentro ScrollView), poi **blocco fisso sotto** (fuori ScrollView): campo password + icona occhio + bottone Accedi + link (Password dimenticata, Registrati, Lingua).

---

## 2. Cosa è già stato provato (senza risolvere)

1. **`keyboardShouldPersistTaps="always"`** e **`keyboardDismissMode="none"`** sullo ScrollView — i tap continuavano a non funzionare quando i controlli erano dentro lo ScrollView.
2. **Spostare la zona critica fuori dallo ScrollView:** tutto il blocco **password + occhio + Accedi + link** è stato messo in un `View` fratello dello ScrollView (`styles.loginFixedBottom`, righe ~743–815), così che su Android lo ScrollView non “mangi” i tap. **Non è stato sufficiente:** l’utente conferma che ancora non funziona.
3. Uso di **TouchableOpacity** con **hitSlop** e **activeOpacity** sui pulsanti/link.
4. **Ref “nativi”** per autofill (`emailNativeRef`, `passwordNativeRef`, `setEmailFromNative`, `setPasswordFromNative`) e uso in `canLogin` / `handleLogin` / “Password dimenticata”.
5. **Bottone Accedi:** disabilitato solo con `disabled={loading}` (nessun altro blocco legato allo stato della password).
6. **`collapsable={false}`** su alcune View per evitare ottimizzazioni Android che rimuovono nodi.
7. Tentativi con **Pressable** al posto di TouchableOpacity (poi revert).

---

## 3. Struttura attuale del login (AuthScreen.js)

- **Container:** `LinearGradient` → `SafeAreaView` → `KeyboardAvoidingView` → **ScrollView** + **View (loginFixedBottom)**.
- **ScrollView (login):** logo, pulsanti social (Google/Apple/Microsoft), “oppure”, campo **email**.
- **Fuori ScrollView (solo se `mode === 'login'`):**  
  `View` con `styles.loginFixedBottom` che contiene:
  - riga password: `TextInput` + `TouchableOpacity` occhio (righe ~764–774);
  - `TouchableOpacity` Accedi (righe ~776–783);
  - `TouchableOpacity` “Password dimenticata” (righe ~784–806);
  - `TouchableOpacity` “Registrati” (righe ~807–809);
  - `TouchableOpacity` “Lingua / Language” (righe ~811–813).

Stili rilevanti: `loginFixedBottom` (riga ~831), `inputWrap`, `inputInner`, `eyeBtn`, `btn`, `toggleBtn`, `langBtn`.

---

## 4. Ipotesi da investigare (direttive per il nuovo agente)

1. **Overlay / view sopra i controlli**  
   Verificare se qualcosa (es. `LinearGradient`, `SafeAreaView`, `KeyboardAvoidingView` o un figlio) ha `pointerEvents` o dimensioni che coprono la zona del `loginFixedBottom` e intercettano i touch. Controllare anche eventuali modal/overlay globali (es. splash, tutorial) che si aprono sulla prima schermata.

2. **KeyboardAvoidingView su Android**  
   Su Android `behavior` è `undefined`; potrebbe comunque alterare il layout o il hit-testing. Provare a **disabilitare del tutto** il `KeyboardAvoidingView` in modalità login (es. non wrappare il blocco login, o usare `behavior={undefined}` e una View semplice) e verificare se i tap tornano a funzionare.

3. **Log e touch su dispositivo**  
   - Eseguire **logcat** (filtrato per app/React Native) mentre l’utente tocca occhio / Accedi / link: vedere se arriva un evento touch e se viene loggato un `onPress`.  
   - Aggiungere **log temporanei** negli `onPress` (occhio, Accedi, link) per confermare se il problema è “evento non arriva” vs “arriva ma l’azione fallisce”.

4. **Componente touch alternativo**  
   Provare **Pressable** (o **TouchableWithoutFeedback** con figlio cliccabile) per occhio, Accedi e link, con `delayLongPress`, `delayPressIn` a 0, per escludere differenze di gestione eventi tra TouchableOpacity e Pressable.

5. **Layout e hit area**  
   Controllare che `loginFixedBottom` non abbia altezza 0 o sia fuori schermo (es. spinto sotto dalla tastiera o da `flex`). Verificare che **non** ci siano `position: 'absolute'` o `zIndex` che mettano un’altra view sopra. Su Android, view con `elevation` possono cambiare l’ordine di hit-test.

6. **Riduzione complessità**  
   Come test: creare una schermata di login **minima** (solo email + password + occhio + Accedi, senza ScrollView, senza KeyboardAvoidingView, senza LinearGradient) e verificare se i tap funzionano. Se sì, reintrodurre un elemento alla volta (ScrollView, KeyboardAvoidingView, gradient, link) per individuare il colpevole.

7. **Versione Android / dispositivo**  
   Verificare su un altro dispositivo o emulatore (e annotare versione Android). Alcuni device/ROM hanno bug con touch in certe combinazioni di view.

---

## 5. Riferimenti rapidi

| Cosa | Dove |
|------|------|
| AuthScreen login (JSX) | `src/screens/AuthScreen.js` ~423–817 |
| Blocco password + Accedi + link | righe ~743–815 (View `loginFixedBottom`) |
| Stile `loginFixedBottom` | riga ~831 |
| handleLogin | cercare `handleLogin` nello stesso file |
| Ref email/password (nativi) | `emailNativeRef`, `passwordNativeRef`, `setEmailFromNative`, `setPasswordFromNative` |
| Build release / install | `android/` — Gradle `assembleRelease`; ADB: `adb -s 304edc09 install -r -d <path-apk>` |
| APK release | `android/app/build/outputs/apk/release/app-release.apk` |

---

## 6. Cosa non cambiare senza motivo

- **Registrazione:** le checkbox consensi sono mostrate solo se `consentRequiredForUser` è true; in login non ci sono checkbox. Lasciare questo comportamento.
- **Autofill:** i ref nativi e la lettura da `emailNativeRef.current` / `passwordNativeRef.current` servono per gestire l’autofill; mantenerli se si modificano solo i touch.
- **Versioni:** attualmente app version 1.0.15 (versionCode 16) in `app.json` e `android/app/build.gradle`.

---

L’utente ha chiesto esplicitamente di lasciare queste direttive per istruire un nuovo agente, con rammarico che il problema non sia ancora risolto. Obiettivo: far sì che **occhio, Accedi e tutti i link del login rispondano in modo affidabile ai tap** su Android.
