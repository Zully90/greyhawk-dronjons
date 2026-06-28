# Grimorio di Sessione — stato condiviso

Tutte e tre le pagine (`index.html`, `ruth.html`, `spawn.html`) condividono un
unico stato tramite `assets/core.js` (`window.Grimorio`). Funziona a tre livelli,
in cascata automatica:

1. **localStorage** — persiste tra sessioni sullo stesso browser.
2. **BroadcastChannel + evento `storage`** — sincronizza dal vivo più tab dello
   stesso dispositivo (es. il DM con index/ruth/spawn aperte insieme).
3. **Firebase Firestore** — sincronizza dal vivo tra dispositivi diversi
   (telefoni dei giocatori + laptop del DM). **Opzionale.**

Senza Firebase i primi due livelli funzionano comunque, anche offline e su
GitHub Pages. Non c'è build, non c'è server.

## Modello dei permessi (asimmetrico)

| Pagina | Legge | Scrive |
|--------|-------|--------|
| `index.html` (Artiglio) | **solo** `artiglio` | `artiglio` |
| `ruth.html` (Arco) | `ruth` + `Grimorio.faro()` (stato del Faro) | `ruth` |
| `spawn.html` (DM) | tutto | tutto (orchestratore) |

L'Artiglio non legge mai i dati di Ruth. L'influenza Ruth→Artiglio passa dai
pulsanti orchestratore in `spawn.html`, che mutano i Sospiri dell'Artiglio:
Dronjons vede cambiare il Faro senza sapere perché.

## Abilitare il sync multi-dispositivo (Firebase)

In questo repo Firebase è **già configurato e attivo**: `assets/js/firebase-config.js`
è **versionato** (la config web è pubblica per definizione, vedi nota sicurezza sotto)
ed è già incluso nelle tre pagine prima di `core.js`. Per rifarlo da zero su un altro
progetto:

1. Crea un progetto su <https://console.firebase.google.com/> e abilita
   **Firestore Database** (modalità produzione) e **Authentication → Sign-in anonimo**.
2. Sostituisci i valori in `assets/js/firebase-config.js` con quelli del tuo progetto
   (`assets/js/firebase-config.example.js` è il modello di riferimento).
3. L'include è già presente in `index.html`, `ruth.html`, `spawn.html`, **prima** di
   `<script src="assets/core.js"></script>`:

   ```html
   <script src="assets/js/firebase-config.js"></script>
   ```

4. Pubblica le regole (sotto). Tutti i dispositivi che aprono le pagine con lo stesso
   parametro `?session=ID` (default `dronjons`) condividono lo stato in tempo reale.

### Regole Firestore (per il tavolo)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null; // solo utenti autenticati (anche anonimi)
    }
  }
}
```

> ⚠️ **Sicurezza (leggere):** con la config versionata + auth **anonima** + questa
> regola, *chiunque conosca il projectId* (pubblico nel codice) può di fatto
> leggere/scrivere il documento della sessione. È **accettabile solo per uso privato
> e a basso rischio** come un tavolo di gioco (al peggio: vandalismo dei dati di
> sessione). Sul piano **Spark** non può generare costi (le quote bloccano, non
> addebitano). Per blindare l'accesso ai soli vostri account servirebbe login
> **Google** + una regola tipo `allow read, write: if request.auth.token.email in [...]`
> (richiede una modifica al codice per fare il login Google invece dell'anonimo).

> **Nota privacy:** il muro Ruth↔Artiglio è applicato a livello di **API** (lo scope
> in `core.js` impedisce a `index.html` di leggere lo slice `ruth` via `get`), ma
> **non a livello di dato**: il documento Firestore è condiviso, quindi un giocatore
> esperto con i devtools potrebbe leggerlo comunque. Per il tavolo è accettabile
> (anti-spoiler). L'enforcement duro richiederebbe documenti separati + regole
> dedicate: estensione futura.

## Migrazione

Al primo caricamento, se esistono le vecchie chiavi `artiglio`/`ruth` di
localStorage, vengono importate automaticamente nel nuovo stato unico
(`greyhawk:v1:<sessione>`). Nessun dato salvato va perso.
