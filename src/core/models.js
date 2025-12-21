// Player Data Model
class Player {
    constructor(data) {
        this.id = data.userid || data._id || this.generateId();
        this.name = data.name || 'Unknown';
        this.class = this.normalizeClass(data.class);
        this.spec = data.spec || data.spec1 || 'Unknown';
        this.gearScore = data.gearScore || 0;
        this.signupTime = data.signuptime || Date.now();
        this.isConfirmed = data.isConfirmed !== false;
        this.isTentative = data.isTentative || false;
        this.isBenched = data.isBenched || false;
        this.note = data.note || '';
        this.partyId = data.partyId || null;
        this.slotId = data.slotId || null;
        this.roles = this.determineRoles();
        this.score = 0;
    }

    generateId() {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    normalizeClass(className) {
        if (!className) return 'Unknown';
        
        // Handle special status classes
        const statusClasses = ['tentative', 'late', 'bench', 'absence', 'tank'];
        const normalized = className.toLowerCase().trim();
        
        if (statusClasses.includes(normalized)) {
            // These are status indicators, not actual classes
            // Return as-is for now, caller should handle
            return className;
        }
        
        const classMap = {
            'warrior': 'Warrior',
            'rogue': 'Rogue',
            'hunter': 'Hunter',
            'mage': 'Mage',
            'warlock': 'Warlock',
            'priest': 'Priest',
            'druid': 'Druid',
            'shaman': 'Shaman',
            'paladin': 'Paladin'
        };
        return classMap[normalized] || className;
    }

    determineRoles() {
        const roles = {
            primary: 'dps',
            secondary: null,
            all: []
        };

        const classRoles = {
            'Warrior': { primary: 'dps', secondary: 'tank', all: ['tank', 'dps'] },
            'Rogue': { primary: 'dps', secondary: null, all: ['dps'] },
            'Hunter': { primary: 'dps', secondary: null, all: ['dps', 'utility'] },
            'Mage': { primary: 'dps', secondary: null, all: ['dps'] },
            'Warlock': { primary: 'dps', secondary: null, all: ['dps'] },
            'Priest': { primary: 'healer', secondary: 'dps', all: ['healer', 'dps'] },
            'Druid': { primary: 'healer', secondary: 'tank', all: ['healer', 'tank', 'dps'] },
            'Shaman': { primary: 'healer', secondary: 'dps', all: ['healer', 'dps', 'utility'] },
            'Paladin': { primary: 'healer', secondary: 'tank', all: ['healer', 'tank', 'dps'] }
        };

        const roleData = classRoles[this.class];
        if (roleData) {
            roles.primary = roleData.primary;
            roles.secondary = roleData.secondary;
            roles.all = roleData.all;
        }

        // Adjust based on spec if available - spec takes priority
        if (this.spec) {
            const specLower = this.spec.toLowerCase();
            
            // Tank specs
            if (specLower.includes('protection') || specLower.includes('guardian')) {
                roles.primary = 'tank';
            }
            // Healer specs
            else if (specLower.includes('heal') || specLower.includes('resto') || 
                     specLower.includes('holy') || specLower.includes('disc')) {
                roles.primary = 'healer';
            }
            // DPS specs - be explicit about warrior DPS specs
            else if (specLower.includes('fury') || specLower.includes('arms') ||
                     specLower.includes('combat') || specLower.includes('assassination') ||
                     specLower.includes('subtlety') || specLower.includes('enhancement') ||
                     specLower.includes('elemental') || specLower.includes('shadow') ||
                     specLower.includes('balance') || specLower.includes('feral') ||
                     specLower.includes('retribution') || specLower.includes('dps') ||
                     specLower.includes('damage')) {
                roles.primary = 'dps';
            }
        }

        // Special case for Tank class (from Raid Helper)
        if (this.class === 'Tank') {
            roles.primary = 'tank';
            roles.all = ['tank'];
        }

        return roles;
    }

    getBuffsProvided() {
        const buffs = [];
        
        switch(this.class) {
            case 'Shaman':
                buffs.push('Windfury Totem', 'Strength of Earth', 'Grace of Air', 'Mana Spring');
                break;
            case 'Paladin':
                buffs.push('Blessing of Kings', 'Blessing of Might', 'Blessing of Wisdom');
                break;
            case 'Druid':
                buffs.push('Mark of the Wild', 'Thorns', 'Innervate');
                break;
            case 'Priest':
                buffs.push('Power Word: Fortitude', 'Divine Spirit', 'Shadow Weaving');
                break;
            case 'Mage':
                buffs.push('Arcane Intellect', 'Dampen Magic');
                break;
            case 'Warlock':
                buffs.push('Healthstone', 'Soulstone', 'Curse of Elements');
                break;
            case 'Hunter':
                buffs.push('Trueshot Aura', 'Aspect of the Hawk');
                break;
        }
        
        return buffs;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            class: this.class,
            spec: this.spec,
            gearScore: this.gearScore,
            roles: this.roles,
            score: this.score,
            isConfirmed: this.isConfirmed,
            isTentative: this.isTentative,
            isBenched: this.isBenched
        };
    }
}

// Raid Data Model
class Raid {
    constructor(size = 40, faction = 'neutral') {
        this.size = size;
        this.faction = faction;
        this.players = [];
        this.groups = [];
        this.composition = {
            tanks: 0,
            healers: 0,
            dps: 0,
            utility: 0
        };
    }

    addPlayer(player) {
        if (this.players.length < this.size) {
            this.players.push(player);
            return true;
        }
        return false;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
    }

    getPlayersByRole(role) {
        return this.players.filter(p => p.roles.all.includes(role));
    }

    getPlayersByClass(className) {
        return this.players.filter(p => p.class === className);
    }

    calculateComposition() {
        this.composition = {
            tanks: 0,
            healers: 0,
            dps: 0,
            utility: 0
        };

        this.players.forEach(player => {
            if (player.roles.primary === 'tank') this.composition.tanks++;
            else if (player.roles.primary === 'healer') this.composition.healers++;
            else if (player.roles.primary === 'dps') this.composition.dps++;
            
            if (player.roles.all.includes('utility')) this.composition.utility++;
        });

        return this.composition;
    }

    getClassDistribution() {
        const distribution = {};
        this.players.forEach(player => {
            distribution[player.class] = (distribution[player.class] || 0) + 1;
        });
        return distribution;
    }

    getAverageGearScore() {
        if (this.players.length === 0) return 0;
        const total = this.players.reduce((sum, p) => sum + p.gearScore, 0);
        return Math.round(total / this.players.length);
    }

    toJSON() {
        return {
            size: this.size,
            faction: this.faction,
            players: this.players.map(p => p.toJSON()),
            groups: this.groups,
            composition: this.composition
        };
    }
}

// Group Data Model
class Group {
    constructor(id, maxSize = 5) {
        this.id = id;
        this.maxSize = maxSize;
        this.players = [];
        this.score = 0;
        this.buffs = new Set();
    }

    addPlayer(player) {
        if (this.players.length < this.maxSize) {
            this.players.push(player);
            this.updateBuffs();
            return true;
        }
        return false;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        this.updateBuffs();
    }

    updateBuffs() {
        this.buffs.clear();
        this.players.forEach(player => {
            player.getBuffsProvided().forEach(buff => this.buffs.add(buff));
        });
    }

    calculateScore() {
        let score = 0;
        
        // Base score from player scores
        this.players.forEach(player => {
            score += player.score;
        });

        // Bonus for buff diversity
        score += this.buffs.size * 10;

        // Bonus for balanced roles
        const roles = { tank: 0, healer: 0, dps: 0 };
        this.players.forEach(player => {
            roles[player.roles.primary]++;
        });

        // Ideal: 1 tank, 1 healer, 3 dps for 5-man groups
        if (roles.tank >= 1) score += 20;
        if (roles.healer >= 1) score += 20;
        if (roles.dps >= 3) score += 15;

        this.score = score;
        return score;
    }

    getComposition() {
        const comp = { tank: 0, healer: 0, dps: 0 };
        this.players.forEach(player => {
            comp[player.roles.primary]++;
        });
        return comp;
    }

    toJSON() {
        return {
            id: this.id,
            players: this.players.map(p => p.toJSON()),
            score: this.score,
            buffs: Array.from(this.buffs),
            composition: this.getComposition()
        };
    }
}

module.exports = { Player, Raid, Group };