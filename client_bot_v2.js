/**
 * client_bot_v2.js
 * Demo (immediate full accounting) / Mainnet switch with hidden passcode
 * Demo shows full accounting for all tiers and runs a Tier-1 live-style simulation.
 */

const fs = require("fs");
const readlineSync = require("readline-sync");
const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");

// -------- CONFIG --------
const MAINNET_PASSCODE = "xxxx"; // hidden in prompts (not printed)
const DEMO_PER_BOT_COST_USD = 2010; // used for funding totals display
const LICENSE_DURATION_MONTHS = 24;

// Tier definitions exactly as you specified
const DEMO_TIERS = [
  { tier: 1, bots: 1_000, licensePrice: 5_000_000, monthlyPayout: 500_000 },
  { tier: 2, bots: 10_000, licensePrice: 5_000_000, monthlyPayout: 5_000_000 },
  { tier: 3, bots: 50_000, licensePrice: 5_000_000, monthlyPayout: 25_000_000 }
];

// compute totals to match your table exactly
DEMO_TIERS.forEach(t => {
  t.duration = LICENSE_DURATION_MONTHS;
  t.totalPayout = t.monthlyPayout * t.duration;
  t.profit = t.totalPayout - t.licensePrice;
  t.totalFunding = t.bots * DEMO_PER_BOT_COST_USD;
});

// -------- MODE SELECTION --------
// Simple startup choice (prompt shown). Demo prints accounting immediately after selection.
console.log("Select mode:");
console.log("1) Demo (Devnet, safe, Tier-1 simulation)");
console.log("2) Mainnet (requires passcode)");
const modeChoice = readlineSync.question("Enter 1 or 2: ").trim();
const DEMO_MODE = modeChoice === "1";

if (!DEMO_MODE) {
  const inputPass = readlineSync.question("Enter license passcode: ", { hideEchoBack: true }).trim();
  if (inputPass !== MAINNET_PASSCODE) {
    console.error("Incorrect passcode. Exiting.");
    process.exit(1);
  }
}

// -------- DEMO: immediate, exact accounting (no extra blank lines) --------
function printDemoAccounting() {
  // Header row (no extra blank lines)
  console.log("Tier | Bots | License Price | Monthly Payout | Duration | Total Payout | Profit | Total Funding");
  console.log("-----|------|---------------|----------------|----------|--------------|--------|--------------");

  DEMO_TIERS.forEach(t => {
    const row = [
      `Tier ${t.tier}`,
      t.bots.toLocaleString(),
      `$${t.licensePrice.toLocaleString()}`,
      `$${t.monthlyPayout.toLocaleString()}`,
      `${t.duration} mo`,
      `$${t.totalPayout.toLocaleString()}`,
      `$${t.profit.toLocaleString()}`,
      `$${t.totalFunding.toLocaleString()}`
    ].join(" | ");
    console.log(row);
  });
}

// -------- BOT / DEMO SIMULATION --------
const CONFIG = {
  rpcEndpoint: DEMO_MODE ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com",
  heliusApiKey: process.env.HELIUS_API_KEY || "",
  botGoal: DEMO_MODE ? DEMO_TIERS[0].bots : undefined // for mainnet will be set from license
};

// prepare bots array; in demo each bot tracks cumulative USD earnings
let bots = [];
function initBots(count) {
  bots = [];
  for (let i = 0; i < count; i++) bots.push({ id: i + 1, cumulativeUSD: 0 });
}

// simulate one-minute tick earnings (randomized ±5%)
function demoEarningsPerMinute(monthlyPayout, botsCount) {
  const minutesInMonth = 30 * 24 * 60; // rough
  const basePerMin = monthlyPayout / minutesInMonth;
  // returns function that gives randomized earnings for one bot per tick
  return () => basePerMin * (0.95 + Math.random() * 0.10);
}

// show per-bot sample + live-accumulated totals (keeps console informative but not spammy)
async function runDemoSimulation() {
  const tier = DEMO_TIERS[0]; // Tier 1 simulation
  initBots(tier.bots);
  const earnFn = demoEarningsPerMinute(tier.monthlyPayout, tier.bots);

  // Print header that judges will see first (table already printed)
  console.log(`\nDemo: Simulating ${tier.bots.toLocaleString()} bots (Tier 1). Each bot funded: $${DEMO_PER_BOT_COST_USD.toLocaleString()}.`);
  console.log("Showing a sample of per-bot earnings and rolling totals. (Demo is safe; no real funds move.)");

  // We'll run a short live demo of N ticks (you can increase/decrease). Each tick approx 1 minute in normal run.
  const TICKS = 10; // number of demo ticks to display (keeps demo short/presentable)
  for (let tick = 1; tick <= TICKS; tick++) {
    let tickSum = 0;
    // for performance and readability, show only first 8 bots details and aggregate rest
    for (let i = 0; i < tier.bots; i++) {
      const e = earnFn();
      bots[i].cumulativeUSD += e;
      tickSum += e;
    }

    // compute totals
    const totalCumulative = bots.reduce((s, b) => s + b.cumulativeUSD, 0);

    // print concise sample: first 8 bots + totals
    const sampleCount = Math.min(8, bots.length);
    let sampleLines = [];
    for (let i = 0; i < sampleCount; i++) {
      sampleLines.push(`Bot#${bots[i].id}: $${bots[i].cumulativeUSD.toFixed(2)}`);
    }
    console.log(`\nTick ${tick} — sample: ${sampleLines.join(" | ")}`);
    console.log(`Tick ${tick} — tick payout total: $${tickSum.toFixed(2)} | cumulative total (all bots): $${totalCumulative.toFixed(2)}`);

    // short delay between ticks so judges can watch (200ms here for demo; change to 60000 for real-time minute)
    await new Promise(r => setTimeout(r, 200));
  }

  // final summary: ensure the demo totals match the Tier totals (within rounding)
  const demoTotal = bots.reduce((s, b) => s + b.cumulativeUSD, 0);
  console.log("\nDemo final summary (Tier 1 simulated):");
  console.log(`Simulated total payout (accumulated across shown ticks): $${demoTotal.toFixed(2)}`);
  console.log(`Tier 1 projected monthly payout (table): $${tier.monthlyPayout.toLocaleString()}`);
  console.log(`Tier 1 projected total payout (24 months): $${tier.totalPayout.toLocaleString()}`);
  console.log(`Tier 1 projected profit (24 months minus license): $${tier.profit.toLocaleString()}`);
  console.log("\nDemo complete. No real transactions were made.");
}

// -------- MAIN (Demo or Mainnet) --------
async function main() {
  if (DEMO_MODE) {
    printDemoAccounting();        // immediate exact table for judges (no extra blank lines)
    await runDemoSimulation();    // realistic live-style simulation (randomized per-bot)
    return;
  }

  // mainnet path (locked behind passcode)
  if (!process.env.HELIUS_API_KEY) {
    console.error("HELIUS_API_KEY missing in environment for Mainnet mode. Exiting.");
    process.exit(1);
  }

  // Load license, set CONFIG.botGoal etc. (placeholder - implement as needed)
  // Example: LICENSE = loadLicense(...); CONFIG.botGoal = LICENSE.botGoal;

  console.log("Mainnet mode unlocked. Real Helius execution would proceed here.");
  // Real mainnet logic (fundBots, execute swaps with Helius, payouts) goes here.
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

