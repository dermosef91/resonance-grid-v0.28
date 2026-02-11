
export class Synth {
    static createOsc(ctx: AudioContext, type: OscillatorType, freq: number, time: number, detuneAmount: number = 0) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        if (detuneAmount > 0) {
            const drift = Math.sin(time * 0.3) * detuneAmount * 50;
            osc.detune.setValueAtTime(drift, time);
        }
        return osc;
    }

    static createGain(ctx: AudioContext, vol: number, time: number) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, time);
        return g;
    }

    static applyFilterMod(ctx: AudioContext, source: AudioNode, time: number, depth: number) {
        if (depth > 0.05) {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 1;
            const lfo = Math.sin(time * 0.5); 
            const mod = (lfo + 1) / 2; 
            const baseFreq = 400;
            const peakFreq = 3000;
            const currentFreq = baseFreq + (peakFreq - baseFreq) * mod * depth;
            filter.frequency.setValueAtTime(currentFreq, time);
            source.connect(filter);
            return filter;
        }
        return source;
    }

    static createNoiseBuffer(ctx: AudioContext): AudioBuffer {
        const bufferSize = ctx.sampleRate * 2; 
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }
}
