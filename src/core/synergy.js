// WoW Classic Synergy and Buff System
class SynergyCalculator {
    constructor() {
        // Define class synergies and optimal group compositions
        this.synergyGroups = {
            melee: {
                classes: ['Warrior', 'Rogue'],
                specs: ['Fury', 'Arms', 'Combat', 'Assassination', 'Subtlety', 'Feral', 'Enhancement'],
                buffs: ['Windfury Totem', 'Strength of Earth', 'Grace of Air'],
                providers: ['Shaman'],
                ideal: { warriors: 3, rogues: 1, shamans: 1 }
            },
            caster: {
                classes: ['Mage', 'Warlock'],
                specs: ['Fire', 'Frost', 'Arcane', 'Affliction', 'Destruction', 'Demonology', 'Shadow', 'Balance'],
                buffs: ['Arcane Intellect', 'Moonkin Aura'],
                providers: ['Druid'],
                ideal: { mages: 4, boomkin: 1 }
            },
            warlock: {
                classes: ['Warlock'],
                specs: ['Affliction', 'Destruction', 'Demonology'],
                buffs: ['Shadow Weaving', 'Curse of Elements'],
                providers: ['Priest'],
                ideal: { warlocks: 4, shadowPriest: 1 }
            },
            hunter: {
                classes: ['Hunter'],
                specs: ['Marksmanship', 'Beast Mastery', 'Survival'],
                buffs: ['Trueshot Aura'],
                providers: [],
                ideal: { hunters: 3, melee: 2 }
            }
        };
    }

    // Calculate synergy score between two players
    calculatePlayerSynergy(player1, player2) {
        let score = 0;

        // Melee synergy
        if (this.isMelee(player1) && this.isMelee(player2)) {
            score += 15;
        }

        // Melee + Shaman (Windfury)
        if (this.isMelee(player1) && this.isShaman(player2)) {
            score += 30;
        }
        if (this.isShaman(player1) && this.isMelee(player2)) {
            score += 30;
        }

        // Caster synergy
        if (this.isCaster(player1) && this.isCaster(player2)) {
            score += 10;
        }

        // Mage + Balance Druid (spell crit aura)
        if (this.isMage(player1) && this.isBalanceDruid(player2)) {
            score += 25;
        }
        if (this.isBalanceDruid(player1) && this.isMage(player2)) {
            score += 25;
        }

        // Warlock + Shadow Priest
        if (this.isWarlock(player1) && this.isShadowPriest(player2)) {
            score += 25;
        }
        if (this.isShadowPriest(player1) && this.isWarlock(player2)) {
            score += 25;
        }

        // Hunter + Melee (Trueshot Aura benefits physical DPS)
        if (this.isHunter(player1) && this.isMelee(player2)) {
            score += 10;
        }
        if (this.isMelee(player1) && this.isHunter(player2)) {
            score += 10;
        }

        // Feral Druid + Melee (Leader of the Pack)
        if (this.isFeralDruid(player1) && this.isMelee(player2)) {
            score += 15;
        }
        if (this.isMelee(player1) && this.isFeralDruid(player2)) {
            score += 15;
        }

        return score;
    }

    // Calculate total synergy for a group
    calculateGroupSynergy(players) {
        let totalScore = 0;
        
        // Calculate pairwise synergies
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                totalScore += this.calculatePlayerSynergy(players[i], players[j]);
            }
        }

        // Bonus for optimal group compositions
        totalScore += this.getCompositionBonus(players);

        return totalScore;
    }

    getCompositionBonus(players) {
        let bonus = 0;
        const counts = this.countPlayerTypes(players);

        // Melee group bonus (3-4 melee + 1 shaman)
        if (counts.melee >= 3 && counts.shamans >= 1) {
            bonus += 50;
        }

        // Caster group bonus (4+ casters + balance druid)
        if (counts.mages >= 3 && counts.balanceDruids >= 1) {
            bonus += 40;
        }

        // Warlock group bonus (3+ warlocks + shadow priest)
        if (counts.warlocks >= 3 && counts.shadowPriests >= 1) {
            bonus += 40;
        }

        // Hunter group bonus (2+ hunters)
        if (counts.hunters >= 2) {
            bonus += 20;
        }

        // Healer presence bonus
        if (counts.healers >= 1) {
            bonus += 15;
        }

        // Tank presence bonus
        if (counts.tanks >= 1) {
            bonus += 10;
        }

        return bonus;
    }

    countPlayerTypes(players) {
        return {
            melee: players.filter(p => this.isMelee(p)).length,
            casters: players.filter(p => this.isCaster(p)).length,
            mages: players.filter(p => this.isMage(p)).length,
            warlocks: players.filter(p => this.isWarlock(p)).length,
            hunters: players.filter(p => this.isHunter(p)).length,
            shamans: players.filter(p => this.isShaman(p)).length,
            balanceDruids: players.filter(p => this.isBalanceDruid(p)).length,
            shadowPriests: players.filter(p => this.isShadowPriest(p)).length,
            feralDruids: players.filter(p => this.isFeralDruid(p)).length,
            healers: players.filter(p => p.roles.primary === 'healer').length,
            tanks: players.filter(p => p.roles.primary === 'tank').length
        };
    }

    // Helper methods to identify player types
    isMelee(player) {
        const meleeClasses = ['Warrior', 'Rogue'];
        const meleeSpecs = ['Fury', 'Arms', 'Combat', 'Assassination', 'Subtlety', 'Feral', 'Enhancement'];
        return meleeClasses.includes(player.class) || 
               meleeSpecs.some(spec => player.spec.includes(spec));
    }

    isCaster(player) {
        const casterClasses = ['Mage', 'Warlock'];
        const casterSpecs = ['Fire', 'Frost', 'Arcane', 'Affliction', 'Destruction', 'Demonology', 'Shadow', 'Balance'];
        return casterClasses.includes(player.class) || 
               casterSpecs.some(spec => player.spec.includes(spec));
    }

    isMage(player) {
        return player.class === 'Mage';
    }

    isWarlock(player) {
        return player.class === 'Warlock';
    }

    isHunter(player) {
        return player.class === 'Hunter';
    }

    isShaman(player) {
        return player.class === 'Shaman';
    }

    isBalanceDruid(player) {
        return player.class === 'Druid' && player.spec.includes('Balance');
    }

    isShadowPriest(player) {
        return player.class === 'Priest' && player.spec.includes('Shadow');
    }

    isFeralDruid(player) {
        return player.class === 'Druid' && player.spec.includes('Feral');
    }

    // Get ideal group type for a player
    getIdealGroupType(player) {
        if (this.isMelee(player)) return 'melee';
        if (this.isMage(player)) return 'caster';
        if (this.isWarlock(player)) return 'warlock';
        if (this.isHunter(player)) return 'hunter';
        if (this.isShaman(player)) return 'melee'; // Shamans go with melee for Windfury
        if (this.isBalanceDruid(player)) return 'caster'; // Boomkin with mages
        if (this.isShadowPriest(player)) return 'warlock'; // Shadow priest with warlocks
        if (player.roles.primary === 'healer') return 'healer';
        if (player.roles.primary === 'tank') return 'tank';
        return 'flex';
    }
}

module.exports = SynergyCalculator;