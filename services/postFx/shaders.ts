// GLSL ES 1.00 shaders for the full-screen post-processing pass.
// Kept WebGL1-compatible (no gl_VertexID, constant-bound loops) so it runs
// on the broadest range of mobile GPUs.

export const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uTex;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGlitch;    // 0..~30, drives chromatic split + slice jitter
uniform float uFreeze;    // 0..1, blue desaturated frost
uniform float uRedFlash;  // 0..1, damage flash
uniform float uBloom;     // bloom strength

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Cheap highlight bloom: a single ring of bright-pass samples.
vec3 bloomSample(vec2 uv) {
    vec2 px = 1.0 / uResolution;
    vec3 sum = vec3(0.0);
    for (int i = 0; i < 8; i++) {
        float a = float(i) / 8.0 * 6.2831853;
        vec2 dir = vec2(cos(a), sin(a));
        vec3 c1 = texture2D(uTex, uv + dir * px * 4.0).rgb;
        vec3 c2 = texture2D(uTex, uv + dir * px * 9.0).rgb;
        sum += max(c1 - 0.55, 0.0);
        sum += max(c2 - 0.55, 0.0) * 0.5;
    }
    return sum / 12.0;
}

void main() {
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = length(center);
    vec2 dir = normalize(center + vec2(1e-5));

    // Chromatic aberration: grows toward edges, spikes with glitch.
    float ca = (0.0014 + uGlitch * 0.0009) * (0.3 + dist);
    vec3 col;
    col.r = texture2D(uTex, uv + dir * ca).r;
    col.g = texture2D(uTex, uv).g;
    col.b = texture2D(uTex, uv - dir * ca).b;

    // Glitch: horizontal slice displacement.
    if (uGlitch > 0.5) {
        float line = floor(uv.y * 90.0);
        float n = hash(vec2(line, floor(uTime * 24.0)));
        if (n > 0.9) {
            float shift = (hash(vec2(line, uTime)) - 0.5) * uGlitch * 0.012;
            col = texture2D(uTex, uv + vec2(shift, 0.0)).rgb;
        }
    }

    // Highlight bloom.
    col += bloomSample(uv) * uBloom;

    // Grade: contrast + saturation + subtle shadow tint.
    col = (col - 0.5) * 1.08 + 0.5;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 1.14);
    col += vec3(0.012, 0.0, 0.022) * (1.0 - luma);

    // Freeze frost.
    if (uFreeze > 0.001) {
        float fl = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 frost = mix(vec3(fl), vec3(0.55, 0.78, 1.0) * fl, 0.6);
        col = mix(col, frost, clamp(uFreeze, 0.0, 1.0));
    }

    // Damage flash.
    col += vec3(0.6, 0.0, 0.0) * clamp(uRedFlash, 0.0, 1.0);

    // Scanlines (fixed density to avoid moire).
    col *= 0.965 + 0.035 * sin(uv.y * 720.0);

    // Vignette.
    float vig = smoothstep(0.9, 0.35, dist);
    col *= mix(0.68, 1.0, vig);

    // Film grain.
    col += (hash(uv * uResolution + uTime) - 0.5) * 0.04;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
