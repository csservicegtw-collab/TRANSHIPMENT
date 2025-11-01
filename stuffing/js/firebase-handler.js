<script type="module">
// ====== Firebase SDK Import ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ====== Firebase Config ======
const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  authDomain: "transshipment-8c2da.firebaseapp.com",
  projectId: "transshipment-8c2da",
  storageBucket: "transshipment-8c2da.firebasestorage.app",
  messagingSenderId: "997549413633",
  appId: "1:997549413633:web:b173bddaf4b73cccd13700",
  measurementId: "G-21L0CZJ1MC"
};

// ====== Initialize Firebase ======
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====== Function: Save Data to Firestore ======
export async function saveStuffingData(agent, data) {
  try {
    const docRef = await addDoc(collection(db, `stuffing_${agent}`), data);
    console.log("✅ Data saved with ID:", docRef.id);
  } catch (e) {
    console.error("❌ Error adding document:", e);
  }
}

// ====== Function: Get All Data ======
export async function getStuffingData(agent) {
  const querySnapshot = await getDocs(collection(db, `stuffing_${agent}`));
  const result = [];
  querySnapshot.forEach((doc) => {
    result.push({ id: doc.id, ...doc.data() });
  });
  return result;
}
</script>
