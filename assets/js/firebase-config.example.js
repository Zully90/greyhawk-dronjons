/* Modello di riferimento. In QUESTO repo il file reale assets/js/firebase-config.js
   è già presente e VERSIONATO (le chiavi web Firebase sono pubbliche per definizione;
   la sicurezza è data dalle regole Firestore + auth). Per un altro progetto, copia
   qui i valori del tuo Firebase.
   L'include è già nelle pagine, PRIMA di <script src="assets/core.js">:

       <script src="assets/js/firebase-config.js"></script>

   Senza config, gli strumenti funzionano comunque in locale
   (localStorage + sincronizzazione tra tab dello stesso dispositivo). */
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "TUO-PROGETTO.firebaseapp.com",
  projectId: "TUO-PROGETTO",
  storageBucket: "TUO-PROGETTO.appspot.com",
  messagingSenderId: "0000000000",
  appId: "1:0000000000:web:abcdef"
};
