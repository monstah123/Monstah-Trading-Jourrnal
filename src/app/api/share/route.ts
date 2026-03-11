import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { userId, displayName } = await req.json();
        if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

        // Fetch trades for the user
        const q = query(collection(db, "trades"), where("userId", "==", userId));
        const snapshot = await getDocs(q);
        const trades = snapshot.docs.map((d) => d.data());

        const closed = trades.filter((t) => t.status === "closed");
        const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
        const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
        const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
        const grossWin = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
        const grossLoss = Math.abs(closed.filter((t) => (t.pnl ?? 0) < 0).reduce((s, t) => s + (t.pnl ?? 0), 0));
        const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
        const bestTrade = closed.reduce((best, t) => ((t.pnl ?? 0) > (best.pnl ?? 0) ? t : best), closed[0] ?? {});

        const shareId = `${userId.substring(0, 8)}-${Date.now().toString(36)}`;
        const shareDoc = {
            shareId,
            userId,
            displayName: displayName || "Monstah Trader",
            createdAt: new Date().toISOString(),
            stats: {
                totalTrades: closed.length,
                winRate: Number(winRate.toFixed(1)),
                totalPnl: Number(totalPnl.toFixed(2)),
                profitFactor: profitFactor === Infinity ? 999 : Number(profitFactor.toFixed(2)),
                bestTrade: bestTrade ? { symbol: bestTrade.symbol, pnl: Number((bestTrade.pnl ?? 0).toFixed(2)) } : null,
                wins: wins.length,
                losses: closed.length - wins.length,
            },
        };

        await setDoc(doc(db, "public_shares", shareId), shareDoc);
        return NextResponse.json({ shareId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const shareId = req.nextUrl.searchParams.get("id");
    if (!shareId) return NextResponse.json({ error: "id required" }, { status: 400 });
    try {
        const docSnap = await getDoc(doc(db, "public_shares", shareId));
        if (!docSnap.exists()) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(docSnap.data());
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}
