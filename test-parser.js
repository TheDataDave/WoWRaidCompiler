// Test script for parser edge cases
const RaidHelperParser = require('./src/core/parser');
const fs = require('fs');

console.log('🧪 Testing Raid Helper Parser Edge Cases\n');

const parser = new RaidHelperParser();

// Test 1: Error response
console.log('Test 1: Error response from Raid Helper');
const errorData = JSON.parse(fs.readFileSync('./sample-data/raid-helper-error.json', 'utf-8'));
const errorResult = parser.parse(errorData);
console.log(`✅ Result: ${errorResult.success ? 'Success' : 'Failed as expected'}`);
if (!errorResult.success) {
    console.log(`   Error: ${errorResult.errors[0]}\n`);
}

// Test 2: Empty slots
console.log('Test 2: Empty slots (all null)');
const emptyData = JSON.parse(fs.readFileSync('./sample-data/raid-helper-empty-slots.json', 'utf-8'));
const emptyResult = parser.parse(emptyData);
console.log(`✅ Result: ${emptyResult.success ? 'Success' : 'Failed as expected'}`);
if (!emptyResult.success) {
    console.log(`   Error: ${emptyResult.errors[0]}\n`);
}

// Test 3: Mixed status (Tentative, Late, Bench)
console.log('Test 3: Mixed status classes');
const mixedData = JSON.parse(fs.readFileSync('./sample-data/raid-helper-mixed-status.json', 'utf-8'));
const mixedResult = parser.parse(mixedData);
console.log(`✅ Result: ${mixedResult.success ? 'Success' : 'Failed'}`);
if (mixedResult.success) {
    console.log(`   Valid players: ${mixedResult.players.length}`);
    console.log(`   Warnings: ${mixedResult.warnings.length}`);
    console.log(`   Metadata:`, mixedResult.metadata);
    if (mixedResult.warnings.length > 0) {
        console.log('   Warning messages:');
        mixedResult.warnings.forEach(w => console.log(`     - ${w}`));
    }
}
console.log('');

// Test 4: Original sample data
console.log('Test 4: Original sample data (should work)');
const sampleData = JSON.parse(fs.readFileSync('./sample-data/raid-helper-sample.json', 'utf-8'));
const sampleResult = parser.parse(sampleData);
console.log(`✅ Result: ${sampleResult.success ? 'Success' : 'Failed'}`);
if (sampleResult.success) {
    console.log(`   Valid players: ${sampleResult.players.length}`);
    console.log(`   Warnings: ${sampleResult.warnings ? sampleResult.warnings.length : 0}`);
}
console.log('');

console.log('🎉 All parser tests completed!\n');