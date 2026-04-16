/**
 * Conversation Manager - Multi-Turn Chatbot Logic
 * 
 * Handles state tracking, intent detection, and question generation
 * for the conversational UK Landscape QS agent.
 */

import type { ServiceType, MaterialTier, SlopeLevel, SubBaseType } from './qouter'

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
    id: string
    role: 'agent' | 'user' | 'estimate'
    content: string
    timestamp: Date
}

export interface ConversationState {
    // Service detection
    service: ServiceType | null

    // Dimensions
    area_m2: number | null
    length_m: number | null
    width_m: number | null

    // Material selection
    materialTier: MaterialTier | null

    // Site conditions
    hasExcavatorAccess: boolean | null
    hasDrivewayForSkip: boolean | null
    slopeLevel: SlopeLevel | null
    subBaseType: SubBaseType | null
    existingDemolition: boolean | null

    // Service-specific fields
    deckHeight_m: number | null
    overgrown: boolean | null  // For mowing
    gateCount: number | null   // For fencing

    // Upsells (Revenue Multiplier)
    wantsDrainage: boolean | null  // +£850
    wantsLedLighting: boolean | null  // +£1,200

    // Conversation metadata
    messageHistory: ChatMessage[]
    certaintyLevel: number  // 0-100
    awaitingEstimate: boolean

    // Retry tracking for fallback system
    retryCount: Record<string, number>  // Track failed attempts per field
    lastQuestionField: string | null    // Track what field was last asked about
    showQuickReplies: boolean           // Whether to show clickable options

    // Lead qualification
    budgetAligns: boolean | null  // true = aligns, false = adjust scope
    contactPhone: string | null
    contactEmail: string | null

    // User information (collected before revealing estimate)
    fullName: string | null
    userBudget: number | null  // User's estimated budget
    postalCode: string | null

    // New fields per user request
    projectStartTiming: string | null
    groundSoilType: string | null
    additionalNotes: string | null
}

export interface ExtractedInfo {
    service?: ServiceType
    area_m2?: number
    length_m?: number
    width_m?: number
    materialTier?: MaterialTier
    hasExcavatorAccess?: boolean
    hasDrivewayForSkip?: boolean
    slopeLevel?: SlopeLevel
    subBaseType?: SubBaseType
    existingDemolition?: boolean
    deckHeight_m?: number
    overgrown?: boolean
    gateCount?: number
    wantsDrainage?: boolean
    wantsLedLighting?: boolean
    budgetAligns?: boolean
    fullName?: string
    userBudget?: number
    postalCode?: string
    contactEmail?: string
    contactPhone?: string
    projectStartTiming?: string
    groundSoilType?: string
    explicitBudget?: boolean // True if input had currency symbols or 'budget' keyword
    agentResponse?: string   // Natural language response from AI
    additionalNotes?: string
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export function createInitialState(): ConversationState {
    return {
        service: null,
        area_m2: null,
        length_m: null,
        width_m: null,
        materialTier: null,
        hasExcavatorAccess: null,
        hasDrivewayForSkip: null,
        slopeLevel: null,
        subBaseType: null,
        existingDemolition: null,
        deckHeight_m: null,
        overgrown: null,
        gateCount: null,
        wantsDrainage: null,
        wantsLedLighting: null,
        messageHistory: [],
        certaintyLevel: 0,
        awaitingEstimate: false,
        retryCount: {},
        lastQuestionField: null,
        showQuickReplies: false,
        budgetAligns: null,
        contactPhone: null,
        contactEmail: null,
        fullName: null,
        userBudget: null,
        postalCode: null,
        projectStartTiming: null,
        groundSoilType: null,
        additionalNotes: null
    }
}

// ============================================================================
// CERTAINTY CALCULATION
// ============================================================================

export function calculateCertainty(state: ConversationState): number {
    let score = 0
    let maxScore = 0

    // Service type (25 points - critical)
    maxScore += 25
    if (state.service) score += 25

    // Dimensions (30 points - critical for pricing)
    maxScore += 30
    if (state.area_m2 || (state.length_m && state.width_m)) {
        score += 30
    }

    // Material tier (20 points - important for accurate pricing)
    maxScore += 20
    if (state.materialTier) score += 20

    // Service-specific scoring (25 points)
    if (state.service === 'mowing') {
        maxScore += 25
        if (state.overgrown !== null) score += 25
    } else if (state.service === 'planting' || state.service === 'softscaping') {
        maxScore += 10
        if (state.slopeLevel) score += 5
        if (state.hasDrivewayForSkip !== null) score += 5
    } else {
        maxScore += 10
        if (state.hasExcavatorAccess !== null) score += 10

        maxScore += 5
        if (state.hasDrivewayForSkip !== null) score += 5

        maxScore += 5
        if (state.slopeLevel) score += 5

        maxScore += 5
        if (state.existingDemolition !== null) score += 5
    }

    return Math.round((score / maxScore) * 100)
}

// ============================================================================
// QUESTION GENERATION
// ============================================================================

export function getNextQuestion(state: ConversationState): string | null {
    // Priority 1: Service type
    if (!state.service) {
        return "Good day. I'm the Digital Front Desk for your professional landscaping requirements. I'll calculate a ballpark investment for your project. What service are you interested in today?"
    }

    // Priority 2: Dimensions
    if (!state.area_m2 && !state.length_m && !state.width_m) {
        const serviceExamples: Record<ServiceType, string> = {
            hardscaping: "How large of an area are we working with? You can give me rough dimensions like '10 meters by 5 meters' or just the total area.",
            decking: "How large of an area are we working with? You can give me rough dimensions like '8m x 4m' or just the total area.",
            softscaping: "What's the size of the area you'd like landscaped? Rough dimensions are fine.",
            mowing: "How large is your lawn? You can tell me in square meters or give rough dimensions.",
            planting: "What size is the planting area? Rough dimensions or total area would help.",
            fencing: "How much fencing do you need? You can give me the perimeter length in meters.",
            framing: "What's the footprint of the structure you're thinking about? Give me rough dimensions."
        }
        return serviceExamples[state.service]
    }

    // Priority 3: Material tier
    if (!state.materialTier) {
        const tierQuestions: Record<ServiceType, string> = {
            hardscaping: "What material are you considering? Options range from concrete pavers (Essential) to Indian sandstone (Premium) to porcelain paving (Luxury).",
            decking: "What material are you considering—softwood (Essential), composite (Premium), or hardwood like Ipe (Luxury)?",
            softscaping: "What level of landscaping are you thinking? Basic planting (Essential), specimen plants (Premium), or full architectural design (Luxury)?",
            mowing: "What level of service do you need? Basic cut and collect (Essential), precision cut with edging (Premium), or full grounds maintenance (Luxury)?",
            planting: "What type of plants are you thinking about? Container plants (Essential), specimen plants (Premium), or architectural planting (Luxury)?",
            fencing: "What material are you considering? Softwood panels (Essential), treated slats (Premium), or premium cedar (Luxury)?",
            framing: "What type of structure? Basic pergola frame (Essential), engineered timber (Premium), or custom hardwood (Luxury)?"
        }
        return tierQuestions[state.service]
    }

    // Priority 4: Site access - CRITICAL FLOW FIX
    // If we know the slope (or it was just mentioned), we MUST ask about access next if unknown.
    const excavationServices = ['hardscaping', 'decking', 'fencing', 'framing']

    // Check if slope is known but access is NOT known
    if (state.slopeLevel && state.hasExcavatorAccess === null && state.service && excavationServices.includes(state.service)) {
        return "With that slope, access is key. Is there a way for a small digger (about 90cm wide) to get into the garden, or is the gate narrower?"
    }

    if (state.hasExcavatorAccess === null && state.service && excavationServices.includes(state.service)) {
        return "Is there a way for a small digger (about 90cm wide) to get into your garden, or is the gate narrower than that?"
    }

    // Priority 5: Service-specific questions
    if (state.service === 'decking' && state.deckHeight_m === null) {
        return "How high off the ground will this deck be? This helps me factor in safety requirements."
    }
    if (state.service === 'mowing' && state.overgrown === null) {
        return "When was it last cut? If it's been more than 2 weeks, I'll need to factor in extra time for collection."
    }
    if (state.service === 'fencing' && state.gateCount === null) {
        return "Will you need any gates in this fence?"
    }

    // Priority 6: Site conditions
    const heavyWorkServices = ['hardscaping', 'decking', 'fencing', 'framing', 'softscaping']
    if (state.hasDrivewayForSkip === null && state.service && heavyWorkServices.includes(state.service)) {
        return "Is there a driveway where we can place a skip for waste disposal, or would it need to go on the street?"
    }
    if (state.slopeLevel === null && state.service && heavyWorkServices.includes(state.service)) {
        return "How would you describe the ground—fairly flat, moderate slope, or quite steep?"
    }
    if (state.existingDemolition === null && (state.service === 'hardscaping' || state.service === 'decking')) {
        return "Is there any existing hardscape or structure we'd need to remove first?"
    }

    // Priority 7: User information — GROUPED to reduce form fatigue
    if (!state.fullName || !state.contactPhone || !state.contactEmail) {
        return "Nearly there! Could you share your full name, phone number, and email so I can prepare your estimate?"
    }
    if (state.userBudget === null) {
        return "What budget have you set aside for this project? This helps me understand if we're aligned."
    }
    if (!state.projectStartTiming) {
        return "When are you looking to get started?"
    }
    if (!state.postalCode) {
        return "Finally, what's the postcode for the project address?"
    }

    return null
}

// ============================================================================
// ACKNOWLEDGMENT GENERATION
// ============================================================================

export function generateAcknowledgment(_state: ConversationState, extracted: ExtractedInfo): string {
    const acks: string[] = []

    if (extracted.service) {
        const serviceNames: Record<ServiceType, string> = {
            hardscaping: "Hardscaping can really transform a space.",
            decking: "Decking is a great choice for outdoor living.",
            softscaping: "Landscaping will bring so much character to your garden.",
            mowing: "I can help you get that lawn looking pristine.",
            planting: "Beautiful planting can make all the difference.",
            fencing: "A good fence adds privacy and defines your space.",
            framing: "Outdoor structures create wonderful focal points."
        }
        acks.push(serviceNames[extracted.service])
    }
    if (extracted.area_m2 || (extracted.length_m && extracted.width_m)) {
        const area = extracted.area_m2 || (extracted.length_m! * extracted.width_m!)
        acks.push(`So roughly ${area.toFixed(0)} square meters.`)
    }
    if (extracted.materialTier === 'luxury') acks.push("Luxury choice—that'll look stunning.")
    else if (extracted.materialTier === 'premium') acks.push("Solid Premium option with great longevity.")
    else if (extracted.materialTier === 'standard') acks.push("Good Essential option.")

    if (extracted.hasExcavatorAccess === false && _state.hasExcavatorAccess === null) {
        acks.push("Since the access is narrow, I'll need to factor in manual labor for the excavation phase.")
    }
    if (extracted.slopeLevel === 'steep') {
        acks.push("Given that the ground is steep, we'll need specialized grading equipment.")
    }
    if (extracted.deckHeight_m && extracted.deckHeight_m > 1.5) {
        acks.push(`At ${extracted.deckHeight_m.toFixed(1)}m height, we'll need scaffolding for safety.`)
    }
    if (extracted.overgrown) {
        acks.push("Since it's been a while since the last cut, I'll factor in extra time for collection.")
    }
    if (extracted.gateCount && extracted.gateCount > 0) {
        const plural = extracted.gateCount > 1 ? 'gates' : 'gate'
        acks.push(`I'll include ${extracted.gateCount} ${plural} in the estimate.`)
    }

    return acks.join(' ')
}

// ============================================================================
// STATE UPDATE
// ============================================================================

export function updateStateWithExtraction(
    state: ConversationState,
    extracted: ExtractedInfo,
    currentField?: string
): ConversationState {
    const updated = { ...state }

    if (extracted.service) updated.service = extracted.service

    // SAFEGUARD: Don't overwrite Area with tiny numbers
    if (extracted.area_m2) {
        const isDimensionsQuestion = state.lastQuestionField === 'dimensions' || !state.area_m2
        if (state.area_m2 && state.area_m2 > 2 && extracted.area_m2 < 2 && !isDimensionsQuestion) {
            // Ignore
        } else {
            updated.area_m2 = extracted.area_m2
        }
    }
    if (extracted.length_m) updated.length_m = extracted.length_m
    if (extracted.width_m) updated.width_m = extracted.width_m
    if (extracted.materialTier) updated.materialTier = extracted.materialTier
    if (extracted.hasExcavatorAccess !== undefined) updated.hasExcavatorAccess = extracted.hasExcavatorAccess
    if (extracted.hasDrivewayForSkip !== undefined) updated.hasDrivewayForSkip = extracted.hasDrivewayForSkip
    if (extracted.slopeLevel) updated.slopeLevel = extracted.slopeLevel
    if (extracted.subBaseType) updated.subBaseType = extracted.subBaseType
    if (extracted.existingDemolition !== undefined) updated.existingDemolition = extracted.existingDemolition

    if (extracted.deckHeight_m !== undefined) {
        if (state.service === 'decking' || extracted.service === 'decking') {
            updated.deckHeight_m = extracted.deckHeight_m
        }
    }

    if (extracted.overgrown !== undefined) updated.overgrown = extracted.overgrown
    if (extracted.gateCount !== undefined) updated.gateCount = extracted.gateCount
    if (extracted.wantsDrainage !== undefined) updated.wantsDrainage = extracted.wantsDrainage
    if (extracted.wantsLedLighting !== undefined) updated.wantsLedLighting = extracted.wantsLedLighting
    if (extracted.budgetAligns !== undefined) updated.budgetAligns = extracted.budgetAligns

    const effectiveField = currentField || state.lastQuestionField || detectCurrentField(state)
    const isNameQuestion = effectiveField === 'fullName'

    if (extracted.fullName && (isNameQuestion || extracted.fullName.toLowerCase().includes('name is'))) {
        updated.fullName = extracted.fullName
    }

    const isBudgetQuestion = effectiveField === 'userBudget'
    if (extracted.userBudget !== undefined) {
        if (isBudgetQuestion || extracted.explicitBudget) {
            updated.userBudget = extracted.userBudget
        }
    }

    if (extracted.contactEmail) updated.contactEmail = extracted.contactEmail
    if (extracted.contactPhone) updated.contactPhone = extracted.contactPhone
    if (extracted.postalCode) {
        // Strict UK Postcode Regex (Example: SL4 1AA)
        const strictUkPattern = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i
        const isStrict = strictUkPattern.test(extracted.postalCode)

        // Context-Aware Sieve:
        // Only accept "loose" postcodes (like "3525" or "15 k" false positives)
        // IF we are EXPLICITLY asking for the postcode.
        if (isStrict || currentField === 'postalCode') {
            updated.postalCode = extracted.postalCode
        }
    }

    if (extracted.projectStartTiming) updated.projectStartTiming = extracted.projectStartTiming
    if (extracted.groundSoilType) updated.groundSoilType = extracted.groundSoilType
    if (extracted.additionalNotes) {
        updated.additionalNotes = updated.additionalNotes
            ? updated.additionalNotes + '\n' + extracted.additionalNotes
            : extracted.additionalNotes
    }

    if (updated.length_m && updated.width_m && !updated.area_m2) {
        updated.area_m2 = updated.length_m * updated.width_m
    }

    updated.certaintyLevel = calculateCertainty(updated)
    return updated
}

// ============================================================================
// RETRY TRACKING HELPERS
// ============================================================================

export function detectCurrentField(state: ConversationState): string {
    if (!state.service) return 'service'
    if (!state.area_m2 && !state.length_m && !state.width_m) return 'dimensions'
    if (!state.materialTier) return 'materialTier'

    const excavationServices = ['hardscaping', 'decking', 'fencing', 'framing']
    if (state.hasExcavatorAccess === null && state.service && excavationServices.includes(state.service)) {
        return 'excavatorAccess'
    }

    if (state.service === 'decking' && state.deckHeight_m === null) return 'deckHeight'
    if (state.service === 'mowing' && state.overgrown === null) return 'overgrown'
    if (state.service === 'fencing' && state.gateCount === null) return 'gateCount'

    const heavyWorkServices = ['hardscaping', 'decking', 'fencing', 'framing', 'softscaping']
    if (state.hasDrivewayForSkip === null && state.service && heavyWorkServices.includes(state.service)) {
        return 'driveway'
    }
    if (state.slopeLevel === null && state.service && heavyWorkServices.includes(state.service)) {
        return 'slope'
    }

    if (state.existingDemolition === null && (state.service === 'hardscaping' || state.service === 'decking')) {
        return 'demolition'
    }

    if (!state.fullName || !state.contactPhone || !state.contactEmail) return 'contactDetails'
    if (state.userBudget === null) return 'userBudget'
    if (!state.projectStartTiming) return 'projectStartTiming'
    if (!state.postalCode) return 'postalCode'

    return 'unknown'
}

export function hasExtractedInfo(extracted: ExtractedInfo): boolean {
    return Object.keys(extracted).length > 0
}

export function isRelevantFieldExtracted(
    currentField: string,
    extracted: ExtractedInfo,
    oldState: ConversationState,
    newState: ConversationState
): boolean {
    switch (currentField) {
        case 'service': return newState.service !== null && oldState.service === null
        case 'dimensions': return (newState.area_m2 !== null && oldState.area_m2 === null) || (newState.length_m !== null && oldState.length_m === null)
        case 'materialTier': return newState.materialTier !== null && oldState.materialTier === null
        case 'excavatorAccess': return newState.hasExcavatorAccess !== null && oldState.hasExcavatorAccess === null
        case 'driveway': return newState.hasDrivewayForSkip !== null && oldState.hasDrivewayForSkip === null
        case 'slope': return newState.slopeLevel !== null && oldState.slopeLevel === null
        case 'demolition': return newState.existingDemolition !== null && oldState.existingDemolition === null
        case 'deckHeight': return newState.deckHeight_m !== null && oldState.deckHeight_m === null
        case 'overgrown': return newState.overgrown !== null && oldState.overgrown === null
        case 'gateCount': return newState.gateCount !== null && oldState.gateCount === null
        case 'fullName': return newState.fullName !== null && oldState.fullName === null
        case 'contactPhone': return newState.contactPhone !== null && oldState.contactPhone === null
        case 'contactEmail': return newState.contactEmail !== null && oldState.contactEmail === null
        case 'contactDetails': {
            const anyNew = (newState.fullName !== null && oldState.fullName === null) ||
                (newState.contactPhone !== null && oldState.contactPhone === null) ||
                (newState.contactEmail !== null && oldState.contactEmail === null)
            return anyNew
        }
        case 'userBudget': return newState.userBudget !== null && oldState.userBudget === null
        case 'projectStartTiming': return !!newState.projectStartTiming && !oldState.projectStartTiming
        case 'postalCode': return newState.postalCode !== null && oldState.postalCode === null
        default: return hasExtractedInfo(extracted)
    }
}

export function incrementRetryCount(state: ConversationState, field: string): ConversationState {
    const currentCount = state.retryCount[field] || 0
    return {
        ...state,
        retryCount: { ...state.retryCount, [field]: currentCount + 1 },
        lastQuestionField: field,
        showQuickReplies: currentCount >= 1
    }
}

export function resetRetryCount(state: ConversationState): ConversationState {
    return {
        ...state,
        retryCount: {},
        showQuickReplies: false,
        lastQuestionField: null
    }
}

// ============================================================================
// READY FOR ESTIMATE
// ============================================================================

export function isReadyForEstimate(state: ConversationState): boolean {
    // 1. BASICS: Must have Budget and Postcode
    if (state.userBudget === null || state.postalCode === null) return false

    // 2. CRITICAL MISSING INFO CHECKS (Prevent skipping important cost factors)
    const heavyAccessServices = ['hardscaping', 'decking', 'fencing', 'framing']
    const groundServices = ['hardscaping', 'decking', 'softscaping', 'framing']

    // Excavator Access is critical for pricing labor
    if (state.hasExcavatorAccess === null && state.service && heavyAccessServices.includes(state.service)) {
        return false
    }

    // Slope is critical for pricing groundworks
    if (state.slopeLevel === null && state.service && groundServices.includes(state.service)) {
        return false
    }

    // Gates for fencing
    if (state.service === 'fencing' && state.gateCount === null) return false

    // Deck height
    if (state.service === 'decking' && state.deckHeight_m === null) return false

    // 3. CERTAINTY CHECK
    // If we have all the above, we are pretty good. 
    // But still check the score just in case (e.g. Dimensions missing?)
    return state.certaintyLevel >= 85
}
