import { GoogleGenerativeAI } from '@google/generative-ai';

interface Env {
    GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const body = await request.json() as any;
        const { userMessage, conversationState } = body;

        if (!userMessage) {
            return new Response(JSON.stringify({ error: 'userMessage is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!env.GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const systemPrompt = `
You are a UK Landscaping Sales Consultant. Qualify leads and capture details.
TONE: Professional, friendly, grounded UK expert.

SERVICE MAPPING:
- "landscaping"/"garden work" -> 'softscaping'
- "patio"/"paving" -> 'hardscaping'
- "deck" -> 'decking'
- "new lawn" -> 'mowing' (maintenance) or 'softscaping' (new turf)
- "fence" -> 'fencing'

STRICT RULES:
1. CONCISENESS: Keep agentResponse UNDER 40 WORDS. No waffle.
2. ZERO REPETITION: Do NOT summarize previously collected data in your response. Never restate project size, service type, postcode etc. Only provide a summary once ALL data is collected.
3. SMART VALIDATION:
   - Accept "k" as thousands (e.g. "13k" = £13,000, "5.5k" = £5,500).
   - If a postcode looks invalid, ask ONE clarifying question. NEVER invent or hallucinate a postcode like "SW1A 0AA".
4. GROUPED QUESTIONS: When asking for personal details, ask for Name, Phone AND Email in ONE single message to reduce form fatigue.
5. SCARCITY: Do NOT mention availability or slots during the conversation. The system will handle this automatically when the estimate is ready.
6. FENCING: Always use LINEAR METERS.
7. "Tyre Kicker" Detection: If budget <£1000 for hardscaping, gently qualify out.
8. ONE QUESTION AT A TIME: Ask only ONE question per response. Never combine unrelated topics (e.g. don't ask about slope AND postcode together).

CURRENT STATE:
${JSON.stringify(conversationState, null, 2)}

USER MESSAGE: "${userMessage}"

TASK:
1. Extract: service, area_m2, length_m, width_m, materialTier, hasExcavatorAccess, hasDrivewayForSkip, slopeLevel, existingDemolition, deckHeight_m, overgrown, gateCount, fullName, contactPhone, contactEmail, userBudget, postalCode.
2. Generate a SHORT agentResponse (<40 words). Acknowledge what the user said, then ask for the NEXT missing info.
3. When asking for contact details, ask for name + phone + email together in one message.

Return JSON ONLY:
{
  "extracted": { ... },
  "agentResponse": "..."
}
`;

        const result = await model.generateContent([
            { text: systemPrompt }
        ]);

        const responseText = result.response.text();
        let jsonText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(jsonText);

        return new Response(JSON.stringify(parsed), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
