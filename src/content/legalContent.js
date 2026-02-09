/**
 * Testi legali OXY Real — struttura dinamica per aggiornamenti rapidi.
 * L'avvocato può blindare sezione per sezione; qui si aggiornano solo i campi necessari.
 * Le pagine dell'app leggono da questo file e non contengono testi statici.
 *
 * PRIMA DEL LANCIO (obbligatorio per store e GDPR):
 * 1. Cercare "XXXXX" in questo file e sostituire con: nome/ragione sociale del Titolare, email di contatto.
 * 2. Eventualmente far redigere o approvare i testi da un legale (Privacy e Termini).
 * 3. In subscription: inserire prezzi e link reali (Stripe, App Store, Google Play) quando disponibili.
 */

export const legalContent = {
  version: "2.2.0",
  lastUpdated: "2026-02-09",

  // 1. TERMINI DI SERVIZIO (Versione 2.0.1)
  termsOfService: {
    title: "Termini di Servizio",
    sections: [
      {
        id: "titolare",
        title: "1. Titolare e Fornitore del Servizio",
        content: "L'applicazione OXY Real è un prodotto gestito e distribuito da SecondSelf di Ivan Lopez, P.IVA 13227270967, con sede a Legnano (MI), Italia. I presenti Termini regolano l'utilizzo di OXY Real. Registrandosi e utilizzando l'app, l'utente accetta i servizi di assistenza AI forniti da SecondSelf."
      },
      {
        id: "requisiti_utente",
        title: "2. Requisiti dell'Utente",
        content: "Il servizio è destinato esclusivamente a utenti maggiorenni (18+). Registrandosi, l'utente dichiara di avere almeno 18 anni e di disporre della capacità giuridica per concludere contratti digitali."
      },
      {
        id: "limitazione_responsabilita",
        title: "3. Limitazione di Responsabilità e assenza di consulenza professionale",
        content: "OXY Real è un assistente AI con finalità di intrattenimento e supporto alla produttività e all'organizzazione personale. Le risposte sono generate da algoritmi di Intelligenza Artificiale e possono contenere errori, inesattezze o informazioni non aggiornate. SecondSelf non fornisce né sostituisce consulenze mediche, psicologiche, legali, finanziarie o professionali in senso tecnico. L'utente si impegna a non utilizzare OXY Real come unica base per decisioni che abbiano impatto sulla propria salute, situazione legale o situazione economica e manleva SecondSelf da ogni responsabilità per decisioni prese in base alle conversazioni con l'IA."
      },
      {
        id: "pagamenti",
        title: "4. Piani, Pagamenti e Abbonamenti",
        content: "OXY Pass (Starter/Pro/Elite) sono abbonamenti ricorrenti gestiti tramite piattaforme di terze parti (ad esempio Stripe, Apple App Store o Google Play Store). Salvo disdetta nei tempi e con le modalità previste dallo store, il rinnovo è automatico. Le licenze Lifetime (Starter/Pro/Elite) prevedono un pagamento una tantum che consente l'accesso continuativo alle funzionalità previste dal piano. Per le versioni Lifetime l'utente prende atto che l'accesso ai modelli di Intelligenza Artificiale può richiedere l'inserimento di una propria chiave API OpenAI personale e che i relativi costi di utilizzo restano a suo esclusivo carico."
      },
      {
        id: "legge_applicabile",
        title: "5. Legge applicabile e Foro competente",
        content: "I presenti Termini sono regolati dalla legge italiana. Per ogni controversia relativa alla validità, interpretazione o esecuzione dei Termini e all'utilizzo dell'app OXY Real è competente in via esclusiva il Foro di Milano, salvo i casi in cui la legge preveda un diverso foro inderogabile a tutela del consumatore."
      },
      {
        id: "licenza_uso_software",
        title: "6. Licenza d'Uso del Software e Proprietà Intellettuale",
        content: "6.1 Concessione della Licenza. SecondSelf concede all'utente una licenza limitata, non esclusiva, non trasferibile e revocabile per l'utilizzo dell'applicazione OXY Real esclusivamente su dispositivi di sua proprietà o controllo, per finalità personali e non commerciali, in conformità ai presenti Termini di Servizio. 6.2 Proprietà Intellettuale. Tutti i diritti di proprietà intellettuale relativi all'app OXY Real, inclusi ma non limitati a: codice sorgente, codice oggetto, algoritmi, interfaccia utente, design, loghi, marchi, nomi commerciali (\"OXY Real\", \"OXY Pass\", \"SecondSelf\"), documentazione e qualsiasi altro contenuto incluso nell'app, sono e rimangono di esclusiva proprietà di SecondSelf o dei suoi licenzianti. Nessuna disposizione dei presenti Termini conferisce all'utente alcun diritto di proprietà su tali elementi. 6.3 Limitazioni d'Uso. L'utente si impegna a non: (a) copiare, modificare, adattare, tradurre, creare opere derivate, decompilare, disassemblare o tentare di estrarre il codice sorgente dell'app, salvo nei limiti consentiti dalla legge applicabile; (b) rimuovere, alterare o oscurare avvisi di copyright, marchi o altri diritti di proprietà intellettuale presenti nell'app; (c) utilizzare l'app per scopi commerciali non autorizzati, inclusa la rivendita, il noleggio, il leasing o la distribuzione dell'app a terzi; (d) utilizzare l'app in modo che violi diritti di terzi o leggi applicabili; (e) tentare di aggirare misure tecnologiche di protezione o limitazioni funzionali dell'app. 6.4 Revoca della Licenza. SecondSelf si riserva il diritto di revocare immediatamente la licenza d'uso e di sospendere o terminare l'accesso all'app in caso di violazione dei presenti Termini, senza preavviso e senza obbligo di rimborso, salvo i diritti dell'utente ai sensi della normativa sul diritto di recesso ove applicabile. 6.5 Compatibilità con Store. L'utilizzo dell'app è inoltre soggetto alle regole e alle condizioni d'uso delle piattaforme attraverso le quali l'app è distribuita (Apple App Store, Google Play Store o altre), che l'utente accetta di rispettare."
      }
    ]
  },

  // 2. PRIVACY POLICY (Versione 2.0.1)
  privacyPolicy: {
    title: "Informativa sulla Privacy",
    intro: "La tua privacy è importante. OXY Real tratta i tuoi dati nel rispetto del Regolamento (UE) 2016/679 (GDPR) e della normativa italiana applicabile, per garantire un servizio sicuro e trasparente.",
    sections: [
      {
        id: "data_controller",
        title: "1. Titolare del Trattamento",
        content: "Il Titolare del trattamento è SecondSelf di Ivan Lopez, con sede a Legnano (MI), Italia. Puoi contattare il Titolare all'indirizzo email: oxy@oxyreal.it."
      },
      {
        id: "data_types",
        title: "2. Dati Raccolti",
        content: "Raccogliamo i dati necessari alla fornitura del servizio OXY Real, tra cui: (i) dati di account (email, nome, eventuale data di nascita per personalizzare il tono delle risposte); (ii) contenuti volontariamente forniti durante l'uso dell'app, come messaggi di chat, elementi salvati nella \"Memory Vault\" (obiettivi/fatti), voci di diario e progressi nelle storie; (iii) dati tecnici (ad esempio identificativo utente Firebase, log tecnici e timestamp) utilizzati per finalità di sicurezza e funzionamento."
      },
      {
        id: "data_usage",
        title: "3. Finalità del Trattamento",
        content: "I dati sono trattati principalmente per: (a) erogare i servizi OXY Real e gestire il tuo account (base giuridica: esecuzione del contratto); (b) gestire pagamenti, fatturazione e adempimenti fiscali e legali connessi ai piani OXY Pass o alle licenze Lifetime (base giuridica: obbligo legale ed esecuzione del contratto); (c) migliorare il servizio in forma aggregata o anonima, ad esempio analizzando l'utilizzo delle funzionalità (base giuridica: legittimo interesse del Titolare); (d) inviarti comunicazioni di servizio strettamente necessarie al funzionamento dell'app. Eventuali comunicazioni promozionali sono inviate solo previo consenso specifico."
      },
      {
        id: "data_security",
        title: "4. Destinatari, Trasferimenti e Sicurezza",
        content: "Per fornire il servizio, alcuni dati possono essere trattati da fornitori terzi, tra cui: OpenAI (per la generazione delle risposte AI), Firebase/Google (per hosting e autenticazione), Stripe, Apple e Google (per la gestione dei pagamenti e degli abbonamenti), ed eventuali fornitori di ricerca web (come Tavily, se la funzione è attiva). Tali soggetti agiscono in qualità di responsabili esterni o autonomi titolari, a seconda dei casi. I dati possono essere trasferiti al di fuori dello Spazio Economico Europeo, in particolare negli Stati Uniti; in tali casi il Titolare adotta le misure appropriate previste dal GDPR, come le Clausole Contrattuali Standard (SCC). Adottiamo misure tecniche e organizzative idonee a proteggere i dati da accessi non autorizzati, perdita o uso improprio."
      },
      {
        id: "user_rights",
        title: "5. Conservazione dei dati e Diritti dell'Interessato",
        content: "I dati personali sono conservati per tutta la durata del rapporto contrattuale (ossia finché l'account rimane attivo) e, successivamente, per il tempo necessario ad adempiere agli obblighi di legge; per i dati di natura fiscale e contabile la conservazione è normalmente pari a 10 anni. Ai sensi del GDPR, l'utente può esercitare in qualsiasi momento i propri diritti di accesso, rettifica, cancellazione totale dei dati (\"diritto all'oblio\"), limitazione del trattamento, portabilità e opposizione, scrivendo a: oxy@oxyreal.it. L'utente ha inoltre il diritto di proporre reclamo all'Autorità Garante per la Protezione dei Dati Personali competente."
      }
    ],
    footer: "Ultimo aggiornamento: 09 Febbraio 2026."
  },

  // 3. ABBONAMENTO / PAGAMENTI (testi UX, aggiornabili senza toccare le pagine)
  subscription: {
    title: "Gestione abbonamento e pagamenti",
    sections: [
      {
        id: "status",
        title: "Stato abbonamento",
        content: "Qui potrai vedere il tuo piano attivo e la data di rinnovo."
      },
      {
        id: "manage",
        title: "Gestisci abbonamento",
        content: "Link per gestire il tuo abbonamento (es. Stripe Customer Portal, App Store, Google Play) saranno disponibili in app."
      },
      {
        id: "cancel",
        title: "Annulla abbonamento",
        content: "Puoi annullare o modificare il rinnovo automatico dalla piattaforma con cui hai sottoscritto (App Store, Google Play o sito web)."
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
      }
    ],
    contactNote: "Per domande su fatturazione e abbonamenti: contatta il supporto dall'app (Menu → Impostazioni → Supporto)."
  },

  // 4. STRINGHE DI CONSENSO (checkbox registrazione)
  consentStrings: {
    termsCheckbox: "Dichiaro di avere almeno 18 anni e di accettare i Termini di Servizio di OXY Real (SecondSelf).",
    privacyCheckbox: "Ho letto e compreso l'Informativa sulla Privacy di OXY Real e acconsento al trattamento dei miei dati per l'erogazione del servizio.",
    marketingCheckbox: "Acconsento a ricevere comunicazioni su aggiornamenti e novità di OXY Real (facoltativo).",
    submitButton: "Registrati e Accetta",
    errorMissingConsent: "Per procedere è necessario accettare i Termini e l'Informativa sulla Privacy."
  }
};

// Quando la Privacy Policy sarà blindata dall'avvocato a sezioni, usare lo stesso formato di termsOfService:
// privacyPolicy: { title: "...", sections: [ { id: "titolare", title: "Titolare del trattamento", content: "..." }, ... ] }
// e lasciare content: "" o rimuoverlo. L'app mostra le sections se presenti, altrimenti il campo content.
