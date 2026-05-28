// WebGL full-screen post-processing pass. Takes the finished Canvas 2D frame
// as a texture and renders bloom / chromatic aberration / grading / vignette /
// scanlines / grain / glitch / freeze into an overlay canvas.
//
// Designed to degrade gracefully: if WebGL is unavailable or anything fails to
// compile, `ok` stays false and callers fall back to the raw 2D canvas.

import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders';

export interface PostFxUniforms {
    glitch: number;
    freeze: number;
    redFlash: number;
    tint?: [number, number, number];
}

export class PostProcessor {
    public ok = false;
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private texture: WebGLTexture | null = null;
    private buffer: WebGLBuffer | null = null;
    private uniforms: Record<string, WebGLUniformLocation | null> = {};
    private startTime = performance.now();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        try {
            this.init();
            this.ok = true;
        } catch (e) {
            console.warn('PostProcessor disabled:', e);
            this.ok = false;
        }
    }

    private init() {
        const gl = (this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false }) ||
            this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })) as WebGLRenderingContext | null;
        if (!gl) throw new Error('WebGL not supported');
        this.gl = gl;

        const program = this.buildProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
        this.program = program;

        // Full-screen quad (triangle strip).
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        this.buffer = buffer;

        const aPos = gl.getAttribLocation(program, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        for (const name of ['uTex', 'uResolution', 'uTime', 'uGlitch', 'uFreeze', 'uRedFlash', 'uBloom', 'uTint']) {
            this.uniforms[name] = gl.getUniformLocation(program, name);
        }

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        this.texture = texture;
    }

    private buildProgram(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
        const compile = (type: number, src: string): WebGLShader => {
            const shader = gl.createShader(type);
            if (!shader) throw new Error('createShader failed');
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader));
            }
            return shader;
        };
        const program = gl.createProgram();
        if (!program) throw new Error('createProgram failed');
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
        }
        return program;
    }

    apply(source: HTMLCanvasElement, u: PostFxUniforms) {
        const gl = this.gl;
        if (!this.ok || !gl || !this.program) return;

        // Keep the GL drawing buffer matched to the source canvas.
        if (this.canvas.width !== source.width || this.canvas.height !== source.height) {
            this.canvas.width = source.width;
            this.canvas.height = source.height;
        }

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(this.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        // Upload the finished 2D frame as a texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

        gl.uniform1i(this.uniforms.uTex, 0);
        gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.uTime, (performance.now() - this.startTime) / 1000);
        gl.uniform1f(this.uniforms.uGlitch, u.glitch);
        gl.uniform1f(this.uniforms.uFreeze, u.freeze);
        gl.uniform1f(this.uniforms.uRedFlash, u.redFlash);
        gl.uniform1f(this.uniforms.uBloom, 0.5);
        const t = u.tint || [0.012, 0.0, 0.022];
        gl.uniform3f(this.uniforms.uTint, t[0], t[1], t[2]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    dispose() {
        const gl = this.gl;
        if (!gl) return;
        if (this.program) gl.deleteProgram(this.program);
        if (this.texture) gl.deleteTexture(this.texture);
        if (this.buffer) gl.deleteBuffer(this.buffer);
        this.gl = null;
        this.ok = false;
    }
}
