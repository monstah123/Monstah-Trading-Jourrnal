"use client";

import { createContext, useContext, useCallback, ReactNode, useEffect, useRef } from "react";

interface SoundContextType {
    playClick: () => void;
    playSuccess: () => void;
    playError: () => void;
    playHover: () => void;
    playMoney: () => void;
}

const SoundContext = createContext<SoundContextType>({
    playClick: () => { },
    playSuccess: () => { },
    playError: () => { },
    playHover: () => { },
    playMoney: () => { },
});

export function SoundProvider({ children }: { children: ReactNode }) {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getCtx = useCallback(async () => {
        try {
            if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            
            // Browsers suspend AudioContext after navigation/inactivity
            if (audioCtxRef.current.state === "suspended") {
                await audioCtxRef.current.resume();
            }
            
            return audioCtxRef.current;
        } catch (err) {
            console.error("AudioContext initialization failed:", err);
            // If it fails, try once more with a fresh context
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            return audioCtxRef.current;
        }
    }, []);

    // Updated playClick to be a premium "Money Sparkle" sound for all app navigation
    const playClick = useCallback(() => {
        getCtx().then((ctx) => {
            try {
                const now = ctx.currentTime;

                // High-frequency "Money" sparkle hit — satisfying and expensive sounding
                const freqs = [1046.50, 1318.51, 1567.98, 2093.00]; // C6, E6, G6, C7
                freqs.forEach((f, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(f, now + i * 0.03);
                    
                    gain.gain.setValueAtTime(0, now + i * 0.03);
                    gain.gain.linearRampToValueAtTime(0.08, now + i * 0.03 + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.2);
                    
                    osc.start(now + i * 0.03);
                    osc.stop(now + i * 0.03 + 0.3);
                });
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

    // "Swoosh" sound for hovers
    const playHover = useCallback(() => {
        getCtx().then((ctx) => {
            try {
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                osc.connect(gainNode);
                gainNode.connect(ctx.destination);
                osc.type = "sine";
                // Quick frequency slide for "swoosh"
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.05, now + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.2);
            } catch (_) { }
        }).catch(() => { });
    }, [getCtx]);

    // Money/Ka-ching sound (optimized sparkle)
    const playMoney = useCallback(() => {
        getCtx().then((ctx) => {
            try {
                const now = ctx.currentTime;
                // High frequency series
                const freqs = [1046, 1318, 1567, 2093];
                freqs.forEach((f, i) => {
                    const osc = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();
                    
                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(f, now + i * 0.05);
                    
                    filter.type = "highpass";
                    filter.frequency.setValueAtTime(1000, now);
                    
                    gain.gain.setValueAtTime(0, now + i * 0.05);
                    gain.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
                    
                    osc.start(now + i * 0.05);
                    osc.stop(now + i * 0.05 + 0.4);
                });
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
        <SoundContext.Provider value={{ playClick, playSuccess, playError, playHover, playMoney }}>
            {children}
        </SoundContext.Provider>
    );
}

export const useSound = () => useContext(SoundContext);
