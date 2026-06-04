
import { Vector2 } from '../types';

class InputSystem {
    private keys = new Set<string>();
    private joystickVector: Vector2 = { x: 0, y: 0 };
    private initialized = false;
    private dashRequested = false;
    private mobileDashDir: Vector2 | null = null;

    init() {
        if (this.initialized) return;
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.initialized = true;
    }

    cleanup() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.initialized = false;
        this.keys.clear();
        this.joystickVector = { x: 0, y: 0 };
        this.dashRequested = false;
        this.mobileDashDir = null;
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        this.keys.add(e.code);
        if (e.code === 'Space') {
            e.preventDefault();
            this.dashRequested = true;
        }
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        this.keys.delete(e.code);
    }

    setJoystickVector(vector: Vector2) {
        this.joystickVector = vector;
    }

    isKeyDown(code: string): boolean {
        return this.keys.has(code);
    }

    consumeDashRequest(): boolean {
        const was = this.dashRequested;
        this.dashRequested = false;
        return was;
    }

    triggerDash(): void {
        this.dashRequested = true;
    }

    setDashDirection(dir: Vector2): void {
        this.mobileDashDir = dir;
    }

    consumeDashDirection(): Vector2 | null {
        const d = this.mobileDashDir;
        this.mobileDashDir = null;
        return d;
    }

    getMoveVector(): Vector2 {
        let dx = 0;
        let dy = 0;

        if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
        if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;
        if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
        if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;

        if (this.joystickVector.x !== 0 || this.joystickVector.y !== 0) {
            dx = this.joystickVector.x;
            dy = this.joystickVector.y;
        }

        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            const scale = len > 1 ? 1 / len : 1;
            return { x: dx * scale, y: dy * scale }; // Note: Logic slightly different from original App.tsx which applied length clamp differently, normalized here for consistency
        }

        return { x: 0, y: 0 };
    }
}

export const inputSystem = new InputSystem();