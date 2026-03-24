# Oxy Key: acquisto e automazione

## Cosa volete ottenere

- Pagina nel menu dove il cliente **acquista** l’Oxy Key.
- Lato vostro: **automatizzare** l’acquisto verso il fornitore AI, ottenere il codice/chiave e **attivare i token** per abbonamento o one-shot.

---

## Cosa è possibile oggi (tecnico)

### 1. Il fornitore non espone un’API pubblica “crea chiave per utente”

- **Non** esiste un endpoint pubblico tipo “crea una API key per questo utente e restituiscimela” che qualsiasi sviluppatore possa chiamare.
- Esiste una **Management API** (organizzazioni):
  - Creazione **progetti** per organizzazione.
  - Creazione **service account** o **API key** per progetto.
  - Pensata per **reseller/organizzazioni**, non per uso self-serve generico.
  - Richiede in genere: account organizzazione, Admin API Key, eventuale feature flag o accordo commerciale.

Quindi: **“acquisto automatizzato sul fornitore + ci danno il codice e noi lo attiviamo”** in modo completamente automatico e self-serve **non** è disponibile con le API pubbliche standard. È fattibile solo se avete (o otterrete) accesso alla Management API e al provisioning progetti/chiavi (accordi con il fornitore).

### 2. Cosa potete implementare subito senza quella API

**Opzione A – Pacchetto token gestito da voi (consigliata per “acquista Oxy Key”)**

- Il cliente in app clicca **“Acquista Oxy Key”**.
- Viene portato a un **checkout (es. Stripe)** per un **pacchetto di utilizzo** (es. “100k token”, “30 giorni di chat”, ecc.).
- **Voi non create una chiave sul fornitore per lui.**  
  Sul backend:
  - Usate **la vostra** chiave API del fornitore.
  - Associato all’utente (abbonamento o one-shot) salvate un **credito** (token o giorni).
  - Ogni richiesta chat consuma da questo credito; a 0 bloccate o chiedete di rinnovare.
- L’“Oxy Key” in questo modello è un **token/licenza** nel vostro DB (“questo utente ha X token”), non una chiave API reale.
- **Pro**: nessun bisogno che il fornitore esponga “crea chiave per utente”; tutto sotto il vostro controllo; fatturazione e limiti chiari.
- **Contro**: i costi token restano sulla **vostra** chiave; dovete prezzare i pacchetti in modo da coprire costi + margine.

**Opzione B – Modello attuale Lifetime (chiave personale)**

- Con **Lifetime**, l’utente usa **la sua** chiave (che si crea da solo sul portale del fornitore).
- In menu potete avere una pagina **“Acquista Oxy Key”** che:
  - per **abbonamento**: dice “La chiave è inclusa nel piano” e link ad Abbonamento;
  - per **Lifetime**: spiega “Usa la tua chiave” e offre il campo per **inserire/salvare** la chiave (quella che oggi usate già);
  - per **nessun piano**: invita a scegliere un piano (Pass o Lifetime) e link ad Abbonamento.
- Qui **non** c’è automazione acquisto sul fornitore: l’utente compra da voi il piano Lifetime e poi si procura la chiave da solo (o in futuro con Opzione A compra un pacchetto gestito da voi).

### 3. Se in futuro avete accesso alla Management API

- Con **progetti** e **service account** (o chiavi per progetto) potreste:
  1. Creare un progetto (o risorsa equivalente) per utente/cliente.
  2. Creare una chiave per quel progetto.
  3. Mostrare la chiave **una tantum** all’utente (o salvarla cifrata e usarla voi sul backend per le sue richieste).
- In quel caso “acquista Oxy Key” potrebbe davvero diventare:  
  **pagamento → vostro backend chiama Management API → ottiene chiave → la associa all’abbonamento/one-shot e la “attiva” (salvataggio + eventuale attivazione lato vostro).**
- Per arrivarci serve: account organizzazione, accesso alla Management API (e relativi scope), eventuale accordo/partner con il fornitore.

---

## Riepilogo

| Obiettivo | Possibile oggi? | Come |
|-----------|------------------|------|
| Pagina menu “Acquista Oxy Key” | Sì | Testo e link in base a piano (Pass / Lifetime / nessuno) + eventuale campo “Inserisci la tua chiave” per Lifetime. |
| Automatizzare acquisto sul fornitore e “prendere il codice” | No (API pubbliche) | Solo con accesso alla Management API (progetti/chiavi per organizzazione). |
| Attivare token per abbonamento/one-shot | Sì | **Pacchetto token gestito da voi**: credito per utente, vostra chiave, consumo fino a esaurimento. Oppure **Lifetime**: la sua chiave, i “token” sono sul suo account. |

**Raccomandazione**

1. **Subito**: aggiungere la pagina menu **“Acquista Oxy Key”** con i tre casi (Pass = inclusa, Lifetime = inserisci chiave o link, nessun piano = vai ad Abbonamento).
2. **Appena possibile**: implementare **pacchetti token a pagamento** (Stripe → credito su vostro backend → uso con la vostra chiave) e chiamarli “Acquista Oxy Key” o “Acquista token” così l’acquisto è automatizzato **lato vostro** e i token sono “attivati” nell’abbonamento/one-shot come credito.
3. **Se e quando** avete accesso alla Management API: valutare un flusso “crea chiave reale per utente” e mostrarla/attivarla dopo l’acquisto.
