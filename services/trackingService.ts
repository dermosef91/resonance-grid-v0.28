
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Player, MetaState } from '../types';

// Add type definition for global gtag function
declare global {
    interface Window {
        gtag: (...args: any[]) => void;
    }
}

const firebaseConfig = {
  apiKey: "AIzaSyDPE099FixUvZh06pE7cutXzsRED9fiihs",
  authDomain: "neon-survivor-59f98.firebaseapp.com",
  projectId: "neon-survivor-59f98",
  storageBucket: "neon-survivor-59f98.firebasestorage.app",
  messagingSenderId: "496770430592",
  appId: "1:496770430592:web:ce0d93a7de05436bf79865",
  measurementId: "G-YJVTZBS8ZT"
};

let db: any = null;
let auth: any = null;
let isInitialized = false;

const initFirebase = async () => {
    // Detect if the user hasn't updated the config yet
    if (firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
        console.log("Analytics: Firebase config not set. Tracking disabled.");
        return;
    }

    try {
        console.log("Analytics: Initializing Firebase...");
        const app = initializeApp(firebaseConfig);
        
        // Initialize Firestore
        try {
            db = getFirestore(app);
            console.log("Analytics: Firestore Service initialized.");
        } catch (fsError) {
            console.error("Analytics: Failed to initialize Firestore service.", fsError);
            return;
        }

        // Initialize Auth
        auth = getAuth(app);
        
        // Sign in anonymously
        await signInAnonymously(auth);
        
        isInitialized = true;
        console.log(`Analytics: Firebase connected & authenticated as ${auth.currentUser?.uid}`);
    } catch (e) {
        console.warn("Analytics: Firebase Init/Auth Error. Running in offline mode.", e);
        // Continue without crashing, just won't track
    }
}

// Initialize immediately
initFirebase();

const getPlayerId = () => {
    if (typeof window === 'undefined') return 'unknown';
    let id = localStorage.getItem('ns_player_id');
    if (!id) {
        id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('ns_player_id', id);
        localStorage.setItem('ns_first_run_ts', Date.now().toString());
    }
    return id;
};

const getFirstRunTs = () => {
    if (typeof window === 'undefined') return Date.now();
    return parseInt(localStorage.getItem('ns_first_run_ts') || Date.now().toString());
};

// Cache location to prevent spamming the API on every event
let cachedLocation: { city: string, region: string, country: string } | null = null;

const fetchApproximateLocation = async () => {
    if (cachedLocation) return cachedLocation;
    
    try {
        // Use a public IP-based geolocation service
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const data = await response.json();
            cachedLocation = {
                city: data.city || 'Unknown',
                region: data.region || 'Unknown',
                country: data.country_name || 'Unknown'
            };
            return cachedLocation;
        }
    } catch (e) {
        // Silently fail to timezone fallback
    }

    // Fallback: Use Timezone as a rough proxy for region if API fails or is blocked
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    cachedLocation = {
        city: 'Unknown',
        region: tz,
        country: 'Unknown'
    };
    return cachedLocation;
};

export const trackEvent = async (
    runId: string,
    action: 'RUN_START' | 'WAVE_COMPLETE' | 'DEATH' | 'LOOT_PICKUP',
    player: Player,
    metaState: MetaState,
    waveIndex: number,
    sessionChips: number,
    additionalData: Record<string, any> = {}
) => {
    // 1. Google Analytics Tracking
    if (typeof window !== 'undefined' && window.gtag) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        const gaPayload = {
            run_id: runId,
            event_category: 'gameplay',
            event_label: `Wave ${waveIndex}`,
            value: sessionChips,
            player_level: player.level,
            weapon_count: player.weapons.length,
            character_health: player.health,
            // debug_mode: true ensures events show up in GA4 "DebugView" even from localhost
            debug_mode: isLocalhost, 
            ...additionalData
        };

        console.log(`[Analytics GA4] Sending ${action}:`, gaPayload);
        window.gtag('event', action, gaPayload);
    } else {
        console.warn("[Analytics] gtag not found on window object.");
    }

    // 2. Firebase/Firestore Tracking (Fail silently if not setup)
    if (!db || !isInitialized) return;

    // Get approximate location (City/Region) instead of exact coordinates
    const location = await fetchApproximateLocation();

    const payload = {
        runId, // New field to group events by session
        playerId: getPlayerId(),
        firebaseUserId: auth?.currentUser?.uid || 'unauthenticated',
        location,
        device: navigator.userAgent,
        timestamp: Date.now(),
        action,
        health: player.health,
        rank: player.level,
        wave: waveIndex,
        chips: sessionChips,
        equippedWeapons: player.weapons.map(w => ({ id: w.id, level: w.level })),
        equippedArtifacts: player.artifacts,
        purchasedUpgrades: metaState.permanentUpgrades,
        runNumber: metaState.runsCompleted + (action === 'RUN_START' ? 1 : 0),
        firstRunTimestamp: getFirstRunTs(),
        ...additionalData
    };

    try {
        await addDoc(collection(db, 'analytics'), payload);
        console.log(`[Analytics Firebase] Sent ${action} to Firestore.`);
    } catch (e) {
        console.warn("Analytics: Failed to send event to Firestore", e);
    }
};
