/**
 * TaalQuest API Functions
 * Shared module for scenario and script generation
 */

import { API, MODELS, RESPONSE_FORMATS, TEMPERATURE, IMAGE_CONFIG } from './constants.js';

/**
 * Generate a rich, realistic scenario for a Dutch conversation.
 * Uses two API calls: one for creative generation, one for JSON formatting.
 */
export async function generateScenario(apiKey, char1Name, char2Name) {
    // Step 1: Creative generation without JSON constraints
    const creativePrompt = `You are a creative writer helping design scenarios for Dutch language learning.

Generate a rich, realistic everyday scenario that someone living in Utrecht, Netherlands might encounter. This person is a professional with a family - they're active, social, and engaged in their community.

Create ONE scenario involving exactly two people: ${char1Name} and ${char2Name}.

CRITICAL: You MUST choose from the FULL range of situations below. DO NOT default to markets, gardens, or cafes. Pick something UNEXPECTED:

INDOOR SETTINGS:
- Waiting room (huisarts, tandarts, apotheek, gemeente)
- Library (studying, returning late book, kids' section)
- Museum (Centraal Museum, Miffy Museum, discussing an exhibit)
- Swimming pool (zwembad) changing room or poolside
- Bowling alley, escape room lobby, cinema queue
- Apartment building hallway, elevator, laundry room
- Bakery (ordering bread, birthday cake pickup)
- Hardware store (Gamma, Praxis - asking for help)
- Clothing store fitting room area
- Pet store, plant nursery (tuincentrum)
- Music lesson waiting area, dance studio

OUTDOOR SETTINGS:
- Playground (speeltuin) - parents watching kids
- Dog park (hondenuitlaatplaats)
- Football field sidelines (kids' match)
- Boat rental at Oudegracht
- Flea market or kringloopwinkel
- Moving day (someone loading a van)
- Stuck in rain under an awning together
- Flat tire situation (fiets or car)
- Lost tourist asking for help
- Food truck queue at a festival
- Picking up kids from swimming lessons
- Outside school gates waiting

TRANSACTIONAL:
- Returning something that doesn't fit
- Complaining about a wrong order (politely)
- Asking if someone dropped something
- Warning about parking enforcement nearby
- Discussing a power outage in the building
- Coordinating trash bin placement
- Exchanging contact info after a fender bender

UNEXPECTED MOMENTS:
- Recognizing someone from long ago
- Awkward elevator silence breaker
- Overhearing and relating to someone's phone call
- Both reaching for the last item on a shelf
- One person's kid causing minor chaos
- Dealing with a wasp at an outdoor table
- Phone dying, asking to borrow a charger

Write a vivid paragraph (4-6 sentences) describing:
1. THE SETTING: Where exactly are they? What time of day? What's the atmosphere?
2. WHO THEY ARE: Brief but specific details about each person. Their relationship (strangers, neighbors, acquaintances, etc.)
3. THE DYNAMIC: Is there any tension, awkwardness, excitement, or particular mood? What makes this interaction interesting?
4. THE CONVERSATION HOOK: What brings them to speak? What might they discuss?

Be creative and SPECIFIC. AVOID: generic coffee ordering, farmers markets, gardens, and bike shops (overused). Make it feel like a real slice of Dutch life with texture and personality.`;

    const creativeResponse = await fetch(`${API.BASE_URL}${API.ENDPOINTS.CHAT_COMPLETIONS}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODELS.CHAT,
            messages: [{ role: 'user', content: creativePrompt }],
            temperature: TEMPERATURE.CREATIVE
        })
    });

    if (!creativeResponse.ok) {
        const error = await creativeResponse.json();
        throw new Error(error.error?.message || 'Scenario generation failed');
    }

    const creativeData = await creativeResponse.json();
    const rawScenario = creativeData.choices[0].message.content;

    // Step 2: Transform to structured JSON
    const structurePrompt = `Extract the following information from this scenario description and return it as valid JSON:

SCENARIO:
${rawScenario}

Return this exact JSON structure:
{
  "scenario_description": "the full scenario description as written above",
  "setting_type": "one or two word category like 'neighborhood', 'school', 'cafe', 'gym', 'market', etc.",
  "mood": "one or two word mood like 'friendly', 'slightly awkward', 'hurried', 'warm', 'tense', etc.",
  "character1_role": "brief role description for ${char1Name}",
  "character2_role": "brief role description for ${char2Name}"
}`;

    const structureResponse = await fetch(`${API.BASE_URL}${API.ENDPOINTS.CHAT_COMPLETIONS}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODELS.CHAT,
            messages: [{ role: 'user', content: structurePrompt }],
            response_format: RESPONSE_FORMATS.JSON,
            temperature: TEMPERATURE.DETERMINISTIC
        })
    });

    if (!structureResponse.ok) {
        const error = await structureResponse.json();
        throw new Error(error.error?.message || 'Scenario structuring failed');
    }

    const structureData = await structureResponse.json();
    return JSON.parse(structureData.choices[0].message.content);
}

/**
 * Generate a conversation outline for focused, coherent dialogue.
 * Stage 1 of 2 in script generation.
 */
async function generateConversationOutline(apiKey, char1Name, char2Name, scenarioDescription) {
    const outlinePrompt = `You are planning a short, focused Dutch conversation for language learners.

SCENARIO:
${scenarioDescription}

Plan a coherent 4-6 line conversation between ${char1Name} and ${char2Name}.

IMPORTANT RULES:
- Choose ONE main topic from the scenario (don't try to cover everything)
- The conversation must flow naturally - each line responds to what was just said
- Keep it simple and focused - this is for A1 learners

Plan the conversation structure:
1. OPENING: How does the first person start? (greeting + initial question/comment)
2. RESPONSE: How does the second person respond to EXACTLY what was said?
3. FOLLOW-UP: First person responds to that answer (stay on same topic!)
4. CONTINUATION: Second person continues the same thread
5. CLOSING: Natural wrap-up related to what was discussed

Return JSON:
{
  "main_topic": "the single topic this conversation focuses on",
  "opening_intent": "what ${char1Name} wants to say/ask",
  "response_intent": "how ${char2Name} directly answers/responds",
  "followup_intent": "how ${char1Name} continues on the SAME topic",
  "continuation_intent": "how ${char2Name} builds on that",
  "closing_intent": "how they wrap up (goodbye, thanks, see you later, etc.)",
  "situation_summary": "1 sentence description for the learner (in English)"
}`;

    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.CHAT_COMPLETIONS}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODELS.CHAT,
            messages: [{ role: 'user', content: outlinePrompt }],
            response_format: RESPONSE_FORMATS.JSON,
            temperature: TEMPERATURE.BALANCED
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Outline generation failed');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}

/**
 * Generate the actual dialogue from an outline.
 * Stage 2 of 2 in script generation.
 */
async function generateDialogueFromOutline(apiKey, char1, char2, outline) {
    const dialoguePrompt = `You are a Dutch language teacher writing A1 level dialogue.

CONVERSATION PLAN:
- Topic: ${outline.main_topic}
- Setting: ${outline.situation_summary}

LINE-BY-LINE PLAN:
1. ${char1.name}: ${outline.opening_intent}
2. ${char2.name}: ${outline.response_intent}
3. ${char1.name}: ${outline.followup_intent}
4. ${char2.name}: ${outline.continuation_intent}
5. One or both: ${outline.closing_intent}

Write this conversation in Dutch (A1 level) following the plan EXACTLY.

CRITICAL RULES:
- Each line MUST follow the plan above
- Each line MUST directly respond to what was just said
- Do NOT add new topics or information not in the plan
- Use simple present tense and basic A1 vocabulary
- 4-6 lines total (can combine closing with previous line if natural)

Also create 4 comprehension questions:
- Questions in English (for A1 learners)
- First 3: Test basic details from the dialogue (who, what, where)
- Last 1: Slightly harder inference question
- 4 options each, mark correct answer (0-3 index)

Return JSON:
{
  "situation": "${outline.situation_summary}",
  "characters": ["${char1.name}", "${char2.name}"],
  "dialogue": [
    {"speaker": "${char1.name}", "text": "Dutch text", "translation": "English translation", "voice_id": ${char1.voice_id}},
    {"speaker": "${char2.name}", "text": "Dutch text", "translation": "English translation", "voice_id": ${char2.voice_id}}
  ],
  "questions": [
    {
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0
    }
  ]
}`;

    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.CHAT_COMPLETIONS}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODELS.CHAT,
            messages: [{ role: 'user', content: dialoguePrompt }],
            response_format: RESPONSE_FORMATS.JSON,
            temperature: TEMPERATURE.FOCUSED
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Dialogue generation failed');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}

/**
 * Generate a Dutch A1-level dialogue script based on a scenario description.
 * Uses two-stage generation: outline first, then dialogue.
 */
export async function generateScript(apiKey, char1, char2, scenarioDescription) {
    // Stage 1: Generate conversation outline
    const outline = await generateConversationOutline(
        apiKey,
        char1.name,
        char2.name,
        scenarioDescription
    );

    // Stage 2: Generate dialogue from outline
    const script = await generateDialogueFromOutline(apiKey, char1, char2, outline);

    // Post-process: Ensure voice_ids match speakers (LLM may not follow instructions)
    const voiceMap = {
        [char1.name]: char1.voice_id,
        [char2.name]: char2.voice_id
    };

    script.dialogue = script.dialogue.map(line => ({
        ...line,
        voice_id: voiceMap[line.speaker] ?? char1.voice_id
    }));

    return script;
}

/**
 * Generate a scene illustration for the scenario.
 * Returns a blob URL for the generated image.
 */
export async function generateSceneImage(apiKey, settingType, mood, scenarioDescription, char1, char2) {
    // Build a prompt for New Yorker cartoon style scene illustrations
    const characterDesc = char1 && char2
        ? `\n\nCharacters: ${char1.name} (${char1.appearance}) and ${char2.name} (${char2.appearance}). Show these two specific people interacting.`
        : '';

    const prompt = `STYLE REQUIREMENTS (MANDATORY):
- Classic New Yorker magazine single-panel cartoon
- Hand-drawn ink linework with confident, flowing strokes
- Watercolor wash with MUTED, LIMITED palette (2-3 colors max plus black ink)
- NO photorealism, NO digital polish, NO gradients
- NO text, NO captions, NO speech bubbles, NO words of any kind

SCENE: ${scenarioDescription}${characterDesc}

Setting: ${settingType} | Mood: ${mood}

ARTISTIC DIRECTION:
The illustration MUST look like it belongs in the pages of The New Yorker. Think William Steig, Roz Chast, or Edward Koren. Emphasize:
- Loose, expressive linework (not tight or mechanical)
- Characters with personality shown through posture and gesture
- Subtle wit in the scene composition
- Elegant simplicity - suggest details rather than rendering everything
- Cream/off-white paper background visible through watercolor washes
- Dutch urban elements (bicycles, brick, canals) rendered with the same loose editorial style`;


    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.IMAGES_GENERATIONS}`, {
        method: 'POST'
      , headers: {
            'Authorization': `Bearer ${apiKey}`
          , 'Content-Type': 'application/json'
        }
      , body: JSON.stringify({
            model: MODELS.IMAGE
          , prompt: prompt
          , n: 1
          , size: IMAGE_CONFIG.SIZE
          , quality: IMAGE_CONFIG.QUALITY
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Image generation failed');
    }

    const data = await response.json();
    // gpt-image models return b64_json, convert to data URL for img tag
    if (data.data[0].b64_json) {
        return `data:image/png;base64,${data.data[0].b64_json}`;
    }
    // Fallback for models that return URL (e.g., dall-e-3)
    return data.data[0].url;
}
