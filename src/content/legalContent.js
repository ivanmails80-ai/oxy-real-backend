/**
 * Testi legali OXY Real — struttura dinamica per aggiornamenti rapidi.
 * L'avvocato può blindare sezione per sezione; qui si aggiornano solo i campi necessari.
 * Le pagine dell'app leggono da questo file e non contengono testi statici.
 *
 * DISCLAIMER: I testi presenti sono una bozza e devono essere revisionati da un professionista
 * qualificato (avvocato / DPO) prima dell'uso in produzione.
 *
 * PRIMA DEL LANCIO (obbligatorio per store e GDPR):
 * 1. Cercare "XXXXX" in questo file e sostituire con: nome/ragione sociale del Titolare, email di contatto.
 * 2. Far redigere o approvare i testi da un legale (Privacy e Termini).
 * 3. In subscription: inserire prezzi e link reali (Stripe, App Store, Google Play) quando disponibili.
 */

/** Marchi: ™ solo su OXY Real™, non su OXY da solo. Non usare mai "in corso di registrazione". */
export const BRAND = { short: "OXY", long: "OXY Real™" };

export const legalContent = {
  version: "3.0.0",
  lastUpdated: "2026-03-03",

  // Disclaimer di proprietà (footer login e impostazioni)
  ownershipDisclaimer: "© 2026 OXY Real. Tutti i diritti riservati. OXY e OXY Real™ sono marchi di proprietà esclusiva dell'ecosistema OXY.",

  // Sezione dedicata Proprietà Intellettuale / EULA (tono assertivo)
  intellectualProperty: {
    title: "Proprietà Intellettuale",
    content: "Tutti i contenuti, il design, il codice sorgente, i loghi e i nomi sono protetti dalle leggi sul copyright. OXY e OXY Real™ sono marchi di proprietà esclusiva dell'ecosistema OXY. Qualsiasi riproduzione, imitazione o utilizzo non autorizzato del marchio e delle funzionalità del software sarà perseguito legalmente in ogni sede civile e penale."
  },

  // 1. TERMINI DI SERVIZIO (Versione 2.0.1)
  termsOfService: {
    title: "Termini di Servizio",
    sections: [
      {
        id: "titolare",
        title: "1. Titolare e Fornitore del Servizio",
        content: "L'applicazione OXY Real™ è un prodotto gestito e distribuito da SecondSelf di Ivan Lopez, P.IVA 13227270967, con sede a Legnano (MI), Italia. I presenti Termini regolano l'utilizzo di OXY Real™. Registrandosi e utilizzando l'app, l'utente accetta i servizi di assistenza AI forniti da SecondSelf."
      },
      {
        id: "requisiti_utente",
        title: "2. Requisiti dell'Utente e Età minima",
        content: "Il servizio è destinato a utenti che abbiano compiuto almeno 14 anni. Registrandosi, l'utente dichiara di avere almeno 14 anni. Se l'utente ha un'età compresa tra 14 e 17 anni (minore), dichiara altresì di aver informato i genitori o chi ne fa le veci e di aver ottenuto, ove richiesto dalla legge applicabile nel proprio paese di residenza, il loro consenso all'utilizzo del servizio e al trattamento dei propri dati secondo l'Informativa sulla Privacy. Le transazioni effettuate da minori si intendono autorizzate dai titolari della responsabilità genitoriale. L'utilizzo del servizio al di sotto dei 14 anni non è consentito."
      },
      {
        id: "limitazione_responsabilita",
        title: "3. Limitazione di Responsabilità e assenza di consulenza professionale",
        content: "OXY Real™ è un assistente AI con finalità di intrattenimento e supporto alla produttività e all'organizzazione personale. Le risposte sono generate da algoritmi di Intelligenza Artificiale e possono contenere errori, inesattezze o informazioni non aggiornate. SecondSelf non fornisce né sostituisce consulenze mediche, psicologiche, legali, finanziarie o professionali in senso tecnico. In caso di pericolo o necessità sanitaria, l'utente deve contattare i servizi di emergenza e non fare affidamento sull'IA. L'utente si impegna a non utilizzare OXY Real™ come unica base per decisioni che abbiano impatto sulla propria salute, situazione legale o situazione economica e manleva SecondSelf da ogni responsabilità per decisioni prese in base alle conversazioni con l'IA."
      },
      {
        id: "pagamenti",
        title: "4. Piani, Pagamenti e Abbonamenti",
        content: "OXY Pass (Starter/Pro/Elite) sono abbonamenti ricorrenti gestiti tramite piattaforme di pagamento e store di distribuzione. Salvo disdetta nei tempi e con le modalità previste dallo store, il rinnovo è automatico. Le licenze Lifetime (Starter/Pro/Elite) prevedono un pagamento una tantum: il termine \"Lifetime\" è una denominazione puramente commerciale che identifica un piano senza rinnovi; garantisce l'accesso alle funzioni esistenti per tutta la durata del ciclo di vita commerciale del software, finché supportato dal Titolare, e non implica una durata illimitata in caso di cessazione dell'attività. Per le versioni Lifetime l'utente prende atto che l'accesso ai modelli di Intelligenza Artificiale può richiedere l'inserimento di una propria chiave API (Oxy Key) e che i relativi costi di utilizzo restano a suo esclusivo carico."
      },
      {
        id: "comunicazioni_servizio",
        title: "4-bis. Comunicazioni di servizio",
        content: "Per il corretto funzionamento dell'account e del servizio, SecondSelf può inviarti comunicazioni di servizio strettamente necessarie (ad esempio: conferme e notifiche relative all'account, sicurezza, accesso, cambiamenti rilevanti del servizio, disponibilità dell'app su nuove piattaforme). Eventuali comunicazioni promozionali o di marketing sono inviate solo previo consenso specifico e facoltativo."
      },
      {
        id: "documenti_email",
        title: "4-ter. Documenti, estrazione contenuti e invio via email",
        content: "OXY Real™ può consentire all'utente di selezionare documenti (es. PDF, DOCX, file di testo) presenti sul proprio dispositivo o su provider terzi (es. Drive/iCloud/OneDrive tramite i selettori di sistema) per ottenere un'analisi o un riassunto in chat. Su richiesta esplicita dell'utente, l'app può inoltre preparare l'invio del documento integrale via email (modalità assistita tramite app email del dispositivo) e, se attivata dal Titolare, anche l'invio automatico tramite server. L'utente è responsabile di verificare il destinatario e il contenuto prima dell'invio e di non condividere dati sensibili o riservati senza adeguate tutele."
      },
      {
        id: "legge_applicabile",
        title: "6. Legge applicabile e Foro competente",
        content: "I presenti Termini sono regolati dalla legge italiana. Per ogni controversia relativa alla validità, interpretazione o esecuzione dei Termini e all'utilizzo dell'app OXY Real™ è competente in via esclusiva il Foro di Milano, fatti salvi i casi in cui la legge preveda un foro inderogabile a tutela del consumatore (solitamente il luogo di residenza o domicilio dell'utente)."
      },
      {
        id: "licenza_uso_software",
        title: "7. Licenza d'Uso del Software e Proprietà Intellettuale",
        content: "6.1 Concessione della Licenza. SecondSelf concede all'utente una licenza limitata, non esclusiva, non trasferibile e revocabile per l'utilizzo dell'applicazione OXY Real™ esclusivamente su dispositivi di sua proprietà o controllo, per finalità personali e non commerciali, in conformità ai presenti Termini di Servizio. 6.2 Proprietà Intellettuale. Tutti i diritti di proprietà intellettuale relativi all'app OXY Real™, inclusi ma non limitati a: codice sorgente, codice oggetto, algoritmi, interfaccia utente, design, loghi, marchi, nomi commerciali (\"OXY\", \"OXY Real™\", \"OXY Pass\", \"SecondSelf\"), documentazione e qualsiasi altro contenuto incluso nell'app, sono e rimangono di esclusiva proprietà di SecondSelf o dei suoi licenzianti. Nessuna disposizione dei presenti Termini conferisce all'utente alcun diritto di proprietà su tali elementi. 6.3 Limitazioni d'Uso. L'utente si impegna a non: (a) copiare, modificare, adattare, tradurre, creare opere derivate, decompilare, disassemblare o tentare di estrarre il codice sorgente dell'app, salvo nei limiti consentiti dalla legge applicabile; (b) rimuovere, alterare o oscurare avvisi di copyright, marchi o altri diritti di proprietà intellettuale presenti nell'app; (c) utilizzare l'app per scopi commerciali non autorizzati, inclusa la rivendita, il noleggio, il leasing o la distribuzione dell'app a terzi; (d) utilizzare l'app in modo che violi diritti di terzi o leggi applicabili; (e) tentare di aggirare misure tecnologiche di protezione o limitazioni funzionali dell'app. 6.4 Revoca della Licenza. SecondSelf si riserva il diritto di revocare immediatamente la licenza d'uso e di sospendere o terminare l'accesso all'app in caso di violazione dei presenti Termini, senza preavviso e senza obbligo di rimborso, salvo i diritti dell'utente ai sensi della normativa sul diritto di recesso ove applicabile. 6.5 Compatibilità con Store. L'utilizzo dell'app è inoltre soggetto alle regole e alle condizioni d'uso delle piattaforme attraverso le quali l'app è distribuita (Apple App Store, Google Play Store o altre), che l'utente accetta di rispettare."
      },
      {
        id: "proprieta_intellettuale_eula",
        title: "8. Proprietà Intellettuale e tutela del marchio",
        content: "Tutti i contenuti, il design, il codice sorgente, i loghi e i nomi sono protetti dalle leggi sul copyright. OXY e OXY Real™ sono marchi di proprietà esclusiva dell'ecosistema OXY. Qualsiasi riproduzione, imitazione o utilizzo non autorizzato del marchio e delle funzionalità del software sarà perseguito legalmente in ogni sede civile e penale."
      },
      {
        id: "modifiche_termini_privacy",
        title: "9. Modifiche ai Termini e alla Privacy",
        content: "Il Titolare si riserva il diritto di modificare i presenti Termini e l'Informativa sulla Privacy in qualsiasi momento. Le modifiche saranno comunicate all'utente tramite notifica in-app o via email e diverranno efficaci dopo 15 giorni dalla pubblicazione. L'uso continuativo del servizio oltre tale termine costituisce accettazione delle modifiche. In caso di modifiche sostanziali non accettate, l'utente ha il diritto di recedere dal contratto in qualsiasi momento, interrompendo l'uso del servizio e procedendo alla cancellazione del proprio account."
      },
      {
        id: "piattaforme_distribuzione",
        title: "10. Piattaforme di Distribuzione (Store)",
        content: "L'utente prende atto che il download e l'utilizzo dell'app sono soggetti anche ai termini e alle condizioni delle piattaforme di distribuzione (Apple App Store, Google Play Store), che l'utente si impegna a rispettare integralmente."
      },
      {
        id: "recesso_rimborsi",
        title: "11. Recesso e Rimborsi (Gestione Terzi)",
        content: "Recesso: Ai sensi del Codice del Consumo, il diritto di recesso di 14 giorni decade dal momento in cui l'utente inizia la fruizione del contenuto digitale (invio del primo messaggio o download). Rimborsi: Il Titolare non gestisce direttamente rimborsi monetari. Ogni richiesta di rimborso relativa ad abbonamenti o acquisti deve essere inoltrata esclusivamente alla piattaforma tramite la quale è avvenuto il pagamento (Apple, Google o Stripe), secondo le loro policy e procedure."
      }
    ]
  },

  // 2. PRIVACY POLICY (Versione 2.0.1)
  privacyPolicy: {
    title: "Informativa sulla Privacy",
    intro: "La tua privacy è importante. OXY Real™ tratta i tuoi dati nel rispetto del Regolamento (UE) 2016/679 (GDPR) e della normativa italiana applicabile, per garantire un servizio sicuro e trasparente.",
    sections: [
      {
        id: "data_controller",
        title: "1. Titolare del Trattamento",
        content: "Il Titolare del trattamento è SecondSelf di Ivan Lopez, con sede a Legnano (MI), Italia. Puoi contattare il Titolare all'indirizzo email: oxy@oxyreal.it."
      },
      {
        id: "data_types",
        title: "2. Dati Raccolti",
        content: "Raccogliamo i dati necessari alla fornitura del servizio OXY Real™, tra cui: (i) dati di account (email, nome, eventuale data di nascita per personalizzare il tono delle risposte); (ii) contenuti volontariamente forniti durante l'uso dell'app, come messaggi di chat, elementi salvati nella \"Memory Vault\" (obiettivi/fatti), voci di diario e progressi nelle storie; (iii) dati tecnici (ad esempio identificativo utente Firebase, log tecnici e timestamp) utilizzati per finalità di sicurezza e funzionamento. Se l'utente utilizza la funzione Documenti, può selezionare file dal dispositivo o da provider terzi tramite i selettori di sistema: in tal caso il contenuto del file è trattato al solo scopo di estrarne testo e fornire la risposta richiesta. Se l'utente richiede l'invio via email del documento integrale, il file sarà allegato e inviato al destinatario indicato dall'utente."
      },
      {
        id: "data_usage",
        title: "3. Finalità del Trattamento",
        content: "I dati sono trattati principalmente per: (a) erogare i servizi OXY Real™ e gestire il tuo account (base giuridica: esecuzione del contratto); (b) gestire pagamenti, fatturazione e adempimenti fiscali e legali connessi ai piani OXY Pass o alle licenze Lifetime (base giuridica: obbligo legale ed esecuzione del contratto); (c) migliorare il servizio in forma aggregata o anonima, ad esempio analizzando l'utilizzo delle funzionalità (base giuridica: legittimo interesse del Titolare); (d) inviarti comunicazioni di servizio strettamente necessarie al funzionamento dell'app. Eventuali comunicazioni promozionali sono inviate solo previo consenso specifico."
      },
      {
        id: "data_security",
        title: "4. Destinatari, Trasferimenti e Sicurezza",
        content: "Per fornire il servizio, alcuni dati possono essere trattati da fornitori terzi, tra cui: fornitori di servizi di intelligenza artificiale (generazione risposte), hosting e autenticazione, gestione dei pagamenti e degli abbonamenti, ed eventuale ricerca web. Se l'utente usa la funzione Documenti, il file può essere temporaneamente trasmesso al backend per l'estrazione del testo; in modalità di invio email assistita, l'invio avviene tramite l'app email del dispositivo. In modalità di invio automatico (se attivata), l'invio avviene tramite un provider email configurato dal Titolare (es. SMTP/SendGrid/Mailgun) esclusivamente verso l'indirizzo dell'account o quello indicato secondo le regole del servizio. Tali soggetti agiscono in qualità di responsabili esterni o autonomi titolari, a seconda dei casi. I dati possono essere trasferiti al di fuori dello Spazio Economico Europeo, in particolare negli Stati Uniti; in tali casi il Titolare adotta le misure appropriate previste dal GDPR, come le Clausole Contrattuali Standard (SCC). Adottiamo misure tecniche e organizzative idonee a proteggere i dati da accessi non autorizzati, perdita o uso improprio. L'app attualmente non utilizza cookie o strumenti di tracciamento di terze parti; in caso di introduzione futura, l'Informativa sarà aggiornata e, ove richiesto dalla legge, sarà richiesto il consenso."
      },
      {
        id: "user_rights",
        title: "5. Conservazione dei dati e Diritti dell'Interessato",
        content: "I dati personali sono conservati per tutta la durata del rapporto contrattuale (ossia finché l'account rimane attivo) e, successivamente, per il tempo necessario ad adempiere agli obblighi di legge; per i dati di natura fiscale e contabile la conservazione è normalmente pari a 10 anni. Oltre ai diritti di accesso e rettifica, ai sensi del GDPR (UE 2016/679) l'utente può esercitare i seguenti diritti: Cancellazione (Oblio): l'utente può procedere alla cancellazione definitiva e autonoma del proprio account e di tutti i dati associati direttamente tramite le impostazioni dell'app. Limitazione e Opposizione: diritto di limitare o opporsi al trattamento dei dati per motivi legittimi. Portabilità: diritto di ricevere i propri dati in un formato strutturato e leggibile. Reclamo: diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it). Il Titolare fornirà riscontro alle richieste scritte (all'indirizzo oxy@oxyreal.it) entro 30 giorni."
      }
    ],
    footer: "Ultimo aggiornamento: 3 Marzo 2026."
  },

  // 3. ABBONAMENTO / PAGAMENTI (testi UX, aggiornabili senza toccare le pagine)
  subscription: {
    title: "Gestione abbonamento e pagamenti",
    sections: [
      {
        id: "status",
        title: "Stato abbonamento",
        content: "Qui vedi il piano che Oxy sta usando per la chat (abbonamento OXY Pass o versione Lifetime) e, quando disponibile, la data di rinnovo per gli abbonamenti."
      },
      {
        id: "manage",
        title: "Gestisci abbonamento",
        content: "Per modificare i piani o annullare il rinnovo automatico usi sempre la piattaforma con cui hai sottoscritto (es. Stripe, App Store, Google Play). OXY non effettua cambi piano al ribasso né conversioni automatiche tra abbonamenti e versioni Lifetime."
      },
      {
        id: "cancel",
        title: "Annulla abbonamento",
        content: "Puoi annullare o modificare il rinnovo automatico dalla piattaforma con cui hai sottoscritto (Stripe, App Store, Google Play o sito web). Se il rinnovo non va a buon fine, hai circa 24 ore per aggiornare il pagamento; dopo questo periodo l’accesso ad Oxy viene messo in pausa finché non decidi se continuare."
      },
      {
        id: "payment_methods",
        title: "Metodi di pagamento",
        content: "I pagamenti sono gestiti in modo sicuro tramite le piattaforme ufficiali (Apple, Google, Stripe). Non memorizziamo i dati della carta."
      },
      {
        id: "invoices",
        title: "Fatture e ricevute",
        content: "Le ricevute sono disponibili dall'email di conferma o dall'account della piattaforma di pagamento."
      },
      {
        id: "refunds",
        title: "Rimborsi",
        content: "OXY non gestisce direttamente rimborsi. Per richieste di rimborso consulta le guide ufficiali della piattaforma con cui hai pagato: Apple App Store, Google Play o Stripe."
      }
    ],
    contactNote: "Per domande su fatturazione e abbonamenti: contatta il supporto dall'app (Menu → Centro di Comando → Supporto). Per richieste di rimborso utilizza le guide ufficiali di Apple, Google Play o Stripe."
  },

  // 4. STRINGHE DI CONSENSO (checkbox registrazione) — formule avvocato, età minima 14 anni
  consentStrings: {
    termsCheckbox: "Accetto i Termini di Servizio e dichiaro di avere almeno 14 anni.",
    privacyCheckbox: "Ho letto l'Informativa Privacy e acconsento al trattamento dei dati personali per l'erogazione del servizio.",
    marketingCheckbox: "Acconsento a ricevere comunicazioni su aggiornamenti e novità di OXY Real™.",
    docsCheckbox: "Comprendo che l'invio di documenti via email avviene su mia esplicita richiesta e responsabilità.",
    submitButton: "Registrati e Accetta",
    errorMissingConsent: "Per procedere è necessario accettare i Termini e l'Informativa sulla Privacy."
  }
};

/**
 * Legal content per lingua.
 *
 * Nota: per motivi legali, i testi vanno forniti/approvati da un professionista.
 * Nel frattempo manteniamo fallback all'italiano.
 */
export const legalContentByLang = {
  it: legalContent,
  en: legalContent,
  fr: legalContent,
  es: legalContent,
  ar: legalContent,
  zh: legalContent,
};

export const getLegalContent = (lang = 'it') => legalContentByLang[lang] || legalContentByLang.it;

// Quando la Privacy Policy sarà blindata dall'avvocato a sezioni, usare lo stesso formato di termsOfService:
// privacyPolicy: { title: "...", sections: [ { id: "titolare", title: "Titolare del trattamento", content: "..." }, ... ] }
// e lasciare content: "" o rimuoverlo. L'app mostra le sections se presenti, altrimenti il campo content.
