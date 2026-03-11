"use client";

import { createContext, useContext, useCallback, ReactNode, useEffect, useRef } from "react";

interface SoundContextType {
    playClick: () => void;
    playSuccess: () => void;
    playError: () => void;
}

const SoundContext = createContext<SoundContextType>({
    playClick: () => { },
    playSuccess: () => { },
    playError: () => { },
});

export function SoundProvider({ children }: { children: ReactNode }) {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getCtx = useCallback(async () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        // Always resume — browsers suspend AudioContext after navigation/inactivity
        if (audioCtxRef.current.state === "suspended") {
            await audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    }, []);

    // "Cha-CHING" — low thud + high sparkle ring clearly separated
    const playClick = useCallback(() => {
        getCtx().then((ctx) => {
            try {
                const now = ctx.currentTime;

                // First hit — punchy low thud ("CHA")
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.type = "triangle";
                osc1.frequency.setValueAtTime(440, now);
                osc1.frequency.exponentialRampToValueAtTime(220, now + 0.09);
                gain1.gain.setValueAtTime(0.4, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
                osc1.start(now);
                osc1.stop(now + 0.15);

                // Second hit — sparkle high ring ("CHING") 150ms later
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.type = "sine";
                osc2.frequency.setValueAtTime(1760, now + 0.15);
                osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.5);
                gain2.gain.setValueAtTime(0, now + 0.15);
                gain2.gain.linearRampToValueAtTime(0.32, now + 0.16);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc2.start(now + 0.15);
                osc2.stop(now + 0.65);

                // Shimmer overtone on top of ring
                const osc3 = ctx.createOscillator();
                const gain3 = ctx.createGain();
                osc3.connect(gain3);
                gain3.connect(ctx.destination);
                osc3.type = "sine";
                osc3.frequency.setValueAtTime(3520, now + 0.15);
                gain3.gain.setValueAtTime(0, now + 0.15);
                gain3.gain.linearRampToValueAtTime(0.12, now + 0.16);
                gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc3.start(now + 0.15);
                osc3.stop(now + 0.4);
            } catch (_) { }
        }).catch(() => { });
    }, [getCtx]);

    // Ascending success chime (save trade, etc.)
    const playSuccess = useCallback(() => {
        getCtx().then((ctx) => {
            try {
                const now = ctx.currentTime;
                const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gainNode = ctx.createGain();
                    osc.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, now + i * 0.1);
                    gainNode.gain.setValueAtTime(0, now + i * 0.1);
                    gainNode.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.25);
                });
            } catch (_) { }
        }).catch(() => { });
    }, [getCtx]);

    // Short descending error buzz
    const playError = useCallback(() => {
        getCtx().then((ctx) => {
            try {
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
                gainNode.gain.setValueAtTime(0.12, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.25);
            } catch (_) { }
        }).catch(() => { });
    }, [getCtx]);

    // Listen for nav link clicks globally
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const navLink = target.closest("a.nav-link, button.btn, a.btn");
            if (navLink) {
                playClick();
            }
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [playClick]);

    return (
        <SoundContext.Provider value={{ playClick, playSuccess, playError }}>
            {children}
        </SoundContext.Provider>
    );
}

export const useSound = () => useContext(SoundContext);
