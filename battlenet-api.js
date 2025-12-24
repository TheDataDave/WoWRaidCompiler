const https = require('https');

class BattleNetAPI {
    constructor(clientId, clientSecret, region = 'us') {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.region = region;
        this.accessToken = null;
        this.tokenExpiry = null;
        
        this.regionHosts = {
            'us': 'us.api.blizzard.com',
            'eu': 'eu.api.blizzard.com',
            'kr': 'kr.api.blizzard.com',
            'tw': 'tw.api.blizzard.com'
        };
    }

    async authenticate() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        
        return new Promise((resolve, reject) => {
            const options = {
                hostname: `${this.region}.battle.net`,
                path: '/oauth/token',
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.access_token) {
                            this.accessToken = response.access_token;
                            this.tokenExpiry = Date.now() + (response.expires_in * 1000);
                            resolve(this.accessToken);
                        } else {
                            reject(new Error('Failed to obtain access token'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write('grant_type=client_credentials');
            req.end();
        });
    }

    async getCharacterEquipment(realm, characterName) {
        try {
            await this.authenticate();

            const realmSlug = realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
            const charName = characterName.toLowerCase();
            
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: this.regionHosts[this.region],
                    path: `/profile/wow/character/${realmSlug}/${charName}/equipment?namespace=profile-classic-${this.region}&locale=en_US`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    
                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            if (res.statusCode === 200) {
                                const response = JSON.parse(data);
                                resolve(response);
                            } else if (res.statusCode === 404) {
                                resolve(null); // Character not found
                            } else {
                                reject(new Error(`API returned status ${res.statusCode}: ${data}`));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(error);
                });

                req.end();
            });
        } catch (error) {
            throw error;
        }
    }

    calculateGearScore(equipment) {
        if (!equipment || !equipment.equipped_items) {
            return 0;
        }

        let totalItemLevel = 0;
        let itemCount = 0;

        equipment.equipped_items.forEach(item => {
            if (item.level && item.level.value) {
                totalItemLevel += item.level.value;
                itemCount++;
            }
        });

        // Average item level as gear score
        return itemCount > 0 ? Math.round(totalItemLevel / itemCount) : 0;
    }

    async getCharacterGearScore(realm, characterName) {
        try {
            const equipment = await this.getCharacterEquipment(realm, characterName);
            if (!equipment) {
                return { success: false, error: 'Character not found' };
            }

            const gearScore = this.calculateGearScore(equipment);
            return { 
                success: true, 
                gearScore,
                equipment: equipment.equipped_items 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async batchGetGearScores(characters) {
        const results = [];
        
        for (const char of characters) {
            try {
                const result = await this.getCharacterGearScore(char.realm, char.name);
                results.push({
                    name: char.name,
                    realm: char.realm,
                    ...result
                });
                
                // Rate limiting - wait 100ms between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                results.push({
                    name: char.name,
                    realm: char.realm,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

module.exports = BattleNetAPI;