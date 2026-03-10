'use client';

import { Trade, JournalEntry, Playbook } from '@/types/trade';

const STORAGE_KEYS = {
    TRADES: 'monstah_trades',
    JOURNAL: 'monstah_journal',
    PLAYBOOKS: 'monstah_playbooks',
    SETTINGS: 'monstah_settings',
};

function getFromStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
}

function setToStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Storage error:', error);
    }
}

// Trades
export function getTrades(): Trade[] {
    return getFromStorage<Trade[]>(STORAGE_KEYS.TRADES, []);
}

export function saveTrade(trade: Trade): void {
    const trades = getTrades();
    const existingIndex = trades.findIndex(t => t.id === trade.id);
    if (existingIndex >= 0) {
        trades[existingIndex] = { ...trade, updatedAt: new Date().toISOString() };
    } else {
        trades.push(trade);
    }
    setToStorage(STORAGE_KEYS.TRADES, trades);
}

export function deleteTrade(id: string): void {
    const trades = getTrades().filter(t => t.id !== id);
    setToStorage(STORAGE_KEYS.TRADES, trades);
}

export function getTradeById(id: string): Trade | undefined {
    return getTrades().find(t => t.id === id);
}

// Journal
export function getJournalEntries(): JournalEntry[] {
    return getFromStorage<JournalEntry[]>(STORAGE_KEYS.JOURNAL, []);
}

export function saveJournalEntry(entry: JournalEntry): void {
    const entries = getJournalEntries();
    const existingIndex = entries.findIndex(e => e.id === entry.id);
    if (existingIndex >= 0) {
        entries[existingIndex] = { ...entry, updatedAt: new Date().toISOString() };
    } else {
        entries.push(entry);
    }
    setToStorage(STORAGE_KEYS.JOURNAL, entries);
}

export function deleteJournalEntry(id: string): void {
    const entries = getJournalEntries().filter(e => e.id !== id);
    setToStorage(STORAGE_KEYS.JOURNAL, entries);
}

// Playbooks
export function getPlaybooks(): Playbook[] {
    return getFromStorage<Playbook[]>(STORAGE_KEYS.PLAYBOOKS, []);
}

export function savePlaybook(playbook: Playbook): void {
    const playbooks = getPlaybooks();
    const existingIndex = playbooks.findIndex(p => p.id === playbook.id);
    if (existingIndex >= 0) {
        playbooks[existingIndex] = { ...playbook, updatedAt: new Date().toISOString() };
    } else {
        playbooks.push(playbook);
    }
    setToStorage(STORAGE_KEYS.PLAYBOOKS, playbooks);
}

// Generate unique ID
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
