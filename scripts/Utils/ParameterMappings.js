/**
 * ParameterMappings - Central definition of which parameter index holds what data
 * for each event type. Update THIS file when the server changes parameter indices.
 * 
 * All handlers should read from these mappings instead of using magic numbers.
 * 
 * Format: EventName → { fieldName: parameterIndex }
 */

export const ParameterMappings = {

    // ─── NewCharacter (event 29) ───────────────────────────────────
    NewCharacter: {
        id: 0,
        nickname: 1,
        guildName: 8,
        posX: 19,
        posY: 20,
        currentHealth: 22,
        initialHealth: 23,
        items: 40,
        alliance: 49,
        flagId: 51,
    },

    // ─── NewMob (event 123) ────────────────────────────────────────
    NewMob: {
        id: 0,
        typeId: 1,
        position: 7,         // Array: [posX, posY]
        exp: 13,
        rarity: 19,
        name: 32,
        nameFallback: 31,    // Fallback if [32] is undefined
        enchant: 33,
    },

    // ─── Move (event 3) ────────────────────────────────────────────
    Move: {
        id: 0,
        posX: 4,
        posY: 5,
    },

    // ─── HealthUpdate (event 6) ────────────────────────────────────
    HealthUpdate: {
        id: 0,
        currentHealth: 2,
        initialHealth: 3,
    },

    // ─── CharacterEquipmentChanged (event 90) ──────────────────────
    CharacterEquipmentChanged: {
        id: 0,
        items: 2,
    },

    // ─── Mounted (event 209) ───────────────────────────────────────
    Mounted: {
        id: 0,
        param10: 10,
        mounted: 11,
    },

    // ─── NewCagedObject (was NewMistsCagedWisp, event 528) ─────────
    NewCagedObject: {
        id: 0,
        position: 1,         // Array: [posX, posY]
        name: 2,
        openedCheck: 4,      // If != undefined, cage is already opened
    },

    // ─── CagedObjectStateUpdated (was MistsWispCageOpened, event 529)
    CagedObjectStateUpdated: {
        id: 0,
    },

    // ─── NewLootChest (event 389) ──────────────────────────────────
    NewLootChest: {
        id: 0,
        position: 1,         // Array: [posX, posY]
        name: 3,
        mistName: 4,         // Used when name contains "mist"
    },

    // ─── NewRandomDungeonExit (event 321) ──────────────────────────
    NewRandomDungeonExit: {
        id: 0,
        position: 1,         // Array: [posX, posY]
        name: 3,
        enchant: 6,
    },

    // ─── NewHarvestableObject (event 40) ───────────────────────────
    NewHarvestableObject: {
        id: 0,               // Note: passed separately as first arg
        type: 5,
        tier: 7,
        position: 8,         // Array: [posX, posY]
        size: 10,
        enchant: 11,
    },

    // ─── NewSimpleHarvestableObjectList (event 39) ─────────────────
    NewSimpleHarvestableObjectList: {
        ids: 0,              // Array of IDs
        types: 1,            // { data: [...] }
        tiers: 2,            // { data: [...] }
        positions: 3,        // Flat array: [x0, y0, x1, y1, ...]
        counts: 4,           // { data: [...] }
    },

    // ─── HarvestableChangeState (event 46) ─────────────────────────
    HarvestableChangeState: {
        id: 0,
        size: 1,             // undefined = depleted
    },

    // ─── HarvestFinished (event 61) ────────────────────────────────
    HarvestFinished: {
        id: 3,
        count: 5,
    },

    // ─── MobChangeState (event 47) ─────────────────────────────────
    MobChangeState: {
        id: 0,
        enchantmentLevel: 1,
    },

    // ─── NewFishingZoneObject (event 357) ──────────────────────────
    NewFishingZoneObject: {
        id: 0,
        position: 1,         // Array: [posX, posY]
        sizeSpawned: 2,
        sizeLeftToSpawn: 3,
        type: 4,
    },

    // ─── NewHuntTrack (event 554) ──────────────────────────────────
    NewHuntTrack: {
        id: 0,
        position: 1,         // Array: [posX, posY]
        name: 3,
    },

    // ─── Request: Player Move (opCode 21) ──────────────────────────
    RequestMove: {
        opCode: 253,
        position: 1,         // Array: [posX, posY]
    },

    // ─── Response: Join Map (opCode 35) ────────────────────────────
    ResponseJoinMap: {
        opCode: 253,
        mapId: 0,
    },

    // ─── Response: Player Join (opCode 2) ──────────────────────────
    ResponsePlayerJoin: {
        opCode: 253,
        position: 9,         // Array: [posX, posY]
    },
};

/**
 * Safe parameter accessor with fallback. Use this instead of direct Parameters[N].
 * 
 * @param {object} Parameters - Raw parameter dictionary from the packet
 * @param {number} index - Parameter index to read
 * @param {*} defaultValue - Value to return if parameter is undefined/null
 * @param {string} context - Optional context string for warning logs
 * @returns {*} The parameter value, or defaultValue if missing
 */
export function getParam(Parameters, index, defaultValue = undefined, context = '') {
    try {
        const value = Parameters[index];
        if (value === undefined || value === null) {
            if (context && defaultValue === undefined) {
                console.warn(`[ParameterMappings] Missing param [${index}] in ${context}`);
            }
            return defaultValue;
        }
        return value;
    } catch (e) {
        if (context) {
            console.warn(`[ParameterMappings] Error reading param [${index}] in ${context}: ${e.message}`);
        }
        return defaultValue;
    }
}

/**
 * Safe array position extractor.
 * 
 * @param {object} Parameters - Raw parameter dictionary
 * @param {number} index - Parameter index containing position array
 * @param {string} context - Optional context for warnings
 * @returns {{ posX: number, posY: number } | null}
 */
export function getPosition(Parameters, index, context = '') {
    const arr = getParam(Parameters, index, null, context);
    if (!arr || !Array.isArray(arr) || arr.length < 2) {
        if (context) {
            console.warn(`[ParameterMappings] Invalid position at param [${index}] in ${context}`);
        }
        return null;
    }
    return { posX: arr[0], posY: arr[1] };
}
