/**
 * Quick Reply Suggestions
 * 
 * Provides clickable options for common questions to make
 * the conversation faster and easier.
 */

import type { ConversationState } from './conversationManager'
import type { ServiceType } from './qouter'

export interface QuickReply {
    text: string
    value: string
}

export const WRITE_IT_OUT = '__write_it_out__'

function withWriteItOut(replies: QuickReply[]): QuickReply[] {
    return [...replies, { text: "I'll write it out", value: WRITE_IT_OUT }]
}

export function getQuickReplies(state: ConversationState): QuickReply[] {
    // Service question (first question)
    if (!state.service) {
        return withWriteItOut([
            { text: '🚗 Driveway Paving', value: 'driveway paving' },
            { text: '🧱 Block Paving', value: 'block paving' },
            { text: '🏗️ Patio / Paving', value: 'patio' },
            { text: '🏡 Full Garden Makeover', value: 'full garden makeover landscaping' },
            { text: '🪵 Decking', value: 'decking' },
            { text: '🌿 Lawn Mowing', value: 'lawn mowing' },
            { text: '🌱 Landscaping', value: 'landscaping' },
            { text: '🪴 Planting', value: 'planting' },
            { text: '🚧 Fencing', value: 'fencing' },
            { text: '🏛️ Pergola / Structure', value: 'pergola' }
        ])
    }

    // Dimensions question — no preset buttons, just write it out
    if (!state.area_m2 && !state.length_m && !state.width_m) {
        return withWriteItOut([
            { text: 'Small (< 20m²)', value: '15 square meters' },
            { text: 'Medium (20–50m²)', value: '35 square meters' },
            { text: 'Large (50–100m²)', value: '75 square meters' },
            { text: 'Very large (> 100m²)', value: '120 square meters' }
        ])
    }

    // Material tier questions
    if (state.service && !state.materialTier) {
        const tierReplies: Record<ServiceType, QuickReply[]> = {
            hardscaping: [
                { text: 'Concrete (Essential)', value: 'basic concrete pavers' },
                { text: 'Sandstone (Premium)', value: 'indian sandstone' },
                { text: 'Porcelain (Luxury)', value: 'porcelain paving' }
            ],
            decking: [
                { text: 'Softwood (Essential)', value: 'treated softwood' },
                { text: 'Composite (Premium)', value: 'composite decking' },
                { text: 'Hardwood (Luxury)', value: 'ipe hardwood' }
            ],
            mowing: [
                { text: 'Basic Cut (Essential)', value: 'basic cut and collect' },
                { text: 'Precision (Premium)', value: 'precision cut with edging' },
                { text: 'Full (Luxury)', value: 'full grounds maintenance' }
            ],
            planting: [
                { text: 'Container (Essential)', value: 'container plants' },
                { text: 'Specimens (Premium)', value: 'specimen plants' },
                { text: 'Architectural (Luxury)', value: 'architectural planting' }
            ],
            fencing: [
                { text: 'Softwood (Essential)', value: 'softwood panels' },
                { text: 'Slats (Premium)', value: 'treated slats' },
                { text: 'Cedar (Luxury)', value: 'premium cedar' }
            ],
            framing: [
                { text: 'Basic (Essential)', value: 'basic pergola frame' },
                { text: 'Engineered (Premium)', value: 'engineered timber' },
                { text: 'Custom (Luxury)', value: 'custom hardwood' }
            ],
            softscaping: [
                { text: 'Basic (Essential)', value: 'basic landscaping' },
                { text: 'Premium (Premium)', value: 'premium planting' },
                { text: 'Luxury (Luxury)', value: 'full architectural design' }
            ]
        }
        return withWriteItOut(tierReplies[state.service])
    }

    // Excavator access (yes/no)
    if (state.hasExcavatorAccess === null && state.service && state.service !== 'mowing') {
        return withWriteItOut([
            { text: 'Yes, it fits', value: 'yes it fits' },
            { text: 'No, narrow access', value: 'narrow access' }
        ])
    }

    // Driveway (yes/no)
    if (state.hasDrivewayForSkip === null && state.service && state.service !== 'mowing') {
        return withWriteItOut([
            { text: 'Yes, have driveway', value: 'yes driveway' },
            { text: 'No, on street', value: 'on the street' }
        ])
    }

    // Slope level
    if (state.slopeLevel === null && state.service && state.service !== 'mowing') {
        return withWriteItOut([
            { text: 'Flat', value: 'flat' },
            { text: 'Moderate slope', value: 'moderate slope' },
            { text: 'Steep', value: 'steep slope' }
        ])
    }

    // Demolition (yes/no)
    if (state.existingDemolition === null && state.service &&
        (state.service === 'hardscaping' || state.service === 'decking')) {
        return withWriteItOut([
            { text: 'Yes, removal needed', value: 'yes removal needed' },
            { text: 'No, fresh site', value: 'no nothing to remove' }
        ])
    }

    // Fencing gates
    if (state.service === 'fencing' && state.gateCount === null) {
        return withWriteItOut([
            { text: 'No gates', value: 'no gates' },
            { text: '1 gate', value: 'one gate' },
            { text: '2 gates', value: 'two gates' }
        ])
    }

    // Mowing overgrowth
    if (state.service === 'mowing' && state.overgrown === null) {
        return withWriteItOut([
            { text: 'Recent (< 2 weeks)', value: 'last week' },
            { text: 'Overgrown (> 2 weeks)', value: '3 weeks ago' }
        ])
    }

    // Budget (user info section)
    if (state.userBudget === null && state.contactEmail) {
        return withWriteItOut([
            { text: 'Less than £5,000', value: '£4000' },
            { text: '£5,000 – £10,000', value: '£7500' },
            { text: '£10,000 – £20,000', value: '£15000' },
            { text: 'More than £20,000', value: '£25000' },
            { text: 'Not sure yet', value: '£0' }
        ])
    }

    // Project start timing (after budget)
    if (state.userBudget !== null && !state.projectStartTiming) {
        return withWriteItOut([
            { text: 'As soon as possible', value: 'As soon as possible' },
            { text: 'Within the next 3 months', value: 'Within the next 3 months' },
            { text: 'Just planning ahead', value: 'Just planning ahead' },
            { text: 'Not sure yet', value: 'Not sure yet' }
        ])
    }

    return []
}

/**
 * Get fallback quick replies when the bot doesn't understand the user's response
 * This provides clickable options after a failed extraction attempt
 */
export function getFallbackQuickReplies(field: string, state: ConversationState): QuickReply[] {
    switch (field) {
        case 'service':
            return [
                { text: '🏗️ Patio/Paving', value: 'patio' },
                { text: '🪵 Decking', value: 'decking' },
                { text: '🌿 Lawn Mowing', value: 'lawn mowing' },
                { text: '🌱 Landscaping', value: 'landscaping' },
                { text: '🪴 Planting', value: 'planting' },
                { text: '🚧 Fencing', value: 'fencing' },
                { text: '🏛️ Pergola/Structure', value: 'pergola' }
            ]

        case 'dimensions':
            return [
                { text: 'Small (<20m²)', value: '15 square meters' },
                { text: 'Medium (20-50m²)', value: '35 square meters' },
                { text: 'Large (50-100m²)', value: '75 square meters' },
                { text: 'Very Large (>100m²)', value: '120 square meters' },
                { text: 'I\'ll type exact size', value: 'let me type it' }
            ]

        case 'materialTier':
            if (state.service === 'hardscaping') {
                return [
                    { text: 'Concrete (Essential)', value: 'basic concrete pavers' },
                    { text: 'Sandstone (Premium)', value: 'indian sandstone' },
                    { text: 'Porcelain (Luxury)', value: 'porcelain paving' }
                ]
            } else if (state.service === 'decking') {
                return [
                    { text: 'Softwood (Essential)', value: 'treated softwood' },
                    { text: 'Composite (Premium)', value: 'composite decking' },
                    { text: 'Hardwood (Luxury)', value: 'ipe hardwood' }
                ]
            } else {
                return [
                    { text: 'Essential', value: 'essential option' },
                    { text: 'Premium', value: 'premium quality' },
                    { text: 'Luxury', value: 'luxury ' }
                ]
            }

        case 'excavatorAccess':
            return [
                { text: 'Yes, wide access', value: 'yes wide access' },
                { text: 'No, narrow gate', value: 'narrow gate' }
            ]

        case 'driveway':
            return [
                { text: 'Yes, have driveway', value: 'yes driveway' },
                { text: 'No, street parking', value: 'on street' }
            ]

        case 'slope':
            return [
                { text: 'Flat', value: 'flat ground' },
                { text: 'Moderate slope', value: 'moderate slope' },
                { text: 'Steep', value: 'steep slope' }
            ]

        case 'demolition':
            return [
                { text: 'Yes, need removal', value: 'yes need to remove existing' },
                { text: 'No, fresh site', value: 'no nothing there' }
            ]

        case 'deckHeight':
            return [
                { text: 'Ground level', value: '0.3 meters high' },
                { text: 'Low (0.5-1m)', value: '0.8 meters high' },
                { text: 'Medium (1-1.5m)', value: '1.2 meters high' },
                { text: 'High (>1.5m)', value: '2 meters high' }
            ]

        case 'overgrown':
            return [
                { text: 'Recent (<2 weeks)', value: 'last week' },
                { text: 'Overgrown (>2 weeks)', value: '3 weeks ago' }
            ]

        case 'gateCount':
            return [
                { text: 'No gates', value: 'no gates' },
                { text: '1 gate', value: 'one gate' },
                { text: '2 gates', value: 'two gates' },
                { text: '3+ gates', value: 'three gates' }
            ]

        case 'budgetAlignment':
            return [
                { text: '✅ Yes, that works for me', value: 'yes that works' },
                { text: '💭 Need to discuss scope', value: 'too expensive need to discuss' }
            ]

        case 'fullName':
            return [
                { text: 'My name is John Smith', value: 'John Smith' },
                { text: 'Skip for now', value: 'Guest User' }
            ]

        case 'contactPhone':
            return [
                { text: '07700 900000', value: '07700900000' },
                // Use a dummy number that passes the "7+ digits" check
                { text: 'Skip for now', value: '0000000000' }
            ]

        case 'contactEmail':
            return [
                { text: 'user@example.com', value: 'user@example.com' },
                { text: 'Skip for now', value: 'guest@example.com' }
            ]

        case 'userBudget':
            return [
                { text: 'Less than £5,000', value: '£4000' },
                { text: '£5,000 – £10,000', value: '£7500' },
                { text: '£10,000 – £20,000', value: '£15000' },
                { text: 'More than £20,000', value: '£25000' },
                { text: 'Not sure yet', value: '£0' },
                { text: "I'll write it out", value: WRITE_IT_OUT }
            ]

        case 'projectStartTiming':
            return [
                { text: 'As soon as possible', value: 'As soon as possible' },
                { text: 'Within the next 3 months', value: 'Within the next 3 months' },
                { text: 'Just planning ahead', value: 'Just planning ahead' },
                { text: 'Not sure yet', value: 'Not sure yet' }
            ]

        default:
            return []
    }
}
