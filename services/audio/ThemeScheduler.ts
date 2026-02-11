
import { InstrumentPlayer } from './Instruments';
import { SCALES } from './constants';
import { WeaponMix } from './constants';

export interface ThemeContext {
    time: number;
    beatNumber: number;
    rootFreq: number;
    measureCount: number;
    total16thNotes: number;
    isBreakdown: boolean;
    isBuildup: boolean;
    buildupTarget: number;
    instruments: InstrumentPlayer;
    mix: { industrial: number, tribal: number };
    weaponMix: WeaponMix;
    bossIntensity: number;
    modulators: {
        noteDensity: number;
        accentVolume: number;
        overtureVolume: number;
        currentWave: number;
    };
    isShadowStep: boolean; // Added
}

const playIndustrialRhythm = (ctx: ThemeContext) => {
    const { time, beatNumber, rootFreq, isBreakdown, isBuildup, instruments, mix, weaponMix, bossIntensity, modulators, isShadowStep, measureCount } = ctx;
    const industrialMix = mix.industrial;
    
    if (industrialMix <= 0.01) return;

    // SHADOW STEP: Broken Motor Percussion
    if (isShadowStep) {
        // Pattern: Irregular chugging
        // 0, 3, 7, 10, 14
        if ([0, 3, 7, 10, 14].includes(beatNumber)) {
            const sputter = 0.8 + Math.random() * 0.4;
            instruments.playBrokenMotor(time, industrialMix * sputter);
        }
        // Since isBreakdown is forced true during ShadowStep, other drums below won't play
    }

    // Metronome
    if (weaponMix.paradoxPendulum > 0 && beatNumber === 0) {
        instruments.playMetronome(time, industrialMix * weaponMix.paradoxPendulum * 0.4);
    }

    // Sparkles
    if (weaponMix.kaleidoscopeGaze > 0 && beatNumber % 4 === 0 && Math.random() < 0.3) {
        instruments.playPrismTwinkle(time, industrialMix * 0.15 * 0.3);
    }

    // Fractal Bloom: Shepard Tone Filter Sweep (Infinite Zoom)
    if (weaponMix.fractalBloom > 0) {
        // Trigger every 2 measures to ensure overlap and continuous feeling
        if (beatNumber === 0 && measureCount % 2 === 0) {
             instruments.playFractalShepard(time, weaponMix.fractalBloom * 0.3 * industrialMix);
        }
    }

    // Kick
    if (!isBreakdown && beatNumber % 4 === 0) {
        if (!isBuildup) {
            const vol = industrialMix * 0.7 * (1.0 + bossIntensity * 0.5);
            const impact = Math.max(weaponMix.ancestralResonance, bossIntensity);
            instruments.playKick(time, vol, impact);
        }
    }

    // Snare
    const drumEchoLvl = Math.max(weaponMix.drumEcho, bossIntensity * 0.5);
    if (!isBreakdown && (modulators.currentWave >= 3 || drumEchoLvl > 0 || isBuildup)) {
        if (isBuildup) {
            if (beatNumber % 2 === 0) {
                const remaining = ctx.buildupTarget - ctx.total16thNotes;
                const progress = 1 - Math.min(1, remaining / 32);
                const pitch = 200 + (progress * 400);
                const vol = (0.2 + (progress * 0.6)) * 0.5;
                instruments.playSnare(time, industrialMix * vol, pitch);
            }
        } else {
            if (beatNumber === 4 || beatNumber === 12) {
                instruments.playSnare(time, industrialMix * 0.5 * (1 + bossIntensity * 0.5));
            }
            if (drumEchoLvl > 0 && beatNumber === 15 && Math.random() < Math.max(weaponMix.drumEcho, bossIntensity * 0.4)) {
                instruments.playSnare(time, industrialMix * 0.3);
            }
        }
    }

    // Hats
    if (!isBreakdown && !isBuildup) {
        if (beatNumber % 4 === 2) { // Offbeat 8th
            const chakramEffect = Math.max(weaponMix.solarChakram, bossIntensity * 0.8);
            const isOpen = (beatNumber === 10 || (modulators.currentWave >= 5 && beatNumber === 2) || chakramEffect > 0.5);
            instruments.playHiHat(time, isOpen, industrialMix * 0.2 * (1.0 + chakramEffect));
        } else if (beatNumber % 2 !== 0) { // 16th
            let vol = modulators.currentWave >= 4 ? 0.1 : 0.0;
            if (modulators.noteDensity < 0 && Math.random() < Math.abs(modulators.noteDensity)) vol = 0;
            if (vol > 0) instruments.playHiHat(time, false, industrialMix * vol);
        }
    }

    // Bass
    if (beatNumber % 4 !== 0) {
        const auraDepth = Math.max(weaponMix.voidAura * 0.6, bossIntensity);
        const bassVol = industrialMix * 0.6 * (1.0 + bossIntensity * 0.3);
        instruments.playBass(time, rootFreq / 4, bassVol, auraDepth, beatNumber);
    }

    // Accents & Overture
    if (modulators.accentVolume > 0 && !isBreakdown && beatNumber === 0 && ctx.measureCount % 4 === 0) {
        instruments.playCrash(time, industrialMix * modulators.accentVolume);
    }
    if (modulators.overtureVolume > 0 && beatNumber === 0 && ctx.measureCount % 4 === 0) {
        instruments.playDrone(time, rootFreq * 4, industrialMix * modulators.overtureVolume * 0.4);
    }
};

const scheduleTribalLayer = (ctx: ThemeContext) => {
    const { time, beatNumber, rootFreq, instruments, mix } = ctx;
    const tribalMix = mix.tribal;
    if (tribalMix <= 0.01) return;

    if (beatNumber % 4 === 0) instruments.playTomKick(time, tribalMix * 0.8);
    if (beatNumber % 4 === 2) instruments.playTribalShaker(time, tribalMix * 0.5);
    if (beatNumber % 4 !== 0) instruments.playTribalBass(time, rootFreq / 4, tribalMix * 0.7);
    if (beatNumber === 0) instruments.playPad(time, rootFreq, tribalMix * 0.4, beatNumber);
    
    if (beatNumber === 0 || beatNumber === 3 || beatNumber === 6) {
        const idx = (beatNumber / 3) % SCALES.PENTATONIC.length;
        const noteFreq = rootFreq * 2 * SCALES.PENTATONIC[idx];
        instruments.playTribalFlute(time, noteFreq, tribalMix * 0.4);
    }
    if (beatNumber === 11 || beatNumber === 14) instruments.playTribalPerc(time, tribalMix * 0.5);
};

export const ThemeScheduler = {
    scheduleDeepCircuit(ctx: ThemeContext) {
        playIndustrialRhythm(ctx);
        const { time, beatNumber, rootFreq, instruments, mix, weaponMix, bossIntensity, modulators } = ctx;
        const industrialMix = mix.industrial;

        const lanceLvl = weaponMix.spiritLance;
        let envLvl = modulators.currentWave >= 6 ? 0.4 : (modulators.currentWave >= 3 ? 0.2 : 0);
        if (bossIntensity > 0) envLvl = Math.max(envLvl, 0.6 * bossIntensity);
        const activity = Math.max(lanceLvl, envLvl) + (modulators.noteDensity * 0.5);

        if (activity > 0 && industrialMix > 0.01) {
            let activePatterns = [0];
            if (activity > 0.2) activePatterns.push(6, 12);
            if (activity > 0.5) activePatterns.push(3, 9);
            if (activity > 0.8) activePatterns.push(14, 15);

            if (activePatterns.includes(beatNumber)) {
                const bar = ctx.measureCount % 4;
                let noteIdx = (beatNumber < 4) ? 0 : (beatNumber < 8 ? 1 : (beatNumber < 12 ? 3 : 2));
                if (bar === 1) noteIdx += 1;
                if (bar === 2) noteIdx += 2;
                if (bar === 3) noteIdx = 5 - noteIdx;
                noteIdx = Math.max(0, Math.min(noteIdx, 5));

                const scale = [1.0, 1.2, 1.33, 1.5, 1.78, 2.0];
                let noteFreq = rootFreq * scale[noteIdx];
                if (bar === 2 && beatNumber % 2 !== 0) noteFreq *= 2;
                if (bar === 3 && beatNumber === 0) noteFreq *= 0.5;

                let vel = 0.15 + (Math.max(0, activity) * 0.25);
                if (beatNumber % 4 !== 0) vel *= 0.7;

                instruments.playSonar(time, noteFreq, industrialMix * vel);
            }
        }

        const koraLvl = Math.max(weaponMix.cyberKora, 0.6 * bossIntensity);
        if (koraLvl > 0 && Math.random() > (-modulators.noteDensity * 0.5) && industrialMix > 0.01) {
            if (beatNumber % 2 === 0) {
                const noteIndex = (beatNumber + (ctx.measureCount % 4)) % SCALES.PENTATONIC.length;
                const freq = rootFreq * 2 * SCALES.PENTATONIC[noteIndex];
                instruments.playArp(time, freq, industrialMix * koraLvl * 0.3);
            }
        }

        scheduleTribalLayer(ctx);
    },

    scheduleSubTerra(ctx: ThemeContext) {
        playIndustrialRhythm(ctx);
        const { time, beatNumber, rootFreq, instruments, mix } = ctx;
        if (mix.industrial > 0.01 && beatNumber % 4 === 0) {
            const bar = ctx.measureCount % 4;
            const noteIdx = (bar + (beatNumber / 4)) % 5;
            const noteFreq = (rootFreq * 0.5) * SCALES.PENTATONIC[noteIdx];
            instruments.playSonar(time, noteFreq, mix.industrial * 0.25);
        }
        scheduleTribalLayer(ctx);
    },

    scheduleCircuitBreaker(ctx: ThemeContext) {
        playIndustrialRhythm(ctx);
        const { time, beatNumber, rootFreq, instruments, mix } = ctx;
        if (mix.industrial > 0.01) {
            if (Math.random() < 0.15) instruments.playFMPerc(time, 150 + Math.random() * 200, mix.industrial * 0.4, 0.8);
            if (beatNumber === 0) instruments.playBass(time, rootFreq / 4, mix.industrial * 0.8, 0.5, beatNumber);
        }
        scheduleTribalLayer(ctx);
    },

    scheduleLogicGate(ctx: ThemeContext) {
        playIndustrialRhythm(ctx);
        const { time, beatNumber, rootFreq, instruments, mix, measureCount } = ctx;
        if (mix.industrial > 0.01) {
            if ((beatNumber % 16 === 0 || (beatNumber % 4 === 0 && Math.random() < 0.2)) && Math.random() < 0.35) {
                const idx = (beatNumber + measureCount) % SCALES.PENTATONIC.length;
                instruments.playSonar(time, rootFreq * 4 * SCALES.PENTATONIC[idx], mix.industrial * 0.08);
            }
        }
        scheduleTribalLayer(ctx);
    },

    scheduleMindFlayer(ctx: ThemeContext) {
        const { time, beatNumber, rootFreq, isBreakdown, instruments, mix } = ctx;
        // Mind Flayer replaces Industrial mix, assume full mix here for simplicity, or handle fade externally
        const m = mix.industrial;
        if (m > 0.01) {
            if (!isBreakdown) {
                if (beatNumber % 4 === 0) instruments.playKick(time, m * 0.8, 0.5);
                else instruments.playBass(time, rootFreq / 2, m * 0.6, 0.8, beatNumber);
            }
            if (beatNumber % 3 === 0) {
                const idx = beatNumber % SCALES.PHRYGIAN.length;
                instruments.playVoidPulse(time, rootFreq * 2 * SCALES.PHRYGIAN[idx], m * 0.3, beatNumber);
            }
        }
        scheduleTribalLayer(ctx);
    },

    scheduleGlitchStorm(ctx: ThemeContext) {
        const { time, beatNumber, rootFreq, isBreakdown, instruments, mix } = ctx;
        const m = mix.industrial;
        if (m > 0.01 && !isBreakdown) {
            if (beatNumber % 4 === 0) instruments.playKick(time, m * 0.9, 0.8);
            if (beatNumber % 4 === 2) instruments.playHiHat(time, true, m * 0.4);
            if (beatNumber === 12) instruments.playFMPerc(time, 200, m * 0.5, 0.8);
            if (beatNumber % 2 === 0) instruments.playBass(time, rootFreq / 4, m * 0.6, 0.8, beatNumber);
        }
        scheduleTribalLayer(ctx);
    },

    scheduleEtherealVoyage(ctx: ThemeContext) {
        const { time, beatNumber, rootFreq, instruments, mix, measureCount } = ctx;
        const m = mix.industrial;
        if (m > 0.01) {
            if (beatNumber === 0) instruments.playTomKick(time, m * 0.6);
            if (beatNumber % 2 === 0) instruments.playTribalShaker(time, m * 0.3);
            if (beatNumber % 8 === 0) {
                const idx = (measureCount % 4) % SCALES.PENTATONIC.length;
                instruments.playTribalFlute(time, rootFreq * SCALES.PENTATONIC[idx], m * 0.4);
            }
            if (beatNumber === 0 && measureCount % 2 === 0) instruments.playPad(time, rootFreq, m * 0.3, beatNumber);
        }
        scheduleTribalLayer(ctx);
    },

    scheduleSolarPlains(ctx: ThemeContext) {
        // Force full tribal
        const { time, beatNumber, rootFreq, instruments } = ctx;
        const vol = 1.0;
        if (beatNumber % 4 === 0) instruments.playTomKick(time, vol * 0.8);
        if (beatNumber % 4 === 2) instruments.playTribalShaker(time, vol * 0.5);
        if (beatNumber % 4 !== 0) instruments.playTribalBass(time, rootFreq / 4, vol * 0.7);
        if (beatNumber === 0) instruments.playPad(time, rootFreq, vol * 0.4, beatNumber);
        if (beatNumber === 0 || beatNumber === 3 || beatNumber === 6) {
            const idx = (beatNumber / 3) % SCALES.PENTATONIC.length;
            instruments.playTribalFlute(time, rootFreq * 2 * SCALES.PENTATONIC[idx], vol * 0.4);
        }
        if (beatNumber === 11 || beatNumber === 14) instruments.playTribalPerc(time, vol * 0.5);
    }
};
