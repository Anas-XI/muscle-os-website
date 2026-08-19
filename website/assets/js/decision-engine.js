// CSP-safe trigger evaluator: replaces `new Function` (blocked by 'unsafe-eval'-less CSP).
// Supports the decision-rules trigger DSL: booleans, numbers, strings, arrays,
// p.<field>[.field] access, .toLowerCase(), .includes(), typeof, comparisons,
// && || !, arithmetic (* / + -), and ** (power). Never evaluates arbitrary code.
function safeEvalTrigger(expr, profile) {
    const src = String(expr);
    let pos = 0;
    const tokens = [];
    const TOK = { NUM: 1, STR: 2, ID: 3, OP: 4, LP: 5, RP: 6, LB: 7, RB: 8, DOT: 9, COMMA: 10 };
    while (pos < src.length) {
        const c = src[pos];
        if (/\s/.test(c)) { pos++; continue; }
        if (c === "'" || c === '"') {
            const q = c; pos++;
            let out = '';
            while (pos < src.length && src[pos] !== q) {
                if (src[pos] === '\\' && pos + 1 < src.length) { out += src[pos + 1]; pos += 2; }
                else { out += src[pos]; pos++; }
            }
            pos++;
            tokens.push({ t: TOK.STR, v: out }); continue;
        }
        if (/[0-9]/.test(c)) {
            let out = c; pos++;
            while (pos < src.length && /[0-9.]/.test(src[pos])) { out += src[pos]; pos++; }
            tokens.push({ t: TOK.NUM, v: parseFloat(out) }); continue;
        }
        if (/[A-Za-z_]/.test(c)) {
            let out = c; pos++;
            while (pos < src.length && /[A-Za-z0-9_]/.test(src[pos])) { out += src[pos]; pos++; }
            tokens.push({ t: TOK.ID, v: out }); continue;
        }
        const three = src.substr(pos, 3);
        if (three === '===' || three === '!==') {
            tokens.push({ t: TOK.OP, v: three }); pos += 3; continue;
        }
        const two = src.substr(pos, 2);
        if (two === '&&' || two === '||' || two === '===' || two === '!==' || two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '**') {
            tokens.push({ t: TOK.OP, v: two }); pos += 2; continue;
        }
        if ('<>=+-*/!'.indexOf(c) >= 0) { tokens.push({ t: TOK.OP, v: c }); pos++; continue; }
        if (c === '(') { tokens.push({ t: TOK.LP }); pos++; continue; }
        if (c === ')') { tokens.push({ t: TOK.RP }); pos++; continue; }
        if (c === '[') { tokens.push({ t: TOK.LB }); pos++; continue; }
        if (c === ']') { tokens.push({ t: TOK.RB }); pos++; continue; }
        if (c === '.') { tokens.push({ t: TOK.DOT }); pos++; continue; }
        if (c === ',') { tokens.push({ t: TOK.COMMA }); pos++; continue; }
        return false;
    }

    let idx = 0;
    const peek = () => tokens[idx];
    const next = () => tokens[idx++];
    const isOp = (v) => peek() && peek().t === TOK.OP && peek().v === v;
    const expectOp = (v) => { if (!isOp(v)) throw new Error('expected ' + v); idx++; };

    function parseExpr() { return parseOr(); }
    function parseOr() {
        let v = parseAnd();
        while (isOp('||')) { idx++; const r = parseAnd(); v = !!(v || r); }
        return v;
    }
    function parseAnd() {
        let v = parseCompare();
        while (isOp('&&')) { idx++; const r = parseCompare(); v = !!(v && r); }
        return v;
    }
    function parseCompare() {
        let v = parseAdd();
        for (;;) {
            const t = peek();
            if (!t || t.t !== TOK.OP) break;
            const op = t.v;
            if (op !== '===' && op !== '!==' && op !== '==' && op !== '!=' && op !== '<' && op !== '<=' && op !== '>' && op !== '>=') break;
            idx++;
            const r = parseAdd();
            if (op === '===' || op === '==') v = v === r;
            else if (op === '!==' || op === '!=') v = v !== r;
            else if (op === '<') v = v < r;
            else if (op === '<=') v = v <= r;
            else if (op === '>') v = v > r;
            else v = v >= r;
        }
        return v;
    }
    function parseAdd() {
        let v = parseMul();
        for (;;) {
            if (isOp('+')) { idx++; v = v + parseMul(); }
            else if (isOp('-')) { idx++; v = v - parseMul(); }
            else break;
        }
        return v;
    }
    function parseMul() {
        let v = parsePow();
        for (;;) {
            if (isOp('*')) { idx++; v = v * parsePow(); }
            else if (isOp('/')) { idx++; v = v / parsePow(); }
            else break;
        }
        return v;
    }
    function parsePow() {
        const v = parseUnary();
        if (isOp('**')) { idx++; return Math.pow(v, parsePow()); }
        return v;
    }
    function parseUnary() {
        if (isOp('!')) { idx++; return !parseUnary(); }
        const t = peek();
        if (t && t.t === TOK.ID && t.v === 'typeof') {
            idx++;
            const v = parseUnary();
            return typeof v;
        }
        return parsePostfix();
    }
    function parsePostfix() {
        let v = parsePrimary();
        for (;;) {
            const t = peek();
            if (!t || t.t !== TOK.DOT) break;
            idx++;
            const name = next();
            if (!name || name.t !== TOK.ID) throw new Error('expected member name');
            if (peek() && peek().t === TOK.LP) {
                idx++;
                const args = [];
                if (peek() && peek().t !== TOK.RP) {
                    args.push(parseExpr());
                    while (peek() && peek().t === TOK.COMMA) { idx++; args.push(parseExpr()); }
                }
                if (!peek() || peek().t !== TOK.RP) throw new Error('expected )');
                idx++;
                if (typeof v[name.v] !== 'function') throw new Error('not callable: ' + name.v);
                v = v[name.v](...args);
            } else {
                v = v[name.v];
            }
        }
        return v;
    }
    function parsePrimary() {
        const t = next();
        if (!t) throw new Error('unexpected end');
        if (t.t === TOK.NUM) return t.v;
        if (t.t === TOK.STR) return t.v;
        if (t.t === TOK.LP) { const v = parseExpr(); if (!peek() || peek().t !== TOK.RP) throw new Error('expected )'); idx++; return v; }
        if (t.t === TOK.LB) {
            const arr = [];
            if (peek() && peek().t !== TOK.RB) {
                arr.push(parseExpr());
                while (peek() && peek().t === TOK.COMMA) { idx++; arr.push(parseExpr()); }
            }
            if (!peek() || peek().t !== TOK.RB) throw new Error('expected ]');
            idx++;
            return arr;
        }
        if (t.t === TOK.ID) {
            if (t.v === 'true') return true;
            if (t.v === 'false') return false;
            if (t.v === 'p') {
                const dot = next();
                if (!dot || dot.t !== TOK.DOT) throw new Error('expected . after p');
                const name = next();
                if (!name || name.t !== TOK.ID) throw new Error('expected profile field');
                return profile[name.v];
            }
            throw new Error('unknown identifier: ' + t.v);
        }
        throw new Error('unexpected token');
    }

    try {
        const v = parseExpr();
        return !!v;
    } catch (e) {
        console.warn('Rule trigger parse error:', e.message, 'expr:', src);
        return false;
    }
}

const DecisionEngine = {
    rules: [],
    vault: null,
    isLoaded: false,
    _initPromise: null,

    async init(basePath) {
        if (this.isLoaded) return;
        if (this._initPromise) return this._initPromise;
        const root = basePath || this._resolveBasePath();
        this._initPromise = (async () => {
            try {
                const rulesRes = await fetch(`${root}/decision_rules.json`);
                if (!rulesRes.ok) throw new Error('rules fetch ' + rulesRes.status);
                this.rules = await rulesRes.json();
                this.isLoaded = true;
            } catch (e) {
                this._initPromise = null;
                console.error('Failed to load Decision Engine rules', e);
            }
        })();
        return this._initPromise;
    },

    _resolveBasePath() {
        if (window.MOS_ASSET_ROOT) return window.MOS_ASSET_ROOT.replace(/\/$/, '');
        return '/website/assets/data';
    },

    async _ensureVault() {
        if (this.vault) return true;
        try {
            const root = this._resolveBasePath();
            const res = await fetch(`${root}/vault_data.json`);
            if (!res.ok) throw new Error('vault fetch ' + res.status);
            this.vault = await res.json();
            return true;
        } catch (e) {
            console.error('Failed to load vault data', e);
            return false;
        }
    },

    async applyBookRules(profile) {
        await this.init();
        return this._applyBookRules(profile);
    },

    applyBookRulesSync(profile) {
        if (!this.isLoaded) return null;
        return this._applyBookRules(profile);
    },

    _applyBookRules(profile) {
        let result = {
            applied_rules: [],
            extra_modifiers: [],
            rep_range: "6-12",
            rep_range_overridden: false,
            rest_compounds: "90-120s",
            rest_isolation: "60-90s",
            protein_per_kg: 1.6,
            surplus_kcal: 350,
            deficit_kcal: 500,
            meal_timing: "Distribute protein across 3-4 meals at leucine threshold (30-40g per meal). Carbs prioritized around training window.",
            warm_up: "",
            program_notes: [],
            nutrition_notes: [],
            vault_insights: []
        };

        for (let rule of this.rules) {
            let matches = false;
            try {
                matches = safeEvalTrigger(rule.trigger_js, profile);
            } catch (e) {
                console.warn("Rule evaluation error for", rule.rule_id, e);
            }

            if (!matches) continue;

            result.applied_rules.push(rule);

            if (rule.modifier_additions) {
                result.extra_modifiers.push(...rule.modifier_additions);
            }
            if (rule.rep_range_override) {
                result.rep_range = rule.rep_range_override;
                result.rep_range_overridden = true;
            }
            if (rule.rest_period_override) {
                let parts = rule.rest_period_override.split(",");
                if (parts.length >= 1) result.rest_compounds = parts[0].trim();
                if (parts.length >= 2) result.rest_isolation = parts[1].trim();
            }
            if (rule.protein_g_per_kg_override) {
                result.protein_per_kg = Math.max(result.protein_per_kg, rule.protein_g_per_kg_override);
            }
            if (rule.surplus_cal_adjustment) {
                result.surplus_kcal = rule.surplus_cal_adjustment;
            }
            if (rule.deficit_cal_adjustment) {
                result.deficit_kcal = rule.deficit_cal_adjustment;
            }
            if (rule.meal_timing_note) {
                result.meal_timing = rule.meal_timing_note;
            }
            if (rule.warm_up_addition) {
                result.warm_up = rule.warm_up_addition;
            }
            if (rule.program_note) {
                const note = String(rule.program_note).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                if (!result.program_notes.includes(note)) result.program_notes.push(note);
            }
            if (rule.nutrition_note) {
                const note = String(rule.nutrition_note).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                if (!result.nutrition_notes.includes(note)) result.nutrition_notes.push(note);
            }
            if (rule.program_note) {
                const insight = `[${rule.source}] ${String(rule.program_note).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}`;
                if (!result.vault_insights.includes(insight)) result.vault_insights.push(insight);
            }
        }

        result.extra_modifiers = [...new Set(result.extra_modifiers)];
        return result;
    },

    async getVaultData(type, key) {
        await this._ensureVault();
        if (!this.vault || !this.vault[type]) return null;
        return this.vault[type][key] || null;
    },

    async getInjuryMatrix() {
        await this._ensureVault();
        return this.vault ? this.vault.injury_matrix || null : null;
    },

    /**
     * Phase 6: Biofeedback Volume Autoregulation
     * Takes scores from 1-5 for Pump, Fatigue, Soreness.
     * Returns a delta (-1, 0, +1) and the reason.
     */
    calculateVolumeAdjustment(pump, fatigue, soreness) {
        if (pump <= 2 && fatigue <= 2) {
            return { delta: 1, reason: "Low stimulus detected." };
        }
        if (fatigue >= 4 || soreness >= 4) {
            return { delta: -1, reason: "High fatigue/soreness detected." };
        }
        return { delta: 0, reason: "Optimal stimulus." };
    }
};

window.DecisionEngine = DecisionEngine;
