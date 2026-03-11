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

    const getCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioCtxRef.current;
    }, []);

    // Crisp coin/cash register chime — two quick ascending tones
    const playClick = useCallback(() => {
        try {
            const ctx = getCtx();
            const now = ctx.currentTime;

            const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, startTime);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration * 0.3);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            // Quick double-chime like a cash register
            playTone(880, now, 0.12, 0.18);
            playTone(1320, now + 0.08, 0.14, 0.14);
        } catch (_) { }
    }, [getCtx]);

    // Ascending success chime (save trade, etc.)
    const playSuccess = useCallback(() => {
        try {
            const ctx = getCtx();
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
    }, [getCtx]);

    // Short descending error buzz
    const playError = useCallback(() => {
        try {
            const ctx = getCtx();
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
