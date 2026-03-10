import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { trades, question, type } = await request.json();

        let systemPrompt = '';
        let userMessage = '';

        if (type === 'analyze') {
            systemPrompt = `You are Monstah AI, an elite trading coach and analyst built into the Monstah Trading Journal. 
You analyze trading data and provide actionable insights. Be direct, specific, and use trading terminology.
Format your responses with clear sections using markdown. Use emojis sparingly for visual appeal.
Focus on: patterns, mistakes, strengths, risk management, and psychological insights.`;

            const tradesSummary = trades.map((t: Record<string, unknown>) =>
                `${t.date}: ${t.direction} ${t.symbol} | Entry: $${t.entryPrice} Exit: $${t.exitPrice} | P&L: $${t.pnl} | Setup: ${t.setup} | Emotion Before: ${t.emotionBefore} | Notes: ${t.notes}`
            ).join('\n');

            userMessage = `Analyze these trades and provide insights:\n\n${tradesSummary}\n\nProvide:
1. Overall Performance Summary
2. Patterns Identified (both good and bad)
3. Emotional Trading Patterns
4. Risk Management Assessment
5. Top 3 Actionable Improvements
6. A Monstah Score (1-100) rating overall performance`;
        } else if (type === 'question') {
            systemPrompt = `You are Monstah AI, an elite trading coach. You have access to the trader's journal data.
Answer questions about their trading performance, strategies, and provide coaching advice.
Be specific and actionable. Reference their actual data when possible.`;

            const tradesSummary = trades.map((t: Record<string, unknown>) =>
                `${t.date}: ${t.direction} ${t.symbol} | Entry: $${t.entryPrice} Exit: $${t.exitPrice} | P&L: $${t.pnl} | Setup: ${t.setup} | Emotion: ${t.emotionBefore}→${t.emotionAfter}`
            ).join('\n');

            userMessage = `Here is my trading data:\n${tradesSummary}\n\nMy question: ${question}`;
        } else if (type === 'daily_review') {
            systemPrompt = `You are Monstah AI. Generate a concise daily trading review based on the provided trades.
Include what went well, what to improve, and one key lesson. Keep it motivational and actionable.`;

            const tradesSummary = trades.map((t: Record<string, unknown>) =>
                `${t.direction} ${t.symbol} | P&L: $${t.pnl} | Setup: ${t.setup} | Confidence: ${t.confidence}/10 | Emotions: ${t.emotionBefore}→${t.emotionAfter}`
            ).join('\n');

            userMessage = `Generate a daily review for these trades:\n${tradesSummary}`;
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            max_tokens: 1500,
            temperature: 0.7,
        });

        const response = completion.choices[0]?.message?.content || 'No analysis available.';

        return NextResponse.json({ result: response });
    } catch (error) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate AI analysis' },
            { status: 500 }
        );
    }
}
