// 1) Crea tu proyecto en Firebase Console > Configuración del proyecto > Tus apps > Web.
// 2) Reemplaza SOLO estos valores con los de tu proyecto.
const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const fbAuth = firebase.auth();
