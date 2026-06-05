
// Detaliile de configurare pentru proiectul Firebase Pizzeria Mi Piace
const firebaseConfig = {
    apiKey: "AIzaSyDUUh3oRgD_A9o9lDFkVvG1NxUHaivJ6do",
    authDomain: "mi-piace-5bbf8.firebaseapp.com",
    projectId: "mi-piace-5bbf8",
    storageBucket: "mi-piace-5bbf8.firebasestorage.app",
    messagingSenderId: "680567709330",
    appId: "1:680567709330:web:917d9eb0b01e4d4574d04b",
    measurementId: "G-FZ8P1YJ0QM"
};

// Inițializează aplicația Firebase
firebase.initializeApp(firebaseConfig);

// Referințe globale către serviciile Firebase utilizate pe site
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
