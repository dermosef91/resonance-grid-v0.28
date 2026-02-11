
import { Synth } from './Synth';

export class InstrumentPlayer {
    private ctx: AudioContext | null = null;
    private dest: AudioNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;

    // Config references (injected per call or updated)
    public settings = {
        filterModDepth: 0,
        decayModAmount: 0,
        detuneAmount: 0,
        swingAmount: 0,
        gateIntensity: 0
    };

    init(ctx: AudioContext, destination: AudioNode) {
        this.ctx = ctx;
        this.dest = destination;
        this.noiseBuffer = Synth.createNoiseBuffer(ctx);
    }

    private getGateGain(beatNumber: number): number {
        if (this.settings.gateIntensity < 0.05) return 1.0;
        const isGatedStep = beatNumber % 2 !== 0; 
        return isGatedStep ? (1.0 - this.settings.gateIntensity) : 1.0;
    }

    playMetronome(time: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const osc = Synth.createOsc(this.ctx, 'square', 1200, time, this.settings.detuneAmount);
        const gain = Synth.createGain(this.ctx, vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        osc.connect(gain); gain.connect(this.dest);
        osc.start(time); osc.stop(time + 0.03);
    }

    playFractalShepard(time: number, vol: number) {
        if (!this.ctx || !this.dest || !this.noiseBuffer) return;
        
        // Shepard Tone Filter Sweep:
        // Auditory illusion of infinitely rising pitch using parallel bandpass filters on a noise source.
        
        const duration = 8.0; // Play for 8 seconds (covers 2 measures approx)
        const sweepSpeed = 0.2; // 0.2 Hz = 5 seconds per cycle (roughly)
        
        // 1. Source: Pink Noise for texture
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        src.loop = true;
        
        // Master Gain for this voice envelope
        const masterGain = Synth.createGain(this.ctx, 0, time);
        masterGain.gain.linearRampToValueAtTime(vol, time + 1.0); // Slow attack
        masterGain.gain.setValueAtTime(vol, time + duration - 1.0);
        masterGain.gain.linearRampToValueAtTime(0, time + duration); // Slow release
        
        src.start(time);
        src.stop(time + duration);
        
        // 2. Create 3 parallel filters for density
        const numVoices = 3;
        const startFreq = 200;
        
        // We simulate the sweep by scheduling automation points
        // Time resolution for automation
        const stepTime = 0.1;
        const steps = Math.ceil(duration / stepTime);

        for (let i = 0; i < numVoices; i++) {
            const phaseOffset = i / numVoices;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 8; // High Q to emphasize the pitch
            
            const gain = this.ctx.createGain();
            
            src.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);
            
            // Initialize
            filter.frequency.setValueAtTime(startFreq, time);
            gain.gain.setValueAtTime(0, time);
            
            // Schedule the sweep
            for(let s = 0; s <= steps; s++) {
                const t = time + s * stepTime;
                
                // Calculate global phase. Use absolute time `t` to sync pattern?
                // Here we just use relative time from start of note for simplicity in this context,
                // but `phaseOffset` ensures voices are staggered.
                // Note: For true Shepard illusion, pitch rises exponentially.
                
                const relativeT = s * stepTime;
                const cyclePos = (relativeT * sweepSpeed + phaseOffset) % 1.0;
                
                // Freq: Exponential sweep 200 -> 3200 (4 octaves: 200 * 2^4 = 3200)
                const freq = startFreq * Math.pow(16, cyclePos);
                
                // Gain: Bell curve window (Hann) based on cycle position
                // Fades in at low freq, peaks at mid, fades out at high freq
                const g = Math.sin(Math.PI * cyclePos);
                
                filter.frequency.linearRampToValueAtTime(freq, t);
                gain.gain.linearRampToValueAtTime(g, t);
            }
        }
        
        masterGain.connect(this.dest);
    }

    playPrismTwinkle(time: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const harmonics = [2, 3, 4, 5, 6, 8];
        const h = harmonics[Math.floor(Math.random() * harmonics.length)];
        const freq = 440 * h * 2;
        
        const osc = Synth.createOsc(this.ctx, 'sine', freq, time, this.settings.detuneAmount);
        const gain = Synth.createGain(this.ctx, 0, time);
        
        gain.gain.linearRampToValueAtTime(vol, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = (Math.random() * 2) - 1;
        
        osc.connect(gain); gain.connect(panner); panner.connect(this.dest);
        osc.start(time); osc.stop(time + 0.3);
    }

    playBrokenMotor(time: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        
        // Deep, mechanical thud (Square/Saw mix)
        const osc = Synth.createOsc(this.ctx, 'sawtooth', 50, time, this.settings.detuneAmount + 0.5); 
        osc.frequency.exponentialRampToValueAtTime(10, time + 0.2);
        
        const gain = Synth.createGain(this.ctx, vol, time);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        // Lowpass to keep it deep
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.Q.value = 1;

        // Mechanical noise layer
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const nGain = Synth.createGain(this.ctx, vol * 0.5, time);
            nGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            
            const nFilter = this.ctx.createBiquadFilter();
            nFilter.type = 'lowpass';
            nFilter.frequency.value = 300;
            
            noise.connect(nFilter);
            nFilter.connect(nGain);
            nGain.connect(this.dest);
            noise.start(time);
            noise.stop(time + 0.15);
        }

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);
        
        osc.start(time);
        osc.stop(time + 0.2);
    }

    playKick(time: number, vol: number, intensity: number) {
        if (!this.ctx || !this.dest) return;
        const decayMod = 1.0 + (Math.sin(time * 0.5) * 0.5 * this.settings.decayModAmount); 
        
        const osc = Synth.createOsc(this.ctx, 'sine', 150, time, this.settings.detuneAmount);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5 * decayMod);
        
        const gain = Synth.createGain(this.ctx, vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5 * decayMod);
        
        osc.connect(gain); gain.connect(this.dest); 
        osc.start(time); osc.stop(time + 0.5 * decayMod);

        if (intensity > 0.0) {
            const click = Synth.createOsc(this.ctx, 'square', 60, time, this.settings.detuneAmount);
            const clickGain = Synth.createGain(this.ctx, vol * intensity * 0.8, time);
            clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            click.connect(clickGain); clickGain.connect(this.dest); 
            click.start(time); click.stop(time + 0.1);
            
            const rumble = Synth.createOsc(this.ctx, 'sawtooth', 80, time, this.settings.detuneAmount);
            rumble.frequency.exponentialRampToValueAtTime(10, time + 0.4 * decayMod);
            
            const rFilter = this.ctx.createBiquadFilter(); 
            rFilter.type = 'lowpass';
            rFilter.frequency.setValueAtTime(400, time); 
            rFilter.frequency.linearRampToValueAtTime(50, time + 0.3 * decayMod);
            
            const rumbleGain = Synth.createGain(this.ctx, vol * intensity * 0.7, time);
            rumbleGain.gain.exponentialRampToValueAtTime(0.001, time + 0.4 * decayMod);
            
            rumble.connect(rFilter); rFilter.connect(rumbleGain); rumbleGain.connect(this.dest); 
            rumble.start(time); rumble.stop(time + 0.4 * decayMod);
        }
    }

    playSnare(time: number, vol: number, pitchOverride?: number) {
        if (!this.ctx || !this.dest || !this.noiseBuffer) return;
        const decayMod = 1.0 + (Math.sin(time * 2.0) * 0.4 * this.settings.decayModAmount);
        
        const noise = this.ctx.createBufferSource(); noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime(1000, time);
        const nGain = Synth.createGain(this.ctx, vol, time); nGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2 * decayMod);
        noise.connect(filter); filter.connect(nGain); nGain.connect(this.dest); 
        noise.start(time); noise.stop(time + 0.2 * decayMod);
        
        const baseTone = pitchOverride || 200;
        const osc = Synth.createOsc(this.ctx, 'triangle', baseTone, time, this.settings.detuneAmount);
        osc.frequency.exponentialRampToValueAtTime(baseTone * 0.5, time + 0.1);
        const tGain = Synth.createGain(this.ctx, vol * 0.5, time); tGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15 * decayMod);
        osc.connect(tGain); tGain.connect(this.dest); osc.start(time); osc.stop(time + 0.15 * decayMod);
    }

    playHiHat(time: number, isOpen: number | boolean, vol: number) {
        if (!this.ctx || !this.dest || !this.noiseBuffer) return;
        const noise = this.ctx.createBufferSource(); noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime(8000, time);
        const gain = Synth.createGain(this.ctx, vol, time);
        const decay = isOpen ? 0.3 : 0.05;
        const swingMod = this.settings.swingAmount > 0 ? (1 + Math.random()*0.1*this.settings.swingAmount) : 1;
        gain.gain.exponentialRampToValueAtTime(0.01, time + decay * swingMod);
        noise.connect(filter); filter.connect(gain); gain.connect(this.dest); 
        noise.start(time); noise.stop(time + decay * swingMod);
    }

    playBass(time: number, freq: number, vol: number, atmosphere: number, beat: number) {
        if (!this.ctx || !this.dest) return;
        const gate = this.getGateGain(beat);
        const boost = atmosphere > 0 ? 1.0 : 1.0; 
        
        const osc = Synth.createOsc(this.ctx, 'sawtooth', freq, time, this.settings.detuneAmount);
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass';
        const baseCutoff = freq * 2; const modCutoff = freq * (2 + atmosphere * 6); 
        filter.frequency.setValueAtTime(baseCutoff, time); filter.frequency.exponentialRampToValueAtTime(modCutoff, time + 0.1); filter.frequency.exponentialRampToValueAtTime(baseCutoff, time + 0.3);
        filter.Q.value = 1 + atmosphere * 4; 
        
        const gain = Synth.createGain(this.ctx, vol * boost * gate, time); 
        gain.gain.linearRampToValueAtTime(0, time + 0.3);
        
        const modFilter = Synth.applyFilterMod(this.ctx, gain, time, this.settings.filterModDepth);
        osc.connect(filter); filter.connect(gain); modFilter.connect(this.dest); 
        osc.start(time); osc.stop(time + 0.3);
        
        // Sub
        const subType = atmosphere > 0.1 ? 'triangle' : 'sine';
        const sub = Synth.createOsc(this.ctx, subType, freq / 2, time, this.settings.detuneAmount); 
        const subVol = vol * (0.4 + atmosphere * 0.5) * gate; 
        const subGain = Synth.createGain(this.ctx, subVol, time);
        subGain.gain.linearRampToValueAtTime(0, time + 0.4); 
        
        if (subType === 'triangle') { 
            const subFilter = this.ctx.createBiquadFilter(); subFilter.type = 'lowpass'; subFilter.frequency.value = freq; 
            sub.connect(subFilter); subFilter.connect(subGain); 
        } else { sub.connect(subGain); }
        subGain.connect(this.dest); sub.start(time); sub.stop(time + 0.4);
    }

    playCrash(time: number, vol: number) {
        if (!this.ctx || !this.dest || !this.noiseBuffer) return;
        const noise = this.ctx.createBufferSource(); noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime(3000, time);
        const gain = Synth.createGain(this.ctx, vol * 0.8, time); 
        gain.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
        noise.connect(filter); filter.connect(gain); gain.connect(this.dest); 
        noise.start(time); noise.stop(time + 1.5);
    }

    playDrone(time: number, freq: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const osc = Synth.createOsc(this.ctx, 'sine', freq, time, this.settings.detuneAmount);
        const gain = Synth.createGain(this.ctx, 0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 1.0); 
        gain.gain.linearRampToValueAtTime(0, time + 6.0);
        osc.connect(gain); gain.connect(this.dest); 
        osc.start(time); osc.stop(time + 6.0);
    }

    playSonar(time: number, freq: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const osc1 = Synth.createOsc(this.ctx, 'triangle', freq, time, this.settings.detuneAmount);
        const gain1 = Synth.createGain(this.ctx, 0, time);
        gain1.gain.linearRampToValueAtTime(vol * 0.6, time + 0.05); 
        gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
        osc1.connect(gain1); gain1.connect(this.dest); 
        osc1.start(time); osc1.stop(time + 0.6);
        
        const osc2 = Synth.createOsc(this.ctx, 'sine', freq * 0.5, time, this.settings.detuneAmount);
        const gain2 = Synth.createGain(this.ctx, 0, time);
        gain2.gain.linearRampToValueAtTime(vol * 0.4, time + 0.05); 
        gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
        osc2.connect(gain2); gain2.connect(this.dest); 
        osc2.start(time); osc2.stop(time + 0.8);
    }

    playArp(time: number, freq: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const osc = Synth.createOsc(this.ctx, 'sawtooth', freq, time, this.settings.detuneAmount);
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(freq * 4, time); filter.frequency.exponentialRampToValueAtTime(freq, time + 0.1);
        const gain = Synth.createGain(this.ctx, vol, time); 
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        
        const filtered = Synth.applyFilterMod(this.ctx, gain, time, this.settings.filterModDepth);
        osc.connect(filter); filter.connect(gain); filtered.connect(this.dest); 
        osc.start(time); osc.stop(time + 0.2);
    }

    playFMPerc(time: number, freq: number, vol: number, intensity: number) {
        if (!this.ctx || !this.dest) return;
        const carrier = Synth.createOsc(this.ctx, 'sine', freq, time, this.settings.detuneAmount);
        const mod = Synth.createOsc(this.ctx, 'square', freq * 2.5, time, this.settings.detuneAmount);
        const modGain = Synth.createGain(this.ctx, freq * (1 + intensity * 5), time);
        modGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        mod.connect(modGain); modGain.connect(carrier.frequency);
        const outGain = Synth.createGain(this.ctx, vol, time); 
        outGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        carrier.connect(outGain); outGain.connect(this.dest); 
        carrier.start(time); carrier.stop(time + 0.1); mod.start(time); mod.stop(time + 0.1);
    }

    playVoidPulse(time: number, freq: number, vol: number, beat: number) {
        if (!this.ctx || !this.dest) return;
        const gate = this.getGateGain(beat);
        const osc = Synth.createOsc(this.ctx, 'sawtooth', freq, time, this.settings.detuneAmount);
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 5; 
        filter.frequency.setValueAtTime(freq * 2, time); filter.frequency.exponentialRampToValueAtTime(freq * 8, time + 0.1); filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.2);
        const gain = Synth.createGain(this.ctx, 0, time); 
        gain.gain.linearRampToValueAtTime(vol * gate, time + 0.05); 
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        const filtered = Synth.applyFilterMod(this.ctx, gain, time, this.settings.filterModDepth);
        osc.connect(filter); filter.connect(gain); filtered.connect(this.dest); 
        osc.start(time); osc.stop(time + 0.3);
    }

    // Tribal Sounds
    playTomKick(time: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const osc = Synth.createOsc(this.ctx, 'sine', 100, time, this.settings.detuneAmount);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
        const gain = Synth.createGain(this.ctx, vol, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.connect(gain); gain.connect(this.dest); osc.start(time); osc.stop(time + 0.15);
    }

    playTribalShaker(time: number, vol: number) {
        if(!this.ctx || !this.dest || !this.noiseBuffer) return;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer;
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 4000; f.Q.value = 1;
        const g = Synth.createGain(this.ctx, vol, time); g.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        src.connect(f); f.connect(g); g.connect(this.dest); src.start(time); src.stop(time + 0.05);
    }

    playTribalBass(time: number, freq: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const osc = Synth.createOsc(this.ctx, 'triangle', freq, time, this.settings.detuneAmount);
        const g = Synth.createGain(this.ctx, vol, time); g.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.connect(g); g.connect(this.dest); osc.start(time); osc.stop(time + 0.3);
    }

    playPad(time: number, freq: number, vol: number, beat: number) {
        if (!this.ctx || !this.dest) return;
        const gate = this.getGateGain(beat);
        const osc = Synth.createOsc(this.ctx, 'sine', freq, time, this.settings.detuneAmount);
        const g = Synth.createGain(this.ctx, 0, time); 
        g.gain.linearRampToValueAtTime(vol * 0.5 * gate, time + 1); 
        g.gain.linearRampToValueAtTime(0, time + 4);
        const filtered = Synth.applyFilterMod(this.ctx, g, time, this.settings.filterModDepth);
        osc.connect(g); filtered.connect(this.dest); osc.start(time); osc.stop(time + 4);
    }

    playTribalFlute(time: number, freq: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const osc = Synth.createOsc(this.ctx, 'sine', freq, time, this.settings.detuneAmount);
        const g = Synth.createGain(this.ctx, 0, time); 
        g.gain.linearRampToValueAtTime(vol, time + 0.05); 
        g.gain.linearRampToValueAtTime(0, time + 0.2);
        const vib = this.ctx.createOscillator(); vib.frequency.value = 6;
        const vibG = this.ctx.createGain(); vibG.gain.value = 10;
        vib.connect(vibG); vibG.connect(osc.frequency);
        osc.connect(g); g.connect(this.dest); 
        osc.start(time); osc.stop(time + 0.2); vib.start(time); vib.stop(time + 0.2);
    }

    playTribalPerc(time: number, vol: number) {
        if (!this.ctx || !this.dest) return;
        const osc = Synth.createOsc(this.ctx, 'square', 800, time, this.settings.detuneAmount);
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2000, time); f.frequency.exponentialRampToValueAtTime(200, time + 0.05);
        const g = Synth.createGain(this.ctx, vol * 0.5, time); g.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        osc.connect(f); f.connect(g); g.connect(this.dest); osc.start(time); osc.stop(time + 0.05);
    }
}
