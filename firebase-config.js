// 1) Crea tu proyecto en Firebase Console > Configuración del proyecto > Tus apps > Web.
// 2) Reemplaza SOLO estos valores con los de tu proyecto.
const firebaseConfig = {
  apiKey: "AIzaSyBOCt61YnOV8BOkzCg248vosIv-iMeRn-0",
  authDomain: "proyecto-bar-x.firebaseapp.com",
  projectId: "proyecto-bar-x",
  storageBucket: "proyecto-bar-x.firebasestorage.app",
  messagingSenderId: "140781825461",
  appId: "1:140781825461:web:30e92b85634d5bde453dfc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const fbAuth = firebase.auth();


// Caché persistente local: mejora el arranque y permite reutilizar datos ya descargados.
// Firestore sincroniza los cambios necesarios cuando vuelve a haber conexión.
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err?.code !== 'failed-precondition' && err?.code !== 'unimplemented') console.warn('Persistencia Firestore:', err);
});
