# Greyhawk Campaign Tools — Dronjons Arc

Strumenti web per la campagna Greyhawk di Marcello (PF2e).
Destinatari: DM (Marcello) e giocatori al tavolo.
Obiettivo: GitHub Pages, zero framework, zero build system.

---

## Stack tecnico

- HTML + CSS + JS puro (nessun framework, nessun bundler)
- Font: **Cinzel** (titoli) + **Crimson Pro** (testo corpo) — Google Fonts
- Icone: **Tabler Icons** webfont — `cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.11.0`
- Tema: **dark** fisso, ispirato al grimorio medievale
- Hosting target: **GitHub Pages** (nessuna configurazione server)

### Palette colori (CSS custom properties in `:root`)

```css
--bg0: #0e0d0b      /* sfondo pagina */
--bg1: #181714      /* card principale */
--bg2: #211f1c      /* card secondaria / sezioni */
--bg3: #2a2825      /* input / elementi interattivi */
--border: rgba(255,255,255,0.09)
--border2: rgba(255,255,255,0.18)
--t1: #f0ede6       /* testo primario */
--t2: #a8a49c       /* testo secondario */
--t3: #6a6762       /* testo terziario / placeholder */
--info-bg / --info-fg:    #0a1f36 / #7ab8f0
--warn-bg / --warn-fg:    #2d1a05 / #f5c06a
--warn-border:            #8a5a10
--danger-bg / --danger-fg: #2a0f0f / #f09595
```

### Colori Soglie (fissi, non variabili)
```
Soglia I   #378ADD   blu ferro
Soglia II  #1D9E75   verde predatore
Soglia III #BA7517   ambra collezionista
Soglia IV  #D85A30   corallo eredità
Soglia V   #888780   grigio leggendario
```

---

## Struttura file

```
greyhawk-dronjons/
├── CLAUDE.md          ← questo file
├── README.md          ← descrizione GitHub
├── index.html         ← Artiglio tracker (COMPLETO)
└── spawn.html         ← Sistema spawn spiriti (DA COSTRUIRE)
```

---

## index.html — Artiglio del Collezionista di Sospiri

**Stato: completo e funzionante.**

### Cosa fa
Tracker interattivo per l'oggetto magico scalante di Dronjons.
- Input: Livello PG + Mod. DES → calcola Max Sospiri automaticamente
- Counter Sospiri con pips visuali (+/-)
- Il Faro: indicatore colorato del rischio planare (aggiornamento real-time)
- Azioni rapide: bottoni che spendono Sospiri (disabilitati se non sufficienti)
- 5 Soglie collassabili con lock/unlock per livello
- Sezione "Come catturare i Sospiri" (collassabile)

### Meccanica Sospiri
Risorsa centrale. Max Sospiri cambia formula per Soglia:
- Soglia I (lv 3-4): Mod. DES
- Soglia II (lv 5-8): Mod. DES + 2
- Soglia III (lv 9-12): Mod. DES + floor(Livello/2)
- Soglia IV (lv 13-16): Mod. DES + floor(Livello/2)
- Soglia V (lv 17+): illimitata

### Il Faro (beacon)
| Sospiri | Stato    | Effetto |
|---------|----------|---------|
| 0       | Silente  | Nessuno |
| 1-2     | Tepore   | Entità planari sentono direzione vaga entro 1 miglio |
| 3-4     | Pulsante | +2 a prove localizzazione; Marut/Cavalieri di Kas allertati entro 10 miglia |
| 5+      | Ardente  | Locate attivo 1 miglio; Servitori di Vecna conoscono direzione esatta |

### Tre modalità di cattura
1. **Alla morte** — Reazione, creatura a 0 PF, Furtività/Occultismo vs CD Tempra
2. **Cattura attiva** — Azione, creatura viva ≤ metà PF, vs CD Tempra +4 (spirito integro = ricordi completi)
3. **Manifestazione intercettata** — Reazione automatica, spirito usa il Marchio di Rui Jin

### Le 5 Soglie (sintesi abilità)

**I — Il Cacciatore**
- Senso della Preda [Passiva] 60p
- Mietere il Tormento [Reazione]: ✓✓ 2 Sospiri, ✓ 1, ✗ spirito proiettato 30p, ✗✗ Grabbed
- Impeto Predatorio [Azione, 1 Sospiro]: +2 attacco/danni 1 min, Mentale/Vuoto
- *Drawback*: Sussurri Incessanti (-1 TS Follia e Percezione per Sospiro)

**II — Il Predatore**
- Velo di Ombre Divorate [Azione, 2 Sospiri]: Invisibile 1 round (-4 Percezione bersaglio con Attacco Furtivo)
- Nutrire la Lama [Azione, tutti]: +1d6 Freddo/Sospiro, Spaventato 2 (3 al Critico)
- Interrogare il Catturato [1 min, 1 Sospiro]: 1 domanda — spiriti catturati vivi rispondono con ricordi completi
- *Drawback*: Corruzione Fisica (Drained 1 se riposo lungo a pieno)

**III — Il Collezionista**
- Liberare il Gregge [2 Azioni, tutti min 3]: 2d6 Vuoto/Sospiro in 20p, Spirit/Undead Terrorizzati 3
- L'Artiglio Sceglie [Passiva]: può rifiutare catture o tentarne autonomamente (CD 14 Volontà)
- *Drawback*: Faro attivo tra sessioni; Il Gregge Parla (CD 14 Volontà dopo riposo lungo)

**IV — L'Eredità**
- Forma del Predatore [2 Azioni, 3 Sospiri]: vel+10p, Senso Buio 60p, mani 2d8 Vuoto, dur. Mod. DES round
- Patto con il Gregge [3 Azioni, 4+ Sospiri]: ogni 2 Sospiri = 1 Spirito Gregge per 1 min
- Il Guanto Sussurra [Passiva]: entità planari <lv10 CD 18 Volontà o Intimidite
- *Drawback*: L'Identità si Stempera (CD 18 Volontà dopo trasformazioni)

**V — Il Collezionista Completo**
- Divorare il Velo [Azione, 1/giorno]: ignora immunità Incorporea 1 round
- L'Ultimo Sospiro [3 Azioni, 1/settimana]: cattura eco divine (PO>20, CD=10+Lv creatura)
- Eredità del Gregge [Passiva]: 5+ Sospiri alla morte → esegue ultimo desiderio (una volta sola)
- *Drawback*: La Voce dell'Artiglio (sentiente, propri interessi)

---

## spawn.html — Sistema Spawn Spiriti (DA COSTRUIRE)

### Concept
Al calar del sole, i Sospiri nell'Artiglio disturbano il piano spirituale.
Sistema a tre tiri, **volutamente non bilanciato** — può essere triviale o catastrofico.
UI: rivelazione drammatica a tre step animati.

### Tiro 1 — Il Velo si assottiglia? (d20 vs soglia)

| Sospiri | Disturbo su |
|---------|-------------|
| 0       | — immune    |
| 1       | 20          |
| 2       | 17+         |
| 3       | 14+         |
| 4       | 10+         |
| 5+      | 6+          |
| Overflow (> Mod. DES) | 4+, automatico su 1-3 |

Se non disturbato: notte tranquilla, fine.
Se disturbato: tiro 2.

### Tiro 2 — Intensità (d10 + numero Sospiri)

| Risultato | Grado       | Descrizione |
|-----------|-------------|-------------|
| 1-3       | Eco         | Nessun combattimento — solo atmosfera, presagi |
| 4-6       | Banale      | Fastidioso ma non pericoloso |
| 7-9       | Minore      | Vero incontro, gestibile |
| 10-12     | Grave       | Richiede strategia |
| 13-15     | Letale      | Qualcuno può morire |
| 16+       | Catastrofico| Tiro su tabella speciale |

### Tiro 3 — Manifestazione (d20)

| d20  | Manifestazione |
|------|----------------|
| 1-2  | Eco visivo — sogni disturbanti, nessun combattimento |
| 3-4  | Wisp solitario confuso — si dissolve se ignorato |
| 5-6  | Ombra ×1 |
| 7-8  | Ombre ×2 |
| 9    | **[HAZARD]** Poltergeist — oggetti in volo, nessuna creatura bersagliabile |
| 10   | Spettro — ricorda la propria morte, vuole testimoni |
| 11   | Spettro + **[HAZARD]** Zona di Morte (nessun recupero PF per 3 round) |
| 12   | Apparizione ancorata all'area — forse non ostile |
| 13   | Allip — irradia follia, non attacca fisicamente |
| 14   | Ombre ×3 + Poltergeist simultaneo |
| 15   | Apparizione che riconosce il Marchio — attacca Rui Jin direttamente, ignora gli altri |
| 16   | Banshee |
| 17   | Wraith — vuole assorbire l'Artiglio |
| 18   | Spettro guerriero + **[HAZARD]** Possessione tentata |
| 19   | **Il Gregge si rivolta** — Sospiro interno cerca di uscire, CD 18 Volontà o Grabbed + perde 1 Sospiro |
| 20   | **Il Collezionista Precedente** — altro cacciatore morto, parla e contratta, combatte solo se attaccato |

### Tabella Hazard (d6, quando indicato dalla Manifestazione)

| d6 | Hazard |
|----|--------|
| 1  | Freddo spettrale: −2 a tutte le prove fisiche per 1 ora |
| 2  | Oggetti in volo: 1d4 oggetti/round su bersagli casuali (1d6 danni contundenti) |
| 3  | Zona di Morte: nessun recupero PF né magie curative per 3 round |
| 4  | Sussurri Amplificati: tutti Spaventati 1 (TS Volontà CD 16 per resistere) |
| 5  | Possessione tentata: bersaglio casuale nel gruppo, TS Volontà CD 18 |
| 6  | Artiglio in cortocircuito: Dronjons usa Mietere il Tormento sul primo alleato che subisce danni quel round |

### UI spawn.html
- Input: Sospiri correnti, Mod. DES, Livello PG (prefill da index se possibile via localStorage)
- Bottone grande "Calar del Sole — Tira il Velo"
- Step 1: animazione → rivela tiro d20 + soglia → esito (disturbo sì/no)
- Step 2: se disturbo → rivela d10 + modificatore → Grado intensità
- Step 3: rivela d20 manifestazione → box finale con creatura/hazard
- Se Hazard: tiro d6 automatico incorporato nel risultato
- Box risultato finale: nome creatura, grado, suggerimento DM in corsivo
- Bottone "Ritira" e link a index.html
- Stile coerente con index.html

---

## Contesto narrativo campagna

### PG Attivi (Capitolo 8, Sessione 78, 3 Fireseek 578 CY)

| PG | Giocatore | Note chiave |
|----|-----------|-------------|
| **Dronjons** | Ingegnerissimo (Alessandro) | Porta l'Artiglio. Ex-cacciatore di spiriti. Spilla dell'otto spezzato. |
| **Rui Jin "Rui"** | Alessio | Duskwalker bambino eterno. Porta Mano e Occhio di Vecna. Il suo Marchio attira spiriti. |
| **Kuruk T'iss** | Teo | Ranger. Tribù Artiglio del Picco venduta ai drow da un traditore interno. Cicatrice a ragnatela. |
| **U** | Burrito (Claudio) | Stregone elementale Suel. Veterano. Riceve messaggi dal nord. |

### Dinamica Dronjons / Rui Jin
Gunther (uscito dal gruppo) respingeva passivamente gli spiriti attratti da Mano e Occhio di Vecna.
Dronjons sostituisce questa funzione in modo **opposto**: il bambino fa da esca, Dronjons da trappola.
Più l'Artiglio è pieno, più il Faro espone il gruppo.

### Rotta attuale (verso sud → GDVQ)
```
Corno di Iggwilv (fatto)
  → Bissel: RAGE (Dungeon #89) — vecchio amico di Kuruk
  → Barrier Peaks: HATEFUL LEGACY (Dungeon #131) — prove sul traditore
  → Valle del Mago
  → Geoff: GEO1-05 Giant Slayers
  → GDVQ (G1-G3, D1-D3, Q1)
```

### Twofold Talisman (da inserire)
Due oggetti per trovare i dispersi (Jin, Legione, Taake):
- **Cuore del Traditore**: da inserire a Thornward (Bissel) — emotivamente legato a Kuruk
- **Pietra dell'Occhio**: da inserire a Greyhawk spettrale — forse sugli Assassini Scarlatti

### Antagonisti cosmici rilevanti
- **Vecna**: sottotrama di sfondo. Jin, Legione e Taake dispersi nei nodi elementali per drenarne il potere.
- **Marut**: attivati dal Faro (Sospiri 5+) — cacciano immortalità non guadagnata (Rui Jin ha secoli di vita)
- **Cavalieri di Kas**: attivati dal Faro (Sospiri 3+) — cercano le Reliquie
- **Rary**: cerca Rui Jin per accedere al Pozzo delle Anime

---

## Note di sviluppo

- Non ottimizzare per bilanciamento — la campagna usa volutamente meccaniche asimmetriche
- La voce narrativa nelle descrizioni è italiana
- Terminologia PF2e in italiano (Spaventato, Drained, Grabbed, ecc.)
- Fare sempre riferimento al tema dark/grimorio per le scelte estetiche
