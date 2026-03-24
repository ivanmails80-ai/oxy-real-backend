# Stima costi OpenAI (4o-mini) — migliaia di utenti free

Solo **utenti free**, limite **5 messaggi/giorno** a testa. Modello: **GPT-4o-mini** (versione meno potente, la più economica).

---

## Premessa

- **Costo per 1.000 messaggi** (GPT-4o-mini, ~1.200 token/messaggio in media): **~0,42 $** (circa 0,39 €).
- Tutte le stime sono **solo per la chat free** (nessun Pro/Elite/Starter a pagamento inclusi).

---

## Scenario migliore (uso contenuto)

**Ipotesi:** media **2 messaggi per utente al giorno** (molti aprono l’app, pochi scrivono tanto).

| Utenti free | Messaggi/giorno | $/giorno | €/giorno | $/settimana | €/mese (×30) |
|-------------|------------------|----------|----------|-------------|---------------|
| **2.000** | 4.000 | 1,68 $ | ~1,55 € | 11,76 $ | ~47 € |
| **5.000** | 10.000 | 4,20 $ | ~3,90 € | 29,40 $ | ~117 € |
| **10.000** | 20.000 | 8,40 $ | ~7,80 € | 58,80 $ | ~234 € |

---

## Scenario peggiore (tutti al massimo)

**Ipotesi:** tutti usano **5 messaggi al giorno**.

| Utenti free | Messaggi/giorno | $/giorno | €/giorno | $/settimana | €/mese (×30) |
|-------------|------------------|----------|----------|-------------|---------------|
| **2.000** | 10.000 | 4,20 $ | ~3,90 € | 29,40 $ | ~117 € |
| **5.000** | 25.000 | 10,50 $ | ~9,75 € | 73,50 $ | ~293 € |
| **10.000** | 50.000 | 21,00 $ | ~19,50 € | 147,00 $ | ~585 € |

---

## Riepilogo (solo OpenAI 4o-mini, utenti free)

| Utenti | Scenario | Al giorno | Alla settimana | Al mese |
|--------|----------|-----------|----------------|---------|
| **2.000** | Migliore (2 msg/user) | ~1,55 € | ~11 € | **~47 €** |
| **2.000** | Peggiore (5 msg/user) | ~3,90 € | ~27 € | **~117 €** |
| **5.000** | Migliore (2 msg/user) | ~3,90 € | ~27 € | **~117 €** |
| **5.000** | Peggiore (5 msg/user) | ~9,75 € | ~68 € | **~293 €** |
| **10.000** | Migliore (2 msg/user) | ~7,80 € | ~55 € | **~234 €** |
| **10.000** | Peggiore (5 msg/user) | ~19,50 € | ~137 € | **~585 €** |

*(Conversione € approssimativa: 1 $ ≈ 0,93 €.)*

---

## In sintesi

- **Scenario migliore** (migliaia di utenti, uso contenuto): con **2.000 utenti** e media 2 msg/giorno → **~47 €/mese**; con **5.000** → **~117 €/mese**; con **10.000** → **~234 €/mese**.
- **Scenario peggiore** (tutti a 5 msg/giorno): **2.000** → **~117 €/mese**, **5.000** → **~293 €/mese**, **10.000** → **~585 €/mese**.

Con **solo OpenAI 4o-mini** il servizio **non si interrompe** (nessun tetto tipo free tier): paghi in base all’uso e i costi crescono con utenti e messaggi. Se vuoi contenere la spesa a parità di utenti, si può usare Gemini (es. Flash-Lite) per i free: stime in `docs/CONFRONTO_COSTI_API_OPENAI_GEMINI.md` e `docs/EVITARE_INTERRUZIONE_SERVIZIO_FREE.md`.
