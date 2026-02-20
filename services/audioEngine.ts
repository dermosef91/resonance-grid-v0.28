
import { Weapon } from '../types';
import { BPM, SECONDS_PER_BEAT, ROOT_FREQS, SCHEDULE_AHEAD_TIME, AudioProfile, MusicTheme, WeaponMix, SCALES } from './audio/constants';
import { InstrumentPlayer } from './audio/Instruments';
import { ThemeScheduler, ThemeContext } from './audio/ThemeScheduler';
import { Synth } from './audio/Synth';

// Re-export for external usage
export type { MusicTheme, AudioProfile };

class AudioEngine {
    ctx: AudioContext | null = null;
    masterGain: GainNode | null = null;
    compressor: DynamicsCompressorNode | null = null;
    analyser: AnalyserNode | null = null;
    duckingNode: GainNode | null = null;

    instruments: InstrumentPlayer;

    // Sequencing
    nextNoteTime: number = 0.0;
    current16thNote: number = 0;
    measureCount: number = 0;
    isPlaying: boolean = false;
    total16thNotes: number = 0;

    // Game State for Audio
    isBossActive: boolean = false;
    bossIntensity: number = 0;
    timerID: number | undefined;
    currentWave: number = 1;
    currentTheme: MusicTheme = 'DEEP_CIRCUIT';
    private waveTheme: MusicTheme = 'DEEP_CIRCUIT';
    private themeStartTime: number = 0;

    // Mix & Modulators (Public for DebugMenu access)
    weaponMix: WeaponMix = {
        spiritLance: 0, drumEcho: 0, voidAura: 0, naniteSwarm: 0, solarChakram: 0,
        cyberKora: 0, ancestralResonance: 0, voidWake: 0, paradoxPendulum: 0, kaleidoscopeGaze: 0,
        fractalBloom: 0
    };

    targetMix: number = 0; // 0=Industrial, 1=Tribal
    startMix: number = 0;
    transitionStartTime: number = 0;
    readonly TRANSITION_DURATION = 2.0;

    // Modulators
    filterModDepth: number = 0;
    noteDensityMod: number = 0;
    swingAmount: number = 0;
    gateIntensity: number = 0;
    decayModAmount: number = 0;
    detuneAmount: number = 0;

    breakdownMode: boolean = true;
    forceBreakdown: boolean = false;
    buildupMode: boolean = true;
    inversionChance: number = 0;
    accentVolume: number = 0;
    tempoBreathingDepth: number = 0;
    overtureVolume: number = 0;
    silenceChance: number = 0;

    // Special State
    isShadowStep: boolean = false;

    private breakdownTargetNote: number = 0;
    private buildupTargetNote: number = 0;
    currentOctaveShift: number = 1.0;

    constructor() {
        this.instruments = new InstrumentPlayer();
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        this.ctx = new AudioContextClass();
        if (!this.ctx) return;

        // Master Bus
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;

        this.duckingNode = this.ctx.createGain();
        this.duckingNode.gain.value = 1.0;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;

        this.duckingNode.connect(this.compressor);
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        // Initialize Instruments with context and destination
        this.instruments.init(this.ctx, this.duckingNode);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    isMuted: boolean = false;
    previousVolume: number = 0.5;

    setMasterVolume(volume: number) {
        if (this.masterGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : volume, now + 0.1);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.previousVolume = this.masterGain?.gain.value || 0.5;
            this.setMasterVolume(0);
        } else {
            this.setMasterVolume(this.previousVolume);
        }
        return this.isMuted;
    }

    start() {
        this.init();
        this.resume();
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.current16thNote = 0;
        this.total16thNotes = 0;
        this.measureCount = 0;
        this.currentWave = 1;
        this.isBossActive = false;
        this.bossIntensity = 0;
        this.targetMix = 0;
        this.startMix = 0;
        this.transitionStartTime = 0;
        this.breakdownTargetNote = 0;
        this.buildupTargetNote = 0;
        this.currentOctaveShift = 1.0;
        this.currentTheme = 'DEEP_CIRCUIT';
        this.waveTheme = 'DEEP_CIRCUIT';
        this.isShadowStep = false;

        if (this.ctx) {
            this.nextNoteTime = this.ctx.currentTime + 0.1;
            this.scheduler();
        }
    }

    stop() {
        this.isPlaying = false;
        window.clearTimeout(this.timerID);
        this.setSolarIntensity(0);
        this.setEscortHum(false);
    }

    // --- STATE MANAGEMENT ---

    setWave(waveIndex: number) {
        this.currentWave = waveIndex;
        // Reset Mission FX
        this.setSolarIntensity(0);
        this.setEscortHum(false);

        if (waveIndex === 1) {
            this.waveTheme = 'DEEP_CIRCUIT';
            this.currentOctaveShift = 1.0;
        } else {
            const pool: MusicTheme[] = ['DEEP_CIRCUIT', 'SUB_TERRA', 'CIRCUIT_BREAKER', 'LOGIC_GATE'];
            this.waveTheme = pool[Math.floor(Math.random() * pool.length)];
            this.currentOctaveShift = Math.random() < 0.3 ? 0.5 : 1.0;
        }
        this.setTheme(this.waveTheme);
    }

    restoreWaveTheme() { this.setTheme(this.waveTheme); }

    setBossMode(isActive: boolean) { this.isBossActive = isActive; }

    setTheme(theme: MusicTheme) {
        if (this.currentTheme !== theme) {
            this.currentTheme = theme;
            if (this.ctx) this.themeStartTime = this.ctx.currentTime;
        }
    }

    triggerBreakdown(measures: number) {
        if (this.breakdownMode) {
            this.breakdownTargetNote = this.total16thNotes + (measures * 16);
            this.buildupTargetNote = 0;
        }
    }

    triggerBuildup(measures: number) {
        if (this.buildupMode) {
            this.buildupTargetNote = this.total16thNotes + (measures * 16);
            this.breakdownTargetNote = 0;
        }
    }

    updateWeaponMix(weapons: Weapon[]) {
        const getIntensity = (id: string) => {
            const w = weapons.find(w => w.id === id);
            return w ? Math.min(1.0, w.level / 8.0) : 0;
        };

        this.weaponMix = {
            spiritLance: getIntensity('spirit_lance'),
            drumEcho: getIntensity('drum_echo'),
            voidAura: getIntensity('void_aura'),
            naniteSwarm: getIntensity('nanite_swarm'),
            solarChakram: getIntensity('solar_chakram'),
            cyberKora: getIntensity('cyber_kora'),
            ancestralResonance: getIntensity('ancestral_resonance'),
            voidWake: getIntensity('void_wake'),
            paradoxPendulum: getIntensity('paradox_pendulum'),
            kaleidoscopeGaze: getIntensity('kaleidoscope_gaze'),
            fractalBloom: getIntensity('fractal_bloom')
        };

        this.swingAmount = Math.max(0, this.weaponMix.paradoxPendulum * 0.4);
        this.filterModDepth = Math.max(0, this.weaponMix.kaleidoscopeGaze * 0.8);
    }

    setProfile(profile: AudioProfile) {
        if (!this.ctx) return;
        const newTarget = profile === 'TRIBAL' ? 1.0 : 0.0;
        if (Math.abs(newTarget - this.targetMix) > 0.01) {
            this.startMix = this.getMixAtTime(this.ctx.currentTime);
            this.targetMix = newTarget;
            this.transitionStartTime = this.ctx.currentTime;
        }
    }

    getMixAtTime(time: number): number {
        const elapsed = time - this.transitionStartTime;
        if (elapsed >= this.TRANSITION_DURATION) return this.targetMix;
        if (elapsed <= 0) return this.startMix;
        const t = elapsed / this.TRANSITION_DURATION;
        return this.startMix + (this.targetMix - this.startMix) * (t * t * (3 - 2 * t));
    }

    getThemeFade(): number {
        if (!this.ctx) return 1.0;
        const duration = 4.0;
        const t = this.ctx.currentTime - this.themeStartTime;
        return Math.min(1.0, Math.max(0.0, t / duration));
    }

    // --- SCHEDULING ---

    nextNote() {
        let currentBPM = BPM;
        if (this.tempoBreathingDepth > 0 && this.ctx) {
            const breath = Math.sin(this.ctx.currentTime * 1.2);
            currentBPM += breath * 15 * this.tempoBreathingDepth;
        }
        const secondsPerBeat = 60.0 / currentBPM;
        this.nextNoteTime += 0.25 * secondsPerBeat;
        this.current16thNote++;
        this.total16thNotes++;
        if (this.current16thNote === 16) {
            this.current16thNote = 0;
            this.measureCount++;
        }
    }

    scheduler() {
        if (!this.ctx) return;

        // Smooth Boss Intensity
        const targetIntensity = this.isBossActive ? 1.0 : 0.0;
        const step = 0.015;
        if (Math.abs(this.bossIntensity - targetIntensity) > 0.001) {
            if (this.bossIntensity < targetIntensity) this.bossIntensity += step;
            else this.bossIntensity -= step;
        } else {
            this.bossIntensity = targetIntensity;
        }

        while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD_TIME) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }

        this.timerID = window.setTimeout(() => this.scheduler(), 25);
    }

    scheduleNote(rawBeatNumber: number, rawTime: number) {
        if (!this.ctx) return;

        // Apply Settings to Instruments for this tick
        this.instruments.settings = {
            filterModDepth: this.filterModDepth,
            decayModAmount: this.decayModAmount,
            detuneAmount: this.detuneAmount,
            swingAmount: this.swingAmount,
            gateIntensity: this.gateIntensity
        };

        let time = rawTime;
        if (this.swingAmount > 0 && rawBeatNumber % 2 !== 0) {
            time += (SECONDS_PER_BEAT / 4) * 0.33 * this.swingAmount;
        }

        const beatNumber = rawBeatNumber % 16;
        const phraseIndex = Math.floor(this.measureCount / 8) % 4;
        let rootFreq = ROOT_FREQS[phraseIndex] * this.currentOctaveShift;

        if (this.inversionChance > 0 && Math.random() < this.inversionChance) {
            rootFreq *= (Math.random() > 0.5 ? 1.2 : 1.5);
        }

        // Update Escort Hum to match current root
        if (this.isEscortInitialized) {
            this.updateEscortPitch(rootFreq);
        }

        const isBreakdown = this.forceBreakdown || (this.breakdownMode && (this.total16thNotes < this.breakdownTargetNote));
        const isBuildup = this.buildupMode && (this.total16thNotes < this.buildupTargetNote);
        const fade = this.getThemeFade();
        const tribalMix = this.getMixAtTime(time);

        // Construct Context for Theme Scheduler
        // We adjust mix for specific themes (like Mind Flayer) using fade here
        let finalMix = { industrial: (1.0 - tribalMix), tribal: tribalMix };
        if (this.currentTheme === 'MIND_FLAYER') {
            finalMix.industrial *= fade;
        }

        const ctx: ThemeContext = {
            time, beatNumber, rootFreq, measureCount: this.measureCount,
            total16thNotes: this.total16thNotes,
            isBreakdown, isBuildup, buildupTarget: this.buildupTargetNote,
            instruments: this.instruments,
            mix: finalMix,
            weaponMix: this.weaponMix,
            bossIntensity: this.bossIntensity,
            modulators: {
                noteDensity: this.noteDensityMod,
                accentVolume: this.accentVolume,
                overtureVolume: this.overtureVolume,
                currentWave: this.currentWave
            },
            isShadowStep: this.isShadowStep
        };

        // Dispatch
        switch (this.currentTheme) {
            case 'DEEP_CIRCUIT': ThemeScheduler.scheduleDeepCircuit(ctx); break;
            case 'SUB_TERRA': ThemeScheduler.scheduleSubTerra(ctx); break;
            case 'CIRCUIT_BREAKER': ThemeScheduler.scheduleCircuitBreaker(ctx); break;
            case 'LOGIC_GATE': ThemeScheduler.scheduleLogicGate(ctx); break;
            case 'ETHEREAL_VOYAGE': ThemeScheduler.scheduleEtherealVoyage(ctx); break;
            case 'MIND_FLAYER': ThemeScheduler.scheduleMindFlayer(ctx); break;
            case 'GLITCH_STORM': ThemeScheduler.scheduleGlitchStorm(ctx); break;
            case 'SOLAR_PLAINS': ThemeScheduler.scheduleSolarPlains(ctx); break;
            default: ThemeScheduler.scheduleDeepCircuit(ctx); break;
        }
    }

    // --- FX PROXIES ---
    triggerDucking() {
        if (!this.ctx || !this.duckingNode) return;
        const t = this.ctx.currentTime;
        this.duckingNode.gain.cancelScheduledValues(t);
        this.duckingNode.gain.setValueAtTime(this.duckingNode.gain.value, t);
        this.duckingNode.gain.linearRampToValueAtTime(0.1, t + 0.05);
        this.duckingNode.gain.exponentialRampToValueAtTime(1.0, t + 2.5);
    }

    playExplosion() {
        if (!this.ctx) return;
        this.triggerDucking();

        const time = this.ctx.currentTime;

        const n = this.ctx.createBufferSource();
        // Use createNoiseBuffer from Synth to create a fresh buffer for this one-shot source
        n.buffer = Synth.createNoiseBuffer(this.ctx);

        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'lowpass'; nFilter.frequency.setValueAtTime(1200, time);
        nFilter.frequency.exponentialRampToValueAtTime(40, time + 1.5);

        const nGain = Synth.createGain(this.ctx, 1.2, time);
        nGain.gain.exponentialRampToValueAtTime(0.01, time + 1.5);

        n.connect(nFilter); nFilter.connect(nGain); nGain.connect(this.compressor!);
        n.start(time); n.stop(time + 1.5);

        const osc = Synth.createOsc(this.ctx, 'sawtooth', 80, time);
        osc.frequency.exponentialRampToValueAtTime(10, time + 1.0);
        const oFilter = this.ctx.createBiquadFilter(); oFilter.type = 'lowpass';
        oFilter.frequency.setValueAtTime(250, time); oFilter.frequency.linearRampToValueAtTime(0, time + 0.8);
        const oGain = Synth.createGain(this.ctx, 1.0, time); oGain.gain.exponentialRampToValueAtTime(0.01, time + 1.0);
        osc.connect(oFilter); oFilter.connect(oGain); oGain.connect(this.compressor!);
        osc.start(time); osc.stop(time + 1.0);
    }

    playEnemyDeath() {
        if (!this.ctx) return;
        const time = this.ctx.currentTime;
        // Re-implement using Synth helpers
        const n = this.ctx.createBufferSource(); n.buffer = Synth.createNoiseBuffer(this.ctx);
        const nf = this.ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.setValueAtTime(2000, time);
        const ng = Synth.createGain(this.ctx, 0.02, time); ng.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        n.connect(nf); nf.connect(ng); ng.connect(this.duckingNode!); n.start(time); n.stop(time + 0.1);

        const base = 120 + Math.random() * 20;
        const osc = Synth.createOsc(this.ctx, 'triangle', base * 4, time);
        osc.frequency.exponentialRampToValueAtTime(base, time + 0.08);
        const og = Synth.createGain(this.ctx, 0.02, time); og.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        const of = this.ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 3000;
        osc.connect(of); of.connect(og); if (this.duckingNode) og.connect(this.duckingNode); osc.start(time); osc.stop(time + 0.08);
    }

    playCollectXP() {
        if (!this.ctx) return;
        const time = this.ctx.currentTime;
        const phrase = Math.floor(this.measureCount / 8) % 4;
        let freq = ROOT_FREQS[phrase] * 4;
        freq *= SCALES.PENTATONIC[Math.floor(Math.random() * SCALES.PENTATONIC.length)];

        const osc = Synth.createOsc(this.ctx, 'sine', freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, time + 0.1);
        const g = Synth.createGain(this.ctx, 0.004, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
        osc.connect(g); g.connect(this.compressor!);
        osc.start(time); osc.stop(time + 0.1);
    }

    playPurchaseSuccess() {
        if (!this.ctx) return;
        const ctx = this.ctx; // Store in local variable to satisfy TypeScript
        const time = ctx.currentTime;

        // ascending triad chord for "success" feeling
        const chord = [523.25, 659.25, 783.99]; // C Major (C5, E5, G5)

        chord.forEach((freq, i) => {
            const t = time + i * 0.05; // slight stagger
            const osc = Synth.createOsc(ctx, 'triangle', freq, t);

            // Brighten tone with pitch envelope
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.02, t + 0.4);

            const env = Synth.createGain(ctx, 0, t);
            env.gain.linearRampToValueAtTime(0.1, t + 0.05);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

            // Add some "sparkle" with a high frequency pass
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, t);
            filter.frequency.linearRampToValueAtTime(500, t + 0.8);

            osc.connect(filter);
            filter.connect(env);
            if (this.compressor) env.connect(this.compressor);

            osc.start(t);
            osc.stop(t + 0.8);
        });

        // Add a "shimmer" noise burst
        const noise = this.ctx.createBufferSource();
        noise.buffer = Synth.createNoiseBuffer(this.ctx);
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(3000, time);
        nFilter.Q.value = 5;

        const nEnv = Synth.createGain(this.ctx, 0, time);
        nEnv.gain.linearRampToValueAtTime(0.05, time + 0.02);
        nEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        noise.connect(nFilter);
        nFilter.connect(nEnv);
        nEnv.connect(this.compressor!);

        noise.start(time);
        noise.stop(time + 0.5);
    }

    playMegaPurchase() {
        if (!this.ctx || !this.compressor) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Deep Bass Impact (Sub-kick)
        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(150, t);
        bassOsc.frequency.exponentialRampToValueAtTime(40, t + 0.5);

        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.8, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

        bassOsc.connect(bassGain);
        bassGain.connect(this.compressor);
        bassOsc.start(t);
        bassOsc.stop(t + 0.8);

        // Resonant Chord (Low Major 7th)
        const chord = [130.81, 164.81, 196.00, 246.94]; // C3 Major 7
        chord.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);

            // Lowpass filter sweep
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, t);
            filter.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
            filter.frequency.exponentialRampToValueAtTime(100, t + 1.5);
            filter.Q.value = 2;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

            osc.connect(filter);
            filter.connect(gain);
            if (this.compressor) gain.connect(this.compressor);
            osc.start(t);
            osc.stop(t + 2.0);
        });

        // High frequency "Coin Shower" sparkle
        const noise = ctx.createBufferSource();
        noise.buffer = Synth.createNoiseBuffer(ctx);
        const nFilter = ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.setValueAtTime(5000, t);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.2, t);
        nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        noise.connect(nFilter);
        nFilter.connect(nGain);
        if (this.compressor) nGain.connect(this.compressor);
        noise.start(t);
        noise.stop(t + 0.5);
    }

    // --- SOLAR STORM FX ---
    solarOsc: OscillatorNode | null = null;
    solarGain: GainNode | null = null;
    solarFilter: BiquadFilterNode | null = null;
    solarLfo: OscillatorNode | null = null;
    solarLfoGain: GainNode | null = null;
    isSolarInitialized: boolean = false;

    private initSolarFX() {
        if (!this.ctx || this.isSolarInitialized) return;

        // Low Rumble (Sawtooth filtered)
        this.solarOsc = this.ctx.createOscillator();
        this.solarOsc.type = 'sawtooth';
        this.solarOsc.frequency.value = 40; // Deep bass

        this.solarFilter = this.ctx.createBiquadFilter();
        this.solarFilter.type = 'lowpass';
        this.solarFilter.frequency.value = 100;
        this.solarFilter.Q.value = 5;

        this.solarGain = this.ctx.createGain();
        this.solarGain.gain.value = 0;

        // LFO for "Pulsing" filter
        this.solarLfo = this.ctx.createOscillator();
        this.solarLfo.type = 'sine';
        this.solarLfo.frequency.value = 0.5; // Start slow

        this.solarLfoGain = this.ctx.createGain();
        this.solarLfoGain.gain.value = 150; // Filter modulation depth

        // Connections
        this.solarOsc.connect(this.solarFilter);
        this.solarLfo.connect(this.solarLfoGain);
        this.solarLfoGain.connect(this.solarFilter.frequency);

        this.solarFilter.connect(this.solarGain);
        this.solarGain.connect(this.masterGain!);

        // Start
        this.solarOsc.start();
        this.solarLfo.start();

        this.isSolarInitialized = true;
    }

    setSolarIntensity(intensity: number) {
        // 0.0 = Calm, 1.0 = Max Storm
        if (!this.ctx) return;
        if (intensity > 0 && !this.isSolarInitialized) this.initSolarFX();
        if (!this.isSolarInitialized || !this.solarGain || !this.solarLfo || !this.solarFilter) return;

        const now = this.ctx.currentTime;

        // Map intensity to Volume
        // 0 -> 0 volume
        // 1 -> 0.15 volume (not too loud)
        this.solarGain.gain.setTargetAtTime(intensity * 0.15, now, 0.5);

        // Map intensity to LFO Speed (Pulse Rate)
        // 0 -> 0.5 Hz
        // 1 -> 8.0 Hz (Fast throb)
        this.solarLfo.frequency.setTargetAtTime(0.5 + intensity * 7.5, now, 0.5);

        // Map intensity to Pitch (Rising tension)
        this.solarOsc!.frequency.setTargetAtTime(40 + intensity * 40, now, 2.0);
    }

    // --- ESCORT MISSION HUM ---
    escortOscHigh: OscillatorNode | null = null;
    escortOscLow: OscillatorNode | null = null;
    escortGain: GainNode | null = null;
    escortFilter: BiquadFilterNode | null = null;
    escortLfo: OscillatorNode | null = null;
    escortLfoGain: GainNode | null = null;
    isEscortInitialized: boolean = false;

    private initEscortHum() {
        if (!this.ctx || this.isEscortInitialized) return;

        // High Buzz (Sawtooth)
        this.escortOscHigh = this.ctx.createOscillator();
        this.escortOscHigh.type = 'sawtooth';
        this.escortOscHigh.frequency.value = 110; // Electric hum pitch

        // Low Hum (Sine) - Sub-bass reinforcement
        this.escortOscLow = this.ctx.createOscillator();
        this.escortOscLow.type = 'sine';
        this.escortOscLow.frequency.value = 55;

        // Filter to soften the buzz
        this.escortFilter = this.ctx.createBiquadFilter();
        this.escortFilter.type = 'lowpass';
        this.escortFilter.frequency.value = 200;
        this.escortFilter.Q.value = 2;

        // LFO for "Throbbing" amplitude modulation
        this.escortLfo = this.ctx.createOscillator();
        this.escortLfo.type = 'sine';
        this.escortLfo.frequency.value = 4.0; // 4Hz throb

        this.escortLfoGain = this.ctx.createGain();
        this.escortLfoGain.gain.value = 0.3; // Modulation depth

        // Main Gain for this FX
        this.escortGain = this.ctx.createGain();
        this.escortGain.gain.value = 0;

        // Connections:
        // LFO -> Gain Modulation (AM Synthesis essentially)
        // We'll use a second gain node for modulation to avoid messing up the main volume control
        const modGain = this.ctx.createGain();
        modGain.gain.value = 0.8; // Base volume

        // Connect LFO to modulate the gain of modGain
        this.escortLfo.connect(this.escortLfoGain);
        this.escortLfoGain.connect(modGain.gain);

        // Sound Sources -> Filter -> ModGain -> EscortGain -> Master
        this.escortOscHigh.connect(this.escortFilter);
        this.escortOscLow.connect(this.escortFilter);

        this.escortFilter.connect(modGain);
        modGain.connect(this.escortGain);
        this.escortGain.connect(this.masterGain!);

        // Start everything
        this.escortOscHigh.start();
        this.escortOscLow.start();
        this.escortLfo.start();

        this.isEscortInitialized = true;
    }

    updateEscortPitch(rootFreq: number) {
        if (!this.ctx || !this.isEscortInitialized || !this.escortOscHigh || !this.escortOscLow) return;

        const now = this.ctx.currentTime;
        // Shift down 2 octaves for bass (root / 4) and 1 octave for buzz (root / 2)
        // Or specific harmonics. Let's try /4 and /2.
        // E (329) -> 82Hz (Low E)
        const targetLow = rootFreq / 4;
        const targetHigh = rootFreq / 2;

        this.escortOscLow.frequency.setTargetAtTime(targetLow, now, 0.2); // Slower glides
        this.escortOscHigh.frequency.setTargetAtTime(targetHigh, now, 0.2);
    }

    setEscortHum(isActive: boolean) {
        if (!this.ctx) return;
        if (isActive && !this.isEscortInitialized) this.initEscortHum();
        if (!this.isEscortInitialized || !this.escortGain) return;

        const now = this.ctx.currentTime;
        const targetVolume = isActive ? 0.15 : 0.0; // Subtle volume

        // Smooth transition
        this.escortGain.gain.setTargetAtTime(targetVolume, now, 0.5);
    }
}

export const audioEngine = new AudioEngine();
