# Pagina redirect auth per oxyreal.it

Per far sì che il link nelle email (verifica email, reset password) sia **https://oxyreal.it/...** invece di **https://oxy-real.firebaseapp.com/...**, serve:

1. **In Firebase:** impostare l’URL azione personalizzata (vedi sotto).
2. **Su oxyreal.it:** pubblicare una pagina che reindirizza a Firebase con gli stessi parametri.

---

## 1. In Firebase Console

1. **Authentication** → **Modelli**.
2. Cerca in alto (sopra l’elenco dei modelli) un’opzione tipo **“Personalizza URL azione”** / **“Customize action URL”**.
3. Clicca e imposta:
   - **URL azione:** `https://oxyreal.it/__/auth/action`
4. Salva.  
   Da quel momento **%LINK%** nelle email diventerà `https://oxyreal.it/__/auth/action?mode=...&oobCode=...&apiKey=...&lang=...`.

---

## 2. Pagina da mettere su oxyreal.it

Crea sul sito **oxyreal.it** una pagina raggiungibile con questo indirizzo:

**https://oxyreal.it/__/auth/action**

(Il path può essere es. `/__/auth/action` o, se il tuo hosting usa una cartella, `/__/auth/action/index.html`.)

### Contenuto della pagina (redirect verso Firebase)

Salva come **index.html** nella cartella che risponde a `https://oxyreal.it/__/auth/action`:

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reindirizzamento - OXY Real</title>
  <script>
    (function() {
      var q = window.location.search || '';
      window.location.replace('https://oxy-real.firebaseapp.com/__/auth/action' + q);
    })();
  </script>
</head>
<body>
  <p>Reindirizzamento in corso…</p>
</body>
</html>
```

Cosa fa: quando l’utente clicca il link nell’email (es. `https://oxyreal.it/__/auth/action?mode=resetPassword&oobCode=xxx&...`), la pagina prende i parametri (`?mode=...&oobCode=...`) e reindirizza a `https://oxy-real.firebaseapp.com/__/auth/action` con gli stessi parametri. Firebase completa l’azione (reset password / verifica email). L’utente vede solo il link oxyreal.it nell’email.

---

## 3. Se il path deve essere diverso

Se non puoi usare `/__/auth/action` (es. il tuo hosting non gestisce bene quel path), scegli un altro path, es. **https://oxyreal.it/auth/action**.

- In Firebase metti **URL azione:** `https://oxyreal.it/auth/action`
- Su oxyreal.it pubblica la stessa **index.html** (con lo stesso script di redirect) in modo che sia raggiungibile come `https://oxyreal.it/auth/action`.

---

## Riepilogo

| Dove | Cosa |
|------|------|
| Firebase → Authentication → Modelli → **Personalizza URL azione** | `https://oxyreal.it/__/auth/action` (o `https://oxyreal.it/auth/action`) |
| Sito oxyreal.it | Pagina che reindirizza a `https://oxy-real.firebaseapp.com/__/auth/action` + stessi parametri della query |

Dopo questo, nelle email il link mostrato sarà **oxyreal.it** e non firebaseapp.com.
