import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Authorized Domain Configuration Requirement:
// localhost and AI Studio domains are pre-configured.
// For production deployments (e.g., Vercel), you MUST add the domain:
// 1. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains
// 2. Click "Add domain" and enter your production URL (e.g., myapp.vercel.app)
// 3. This prevents auth/unauthorized-domain errors in production.

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
