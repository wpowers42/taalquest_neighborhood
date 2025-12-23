/**
 * Test script for generateScenario function
 * Run with: node test_scenario.js
 * Requires OPENAI_API_KEY environment variable
 *
 * Usage:
 *   node test_scenario.js         # Run 2 scenario-only tests
 *   node test_scenario.js 5       # Run 5 scenario-only tests
 *   node test_scenario.js e2e     # Run 2 end-to-end tests
 *   node test_scenario.js e2e 3   # Run 3 end-to-end tests
 */

import { generateScenario, generateScript } from './api.js';
import { CHARACTERS } from './constants.js';

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable not set');
    process.exit(1);
}

// =============================================================================
// TEST HELPERS
// =============================================================================

function validateScenario(scenario, char1Name, char2Name) {
    const issues = [];

    const requiredFields = ['scenario_description', 'setting_type', 'mood', 'character1_role', 'character2_role'];
    for (const field of requiredFields) {
        if (!scenario[field]) {
            issues.push(`Missing field: ${field}`);
        }
    }

    if (scenario.scenario_description) {
        const wordCount = scenario.scenario_description.split(/\s+/).length;
        if (wordCount < 40) {
            issues.push(`Scenario description too short: ${wordCount} words (expected 40+)`);
        }

        if (!scenario.scenario_description.includes(char1Name)) {
            issues.push(`Character ${char1Name} not mentioned in scenario`);
        }
        if (!scenario.scenario_description.includes(char2Name)) {
            issues.push(`Character ${char2Name} not mentioned in scenario`);
        }
    }

    return issues;
}

async function runScenarioTest(testNum) {
    const females = CHARACTERS.filter(c => c.gender === 'F');
    const males = CHARACTERS.filter(c => c.gender === 'M');
    const char1 = females[Math.floor(Math.random() * females.length)];
    const char2 = males[Math.floor(Math.random() * males.length)];

    console.log(`\n${'='.repeat(70)}`);
    console.log(`SCENARIO TEST ${testNum}: ${char1.name} and ${char2.name}`);
    console.log('='.repeat(70));

    try {
        const scenario = await generateScenario(API_KEY, char1.name, char2.name);

        console.log('\nScenario:');
        console.log('-'.repeat(60));
        console.log(scenario.scenario_description);
        console.log('-'.repeat(60));
        console.log(`Setting: ${scenario.setting_type} | Mood: ${scenario.mood}`);
        console.log(`${char1.name}: ${scenario.character1_role}`);
        console.log(`${char2.name}: ${scenario.character2_role}`);

        const issues = validateScenario(scenario, char1.name, char2.name);

        console.log('\n--- Validation ---');
        if (issues.length === 0) {
            console.log('✓ All checks passed');
        } else {
            console.log('Issues found:');
            issues.forEach(issue => console.log(`  ✗ ${issue}`));
        }

        return { success: issues.length === 0, scenario, issues };
    } catch (error) {
        console.error(`\n✗ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runEndToEndTest(testNum) {
    const females = CHARACTERS.filter(c => c.gender === 'F');
    const males = CHARACTERS.filter(c => c.gender === 'M');
    const char1 = females[Math.floor(Math.random() * females.length)];
    const char2 = males[Math.floor(Math.random() * males.length)];

    console.log(`\n${'='.repeat(70)}`);
    console.log(`END-TO-END TEST ${testNum}: ${char1.name} and ${char2.name}`);
    console.log('='.repeat(70));

    try {
        // Step 1: Generate scenario
        console.log('\n--- Generating Scenario ---\n');
        const scenario = await generateScenario(API_KEY, char1.name, char2.name);
        console.log('Scenario:');
        console.log(scenario.scenario_description);
        console.log(`\nSetting: ${scenario.setting_type} | Mood: ${scenario.mood}`);

        // Step 2: Generate script from scenario
        console.log('\n--- Generating Script from Scenario ---\n');
        const script = await generateScript(API_KEY, char1, char2, scenario.scenario_description);

        console.log(`Situation: ${script.situation}\n`);
        console.log('Dialogue:');
        script.dialogue.forEach((line) => {
            console.log(`  ${line.speaker}: "${line.text}"`);
            console.log(`           "${line.translation}"`);
        });

        console.log(`\nQuestions: ${script.questions.length}`);
        script.questions.forEach((q, i) => {
            console.log(`  ${i + 1}. ${q.question}`);
        });

        return { success: true, scenario, script };
    } catch (error) {
        console.error(`\n✗ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    const mode = process.argv[2] || 'scenario';
    const numTests = parseInt(process.argv[3]) || parseInt(process.argv[2]) || 2;

    if (mode === 'e2e' || mode === 'end-to-end') {
        console.log(`Running ${numTests} end-to-end test(s)...`);

        for (let i = 1; i <= numTests; i++) {
            await runEndToEndTest(i);
            if (i < numTests) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } else {
        const count = parseInt(mode) || numTests;
        console.log(`Running ${count} scenario generation test(s)...`);
        console.log('(Use "node test_scenario.js e2e" for end-to-end tests)\n');

        const results = [];
        for (let i = 1; i <= count; i++) {
            const result = await runScenarioTest(i);
            results.push(result);

            if (i < count) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`\n${'='.repeat(70)}`);
        console.log('SUMMARY');
        console.log('='.repeat(70));

        const passed = results.filter(r => r.success).length;
        console.log(`Passed: ${passed}/${count}`);

        if (passed < count) {
            console.log('\nFailed tests had these issues:');
            results.forEach((r, i) => {
                if (!r.success) {
                    console.log(`  Test ${i + 1}: ${r.issues?.join(', ') || r.error}`);
                }
            });
        }
    }
}

main().catch(console.error);
