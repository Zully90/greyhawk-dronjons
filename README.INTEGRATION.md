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

1. Crea un progetto su <https://console.firebase.google.com/> e abilita
   **Firestore** e **Authentication → Sign-in anonimo**.
2. Copia `assets/js/firebase-config.example.js` in
   `assets/js/firebase-config.js` e inserisci i valori del progetto.
   (Il file reale è gitignorato.)
3. In `index.html`, `ruth.html`, `spawn.html` aggiungi questa riga **prima** di
   `<script src="assets/core.js"></script>`:

   ```html
   <script src="assets/js/firebase-config.js"></script>
   ```

4. Tutti i dispositivi che aprono le pagine con lo stesso parametro
   `?session=ID` (default `dronjons`) condividono lo stato in tempo reale.

### Regole Firestore minime (per il tavolo)

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

> **Nota privacy:** con il documento condiviso la separazione Ruth↔Artiglio è
> garantita a livello di interfaccia, non di dato — un giocatore esperto con i
> devtools potrebbe leggere lo slice `ruth` dal documento. Per il tavolo è
> accettabile (anti-spoiler). L'enforcement duro richiederebbe documenti
> separati + regole dedicate: estensione futura.

## Migrazione

Al primo caricamento, se esistono le vecchie chiavi `artiglio`/`ruth` di
localStorage, vengono importate automaticamente nel nuovo stato unico
(`greyhawk:v1:<sessione>`). Nessun dato salvato va perso.
