const firebaseConfig = {
  apiKey: "ISI_DENGAN_API_KEY_MU",
  authDomain: "ISI_DENGAN_AUTH_DOMAIN_MU",
  projectId: "ISI_DENGAN_PROJECT_ID_MU",
  storageBucket: "ISI_DENGAN_STORAGE_BUCKET_MU",
  messagingSenderId: "ISI_DENGAN_MESSAGING_ID_MU",
  appId: "ISI_DENGAN_APP_ID_MU"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function saveVesselData(agent, vesselName, voyage, details = {}) {
  try {
    await db.collection(`${agent}_vessels`).add({
      vesselName,
      voyage,
      ...details,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Data berhasil disimpan untuk ${agent}:`, vesselName);
  } catch (error) {
    console.error("❌ Gagal menyimpan data:", error);
  }
}
