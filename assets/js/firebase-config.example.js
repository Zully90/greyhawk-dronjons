/* COPIA questo file in assets/js/firebase-config.js e inserisci i valori del
   TUO progetto Firebase. Il file reale è gitignorato.
   Poi, in ogni pagina (index.html, ruth.html, spawn.html), aggiungi questa
   riga PRIMA di <script src="assets/core.js">:

       <script src="assets/js/firebase-config.js"></script>

   Senza questo file/config, gli strumenti funzionano comunque in locale
   (localStorage + sincronizzazione tra tab dello stesso dispositivo). */
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "TUO-PROGETTO.firebaseapp.com",
  projectId: "TUO-PROGETTO",
  storageBucket: "TUO-PROGETTO.appspot.com",
  messagingSenderId: "0000000000",
  appId: "1:0000000000:web:abcdef"
};
