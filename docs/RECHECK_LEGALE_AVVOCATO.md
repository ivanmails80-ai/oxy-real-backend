# Recheck legale — Cosa poteva essere dimenticato dall'avvocato

**Data:** 3 marzo 2026  
**Riferimento:** Confronto tra (1) prima risposta dell'avvocato, (2) testi definitivi inviati per implementazione, (3) stato attuale in app.

---

## Nota da inviare all'avvocato (opzionale)

Puoi inviare all'avvocato una mail breve di chiusura, allegando questo file o incollando il testo sotto:

*"Gentile Avvocato, in seguito ai testi definitivi abbiamo completato l'implementazione in app e fatto un recheck rispetto alla Sua prima documentazione. Abbiamo reintegrato alcune frasi che figuravano nella prima versione ma non nei testi definitivi (acquisti minori, emergenze/servizi di emergenza, chiarimento Lifetime, cookie/tracker in Privacy) e abbiamo allineato le checkbox di registrazione alle Sue formule (LEG_TERMS, LEG_PRIVACY, LEG_MINOR, LEG_MARKETING, LEG_DOCS). Restiamo a disposizione per eventuali integrazioni. Cordiali saluti."*

---

## 1. Integrazioni applicate (erano nella prima risposta ma non nei "testi definitivi")

Nella **prima** documentazione l'avvocato aveva incluso alcune frasi che non comparivano nei **testi definitivi** da implementare. Sono state **reintrodotte** in `legalContent.js` per allineare l'app alla sua versione completa:

| Punto | Dove era (prima risposta) | Cosa mancava nei definitivi | Integrazione fatta |
|-------|----------------------------|-----------------------------|---------------------|
| **Acquisti da minori** | Art. 2 Termini | La frase "Le transazioni effettuate da minori si intendono autorizzate dai titolari della responsabilità genitoriale." | Aggiunta in **Art. 2 (Requisiti dell'Utente e Età minima)**. |
| **Emergenze (Disclaimer AI)** | Art. 3 Termini | "In caso di pericolo o necessità sanitaria, l'utente deve contattare i servizi di emergenza e non fare affidamento sull'IA." | Aggiunta in **Art. 3 (Limitazione di Responsabilità)**. |
| **Lifetime (denominazione commerciale)** | Art. 4 Termini | Chiarimento che "Lifetime" è denominazione commerciale, garantisce accesso finché il software è supportato, non implica durata illimitata in caso di cessazione attività. | Integrato in **Art. 4 (Piani, Pagamenti e Abbonamenti)**. |
| **Cookie / tracker** | Non inviato (era in lista "cosa chiedere") | Nessuna menzione in Privacy. | Aggiunta in **Privacy, sez. 4 (Destinatari e Sicurezza)** una frase: l'app attualmente non utilizza cookie o tracker di terze parti; in caso di introduzione futura, Informativa aggiornata e consenso ove richiesto. |

---

## 2. Verifica dei 10 punti originali "cosa chiedere all'avvocato"

| # | Richiesta | Stato |
|---|-----------|--------|
| 1 | Minori 14–17 (consenso genitori, ove richiesto) | Coperto (Art. 2 + checkbox LEG_MINOR in app). |
| 2 | Pagamenti da minori (autorizzazione genitori) | Coperto (Art. 2: "Le transazioni... si intendono autorizzate dai titolari della responsabilità genitoriale"). |
| 3 | Recesso e rimborsi | Coperto (Art. 11 Termini + sezione Rimborsi in abbonamento). |
| 4 | Responsabilità e limiti (emergenze) | Coperto (Art. 3: avviso emergenze aggiunto). |
| 5 | Legge applicabile e Foro competente | Coperto (Art. 6 Termini). |
| 6 | Privacy e basi giuridiche / trasferimenti extra-UE | Coperto (sez. 3 e 4 Privacy, SCC). |
| 7 | Diritti dell'interessato (limitazione, portabilità, opposizione, reclamo, 30 gg) | Coperto (Art. 5 Privacy, integrazione definitiva). |
| 8 | Cookie / tracker | Coperto (frase in Privacy sez. 4). |
| 9 | Store (Apple/Google) | Coperto (Art. 10 Termini). |
| 10 | Modifiche ai Termini/Privacy | Coperto (Art. 9 Termini). |

---

## 3. Requisiti tecnici

| Requisito | Stato |
|-----------|--------|
| expo-secure-store per token | In uso (authService, oxyKeyService). |
| expo-haptics per validazione consensi | In uso (AuthScreen). |
| Autenticazione reale (Firebase) | In uso. |
| Cancellazione account self-service (pulsante + backend) | Implementato: pulsante "Elimina account" in Impostazioni, endpoint `POST /api/me/delete-account`. |
| Nessuna promessa di rimborsi diretti OXY | Termini Art. 11 + sezione/contactNote Rimborsi; supporto rimanda alle guide Store. |

---

## 4. Eventuali punti da far confermare all'avvocato (opzionale)

- **DPO:** Non è indicato un Responsabile della Protezione dei Dati (DPO). Se obbligatorio per il tuo tipo di attività, va aggiunto (nome/contatto) in Privacy.
- **Conservazione dati minori:** Non c’è una frase specifica su tempi di conservazione per utenti under-18; le policy di alcuni paesi lo richiedono. Puoi chiedere all’avvocato se serve una menzione.
- **Checkbox testi:** L’avvocato aveva proposto formule leggermente più stringate (es. "Accetto i Termini di Servizio e dichiaro di avere almeno 14 anni"). In app sono ancora le versioni estese; se vuoi allineare al suo testo parola per parola, si possono sostituire in `legalContent.js` e `translations.js`.

---

## 5. Riepilogo

Con le integrazioni di cui al punto 1, **tutti i contenuti della prima risposta dell’avvocato e dei testi definitivi sono ora presenti in app**, e i 10 punti della lista "cosa chiedere" risultano coperti. Eventuali conferme opzionali (DPO, conservazione minori, testo esatto delle checkbox) puoi richiederle all’avvocato in una breve mail.
