Aggiornamenti per integrazione stato persistente e realtime (Firebase optional).

Cosa ho aggiunto nella branch feature/live-backend-state:

- assets/js/state.js
  Un modulo che espone openSession(sessionId), getState(), setState(partial), subscribe(cb), clearSession(). Tenta di usare Firebase (se fornisci window.FIREBASE_CONFIG), altrimenti ricade su localStorage + BroadcastChannel per sincronizzazione tra tab.

- assets/js/thresholds.js
  Logica delle soglie / beacon usata dall'interfaccia.

- assets/js/main.js
  Sostituisce lo script inline su index.html. Si connette allo state module e mantiene la UI sincronizzata (sospiri, des, livello). Supporta query param ?session=ID per sessioni multiple.

- assets/js/firebase-config.example.js
  Esempio di file di configurazione Firebase. Copia questo file in assets/js/firebase-config.js e inserisci i valori del tuo progetto per abilitare la sincronizzazione realtime tramite Firestore.

Istruzioni rapide per abilitare Firebase (opzionale)
1. Crea un progetto Firebase (https://console.firebase.google.com/)
2. Abilita Firestore (modalità in test o produzione con regole adeguate)
3. Copia i valori di configurazione del progetto in assets/js/firebase-config.js (usa il file .example come riferimento)
4. Crea una collection `sessions` e aggiungi un documento con id `default` (o usa ?session=ID nell'URL per sessioni separate). Il documento dovrebbe avere campo `state` (oggetto) — il client farà merge/patch.

Regole consigliate per Firestore (esempio minimo)
- Proteggi l'accesso in produzione; per test puoi permettere lettura/scrittura:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      allow read, write: if true; // cambiare per produzione
    }
  }
}

Cosa serve da te per completare la PR
- Dirmi se vuoi che abiliti anche ruth.html e spawn.html (posso aggiornarle nello stesso stile). Per ora ho aggiornato solo index.html per dimostrazione. Se confermi, aggiorno anche le altre due pagine per condividere lo stesso stato.

Procederò ad aprire una PR con questi file e l'aggiornamento di index.html non appena mi dai OK per aggiornare anche ruth.html e spawn.html nello stesso modo.
