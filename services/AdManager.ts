
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdOptions } from '@capacitor-community/admob';

class AdManagerService {
    public isNative = false;

    constructor() {
        this.init();
    }

    async init() {
        this.isNative = Capacitor.isNativePlatform();
        
        if (this.isNative) {
            try {
                await AdMob.initialize({
                    // requestTrackingAuthorization removed as it's not in AdMobInitializationOptions
                    // Use true for testing with Test IDs, false for production units if configured correctly in console
                    initializeForTesting: false, 
                });
                
                console.log('[AdManager] Native AdMob Initialized');
            } catch (e) {
                console.error('[AdManager] Failed to init AdMob', e);
            }
        }
    }

    async showRewardedAd(): Promise<boolean> {
        // --- SCENARIO 1: NATIVE MOBILE (AdMob) ---
        if (this.isNative) {
            try {
                // Production Ad Unit ID: ca-app-pub-3249868133464237/5200731416
                const options: RewardAdOptions = {
                    adId: 'ca-app-pub-3249868133464237/5200731416',
                    // isTesting: false 
                };
                
                await AdMob.prepareRewardVideoAd(options);
                await AdMob.showRewardVideoAd();
                return true; // Reward granted
            } catch (error) {
                console.error('[AdManager] Native Ad Failed:', error);
                return false;
            }
        }

        // --- SCENARIO 2: WEB ---
        console.log("[AdManager] Ads disabled on Web.");
        return false;
    }
}

export const adManager = new AdManagerService();
