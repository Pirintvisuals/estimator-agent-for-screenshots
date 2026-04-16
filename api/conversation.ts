import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userMessage, conversationState } = request.body;

        if (!userMessage) {
            return response.status(400).json({ error: 'userMessage is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured');
            return response.status(500).json({ error: 'Server configuration error' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const systemPrompt = `
You are an expert Landscaping Sales Consultant for "UK Landscape Consultant."
GOAL: Qualify leads, provide a ballpark estimate, and capture contact details.
TONE: Professional, friendly, "Grounded UK Expert". Use terms like "tyre kickers" (internal thought), "flat out", "garden", "paving".

CRITICAL:
- USE "GEMINI 2.5 FLASH LITE" logic (Fast, smart, natural).
- Natural Language Processing: "My garden is a mess" -> Intent: Full Remodel / Softscaping + Hardscaping.
- Entity Extraction: Identify Service, Material ('standard', 'premium', 'luxury'), Dimensions (meters), and Budget.
- UK Phrasing: "Indian Sandstone", "Sleepers", "Patio", "Turf", "Sub-base".
- "Tyre Kicker" Detection: If budget is tiny (<£1000 for hardscaping) or vague/evasive, gently qualify them out or ask clarity.

RULES:
1. UNIT HANDLING: FENCING is always LINEAR METERS.
2. BUDGET/PHONE: Do NOT extract "height" from budget/phone numbers.
3. SCARCITY: If all info collected (budget, postcode, contact), mention "only 3 slots left".

CURRENT STATE:
${JSON.stringify(conversationState, null, 2)}

USER MESSAGE:
"${userMessage}"

YOUR TASK:
1. Identify the service, dimensions, materials, and other details.
2. Generate a natural response ("agentResponse") based on what you found and what is still missing from the State.
   - If user asks a question, answer it.
   - If user gives info, acknowledge it and ask for the next missing piece of info (Service -> Dimensions -> Material -> Access -> Contact).
   - If user says "similar" or "yeah", take that as confirmation of the previous topic.

Return JSON ONLY:
{
  "extracted": { ... },
  "agentResponse": "Your natural language response here..."
}
`;

        const result = await model.generateContent([
            { text: systemPrompt }
        ]);

        const responseText = result.response.text();

        // Parse JSON from response (strip markdown if present)
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '');
        }

        const parsed = JSON.parse(jsonText);

        return response.status(200).json(parsed);

    } catch (error) {
        console.error('Conversation API error:', error);
        // Fallback response
        return response.status(200).json({
            extracted: {},
            confidence: 0,
            note: 'Fallback mode active'
        });
    }
}
