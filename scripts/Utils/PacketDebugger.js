/**
 * PacketDebugger - Toggleable debug logger for raw Albion Online Photon events
 * 
 * Usage:
 *   import { PacketDebugger } from './PacketDebugger.js';
 *   const debugger = new PacketDebugger();
 *   
 *   // In your event handler:
 *   debugger.logEvent(eventCode, Parameters);
 *   debugger.logRequest(Parameters);
 *   debugger.logResponse(Parameters);
 *   
 * Toggle via browser console:
 *   window.packetDebugger.enable()
 *   window.packetDebugger.disable()
 *   window.packetDebugger.setFilter([29, 123])  // Only log NewCharacter, NewMob
 *   window.packetDebugger.clearFilter()
 *   window.packetDebugger.setVerbose(true)       // Log full parameter dumps
 */

import { EventCodes } from './EventCodes.js';

// Build reverse lookup: code number → event name
const EventCodeNames = {};
for (const [name, code] of Object.entries(EventCodes)) {
    EventCodeNames[code] = name;
}

export class PacketDebugger {
    constructor() {
        this.enabled = false;
        this.verbose = false;
        this.filterCodes = null; // null = log all, Set = only log these codes
        this.logHistory = [];
        this._verboseHistory = [];
        this.maxHistory = 500;
        this.logRequests = false;
        this.logResponses = false;
        this.logEvents = true;

        // Expose to browser console for easy toggling
        if (typeof window !== 'undefined') {
            window.packetDebugger = this;
        }
    }

    enable() {
        this.enabled = true;
        console.log('%c[PacketDebugger] ENABLED', 'color: #00ff88; font-weight: bold;');
    }

    disable() {
        this.enabled = false;
        console.log('%c[PacketDebugger] DISABLED', 'color: #ff4444; font-weight: bold;');
    }

    setVerbose(v) {
        this.verbose = !!v;
        console.log(`%c[PacketDebugger] Verbose: ${this.verbose}`, 'color: #88aaff;');
    }

    /** Filter to only log specific event codes. Pass an array of code numbers. */
    setFilter(codes) {
        this.filterCodes = new Set(codes);
        const names = codes.map(c => EventCodeNames[c] || `Unknown(${c})`);
        console.log(`%c[PacketDebugger] Filter set: ${names.join(', ')}`, 'color: #ffaa44;');
    }

    clearFilter() {
        this.filterCodes = null;
        console.log('%c[PacketDebugger] Filter cleared (logging all events)', 'color: #ffaa44;');
    }

    enableRequests() { this.logRequests = true; }
    enableResponses() { this.logResponses = true; }
    disableRequests() { this.logRequests = false; }
    disableResponses() { this.logResponses = false; }

    /** Log an event packet */
    logEvent(eventCode, Parameters) {
        if (!this.enabled || !this.logEvents) return;
        if (this.filterCodes && !this.filterCodes.has(eventCode)) return;

        const eventName = EventCodeNames[eventCode] || `Unknown`;
        const timestamp = new Date().toISOString().slice(11, 23);
        const entityId = Parameters[0];

        const entry = {
            type: 'EVENT',
            time: timestamp,
            code: eventCode,
            name: eventName,
            entityId,
            paramKeys: Object.keys(Parameters).filter(k => Parameters[k] !== undefined),
        };

        // Styled console output
        console.groupCollapsed(
            `%c[${timestamp}] EVENT %c${eventCode} %c${eventName} %c(entity: ${entityId})`,
            'color: #888;',
            'color: #ff6600; font-weight: bold;',
            'color: #00ccff; font-weight: bold;',
            'color: #aaa;'
        );
        console.log('Parameter keys:', entry.paramKeys.join(', '));
        
        if (this.verbose) {
            console.log('Full Parameters:');
            for (const key of entry.paramKeys) {
                const val = Parameters[key];
                const valStr = Array.isArray(val) 
                    ? `[${val.slice(0, 10).join(', ')}${val.length > 10 ? '...' : ''}]`
                    : typeof val === 'object' ? JSON.stringify(val).slice(0, 200) : String(val);
                console.log(`  [${key}] = ${valStr}`);
            }
        }
        console.groupEnd();

        this._addHistory(entry);

        // Store verbose copy if verbose mode is on
        if (this.verbose) {
            try {
                const verboseEntry = { ...entry, params: JSON.parse(JSON.stringify(Parameters)) };
                this._verboseHistory.push(verboseEntry);
                if (this._verboseHistory.length > this.maxHistory) {
                    this._verboseHistory.shift();
                }
            } catch (e) { /* ignore circular refs */ }
        }
    }

    /** Log a request packet */
    logRequest(Parameters) {
        if (!this.enabled || !this.logRequests) return;

        const opCode = Parameters[253];
        const timestamp = new Date().toISOString().slice(11, 23);

        console.log(
            `%c[${timestamp}] REQUEST %copCode: ${opCode}`,
            'color: #888;',
            'color: #44ff44; font-weight: bold;'
        );

        if (this.verbose) {
            console.log('Parameters:', Parameters);
        }
    }

    /** Log a response packet */
    logResponse(Parameters) {
        if (!this.enabled || !this.logResponses) return;

        const opCode = Parameters[253];
        const timestamp = new Date().toISOString().slice(11, 23);

        console.log(
            `%c[${timestamp}] RESPONSE %copCode: ${opCode}`,
            'color: #888;',
            'color: #ff44ff; font-weight: bold;'
        );

        if (this.verbose) {
            console.log('Parameters:', Parameters);
        }
    }

    /** Get logged history */
    getHistory() {
        return [...this.logHistory];
    }

    /** Dump all parameter keys seen for a given event code */
    dumpParamKeysForEvent(eventCode) {
        const events = this.logHistory.filter(e => e.code === eventCode);
        if (events.length === 0) {
            console.log(`No logged events found for code ${eventCode}`);
            return;
        }
        const allKeys = new Set();
        events.forEach(e => e.paramKeys.forEach(k => allKeys.add(k)));
        const name = EventCodeNames[eventCode] || 'Unknown';
        console.log(`%cParameter keys seen for ${name} (${eventCode}): ${[...allKeys].sort((a,b) => a-b).join(', ')}`, 'color: #ffcc00;');
        return [...allKeys].sort((a, b) => a - b);
    }

    /** Clear history */
    clearHistory() {
        this.logHistory = [];
        console.log('%c[PacketDebugger] History cleared', 'color: #888;');
    }

    /** Export captured history as a downloadable JSON file */
    exportToFile(filename) {
        const name = filename || `packet_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const data = JSON.stringify(this.logHistory, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`%c[PacketDebugger] Exported ${this.logHistory.length} entries → ${name}`, 'color: #00ff88;');
    }

    /** Export full verbose dump — saves raw Parameters too (larger file) */
    exportVerbose(filename) {
        const name = filename || `packet_verbose_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const data = JSON.stringify(this._verboseHistory, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`%c[PacketDebugger] Exported ${this._verboseHistory.length} verbose entries → ${name}`, 'color: #00ff88;');
    }

    /** Start auto-exporting every N seconds (saves download each interval) */
    startAutoExport(intervalSeconds = 60) {
        this.stopAutoExport();
        this._autoExportInterval = setInterval(() => {
            if (this.logHistory.length > 0) {
                this.exportToFile();
                this.clearHistory();
            }
        }, intervalSeconds * 1000);
        console.log(`%c[PacketDebugger] Auto-export every ${intervalSeconds}s`, 'color: #ffaa44;');
    }

    stopAutoExport() {
        if (this._autoExportInterval) {
            clearInterval(this._autoExportInterval);
            this._autoExportInterval = null;
            console.log('%c[PacketDebugger] Auto-export stopped', 'color: #ffaa44;');
        }
    }

    /** Print help to console */
    help() {
        console.log(`%c
╔══════════════════════════════════════════════════╗
║            PacketDebugger Commands               ║
╠══════════════════════════════════════════════════╣
║ packetDebugger.enable()                          ║
║ packetDebugger.disable()                         ║
║ packetDebugger.setVerbose(true/false)             ║
║ packetDebugger.setFilter([29, 123])              ║
║ packetDebugger.clearFilter()                     ║
║ packetDebugger.enableRequests()                  ║
║ packetDebugger.enableResponses()                 ║
║ packetDebugger.getHistory()                      ║
║ packetDebugger.dumpParamKeysForEvent(29)         ║
║ packetDebugger.clearHistory()                    ║
║ packetDebugger.exportToFile()                    ║
║ packetDebugger.exportVerbose()                   ║
║ packetDebugger.startAutoExport(60)               ║
║ packetDebugger.stopAutoExport()                  ║
╚══════════════════════════════════════════════════╝
        `, 'color: #00ccff; font-family: monospace;');
    }

    _addHistory(entry) {
        this.logHistory.push(entry);
        if (this.logHistory.length > this.maxHistory) {
            this.logHistory.shift();
        }
    }
}
