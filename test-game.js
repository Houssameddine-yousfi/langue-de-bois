const { chromium } = require('@playwright/test');
const { spawn }    = require('child_process');
const path         = require('path');
const fs           = require('fs');

const SCREENSHOTS = path.join(__dirname, 'test-screenshots');
const BASE_URL    = 'http://localhost:8080';

async function shot(page, name) {
  if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS);
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}.png`);
}

// Reveal words for all player cards on the reveal screen
async function revealAllPlayers(page) {
  const cards = await page.$$eval('.player-card', els => els.map(e => e.textContent.trim()));
  for (let i = 0; i < cards.length; i++) {
    await page.click('.player-card');
    await page.waitForSelector('#memorized-btn');
    await page.click('#memorized-btn');
    if (i < cards.length - 1) {
      await page.waitForSelector('#ready-btn');
      await page.click('#ready-btn');
    }
  }
}

// Play one vote round; returns true if the end screen was reached
async function playRound(page, roundNum) {
  await page.waitForSelector('#vote-btn');
  console.log(`    Round ${roundNum}: voting…`);
  await page.click('#vote-btn');
  await page.waitForSelector('.vote-target');

  // Each voter picks their first available target
  const rows = await page.$$('.vote-row');
  for (const row of rows) {
    const btn = await row.$('.vote-target');
    if (btn) await btn.click();
  }
  await page.click('#confirm-btn');
  await page.waitForSelector('h2');

  // Handle runoff
  const h2 = await page.$eval('h2', el => el.textContent.trim());
  if (h2.includes('Égalité')) {
    console.log('    → Runoff vote');
    const runoffBtns = await page.$$('.vote-target');
    for (const b of runoffBtns) await b.click().catch(() => {});
    await page.click('#confirm-btn');
    await page.waitForSelector('h2');
  }

  // Handle Mr White guess
  const guessInput = await page.$('#guess-input');
  if (guessInput) {
    console.log('    → Mr White guessing…');
    await page.fill('#guess-input', 'mauvaisereponse');
    await page.click('#guess-btn');
    await page.waitForTimeout(2500);
  }

  // Handle elimination continue button
  const continueBtn = await page.$('#continue-btn');
  if (continueBtn) {
    const elim = await page.$eval('h2', el => el.textContent.trim());
    console.log(`    → Eliminated: "${elim}"`);
    await page.click('#continue-btn');
    await page.waitForSelector('h2');
  }

  return !!(await page.$('#play-again-btn'));
}

// Play through an entire game (up to 20 rounds) and return the end screen score data
async function playFullGame(page, gameNum) {
  console.log(`\n--- Game ${gameNum} ---`);
  await page.waitForSelector('.player-card', { timeout: 10000 });
  await revealAllPlayers(page);

  for (let r = 1; r <= 20; r++) {
    const ended = await playRound(page, r);
    if (ended) return true;
  }
  return false;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
(async () => {
  // Start local HTTP server
  const server = spawn('python3', ['-m', 'http.server', '8080'], {
    cwd: __dirname,
    stdio: 'ignore'
  });
  await new Promise(r => setTimeout(r, 800));

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  page.setViewportSize({ width: 480, height: 900 });

  const errors = [];
  page.on('console',   msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  const results = [];
  function check(label, value) {
    const ok = value === true;
    results.push({ label, ok });
    console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  }

  console.log('\n=== TEST: Langue de Bois ===\n');

  // ── Setup ─────────────────────────────────────────────────────────────────
  await page.goto(BASE_URL);
  await page.waitForSelector('#name-input');

  const title = await page.$eval('h1', el => el.textContent.trim());
  check('Title is "Langue de Bois"', title === 'Langue de Bois');
  await shot(page, '01-setup-names');

  for (const name of ['Alice', 'Bob', 'Carol', 'Dave']) {
    await page.fill('#name-input', name);
    await page.click('#add-btn');
  }

  const nextDisabled = await page.$eval('#next-btn', btn => btn.disabled);
  check('Next button enabled with 4 players', !nextDisabled);

  await page.click('#next-btn');
  await page.waitForSelector('#start-btn');
  await shot(page, '02-setup-roles');

  // ── Vote screen order bug ─────────────────────────────────────────────────
  // Verify that voters are listed in playOrder (shuffled), not in the role-
  // assignment order where the imposter is always index 0.
  await page.click('#start-btn');
  await page.waitForSelector('.player-card', { timeout: 10000 });
  await revealAllPlayers(page);
  await page.waitForSelector('#vote-btn');
  await page.click('#vote-btn');
  await page.waitForSelector('.vote-row');

  const voterOrder = await page.$$eval('.vote-row', rows =>
    rows.map(r => r.querySelector('strong').textContent.trim())
  );
  const playOrder = await page.evaluate(() => State.playOrder);
  const players   = await page.evaluate(() => State.players.map(p => ({ name: p.name, role: p.role })));

  // The rendered voter order must exactly match State.playOrder
  check(
    'Vote screen lists voters in playOrder (not role-assignment order)',
    JSON.stringify(voterOrder) === JSON.stringify(playOrder)
  );

  // The player at index 0 in State.players is always the imposter (by design
  // in roles.js). If the old bug were present, voterOrder[0] would always
  // equal players[0].name. Assert this is NOT the case across 10 tries by
  // checking that playOrder[0] !== players[0].name at least sometimes.
  // For a single run, just assert playOrder order !== players[] order.
  const playerArrayOrder = players.map(p => p.name);
  const sameAsAssignmentOrder = JSON.stringify(voterOrder) === JSON.stringify(playerArrayOrder);
  // We can't guarantee they differ in one run (1/24 chance they match by luck),
  // so instead assert the imposter (players[0]) is not hardcoded first.
  // The meaningful check is the playOrder match above; log role info for visibility.
  const imposter = players.find(p => p.role === 'imposter');
  console.log(`  Imposter: ${imposter ? imposter.name : '?'}, first voter: ${voterOrder[0]}, playOrder[0]: ${playOrder[0]}`);
  console.log(`  Voter order: [${voterOrder.join(', ')}]`);
  console.log(`  playOrder:   [${playOrder.join(', ')}]`);

  await shot(page, '02b-vote-order');

  // ── Randomness: imposter not always first in reveal or vote-target order ──
  // Run 15 games and record the imposter's index in State.players (which
  // drives both the reveal card list and the vote candidate list).
  // With 4 players the odds of always landing at index 0 by chance: (1/4)^15 ≈ 10^-9.
  console.log('\n--- Randomness check (15 iterations) ---');
  const imposterIndexes = [];

  for (let i = 0; i < 15; i++) {
    await page.goto(BASE_URL);
    await page.waitForSelector('#name-input');
    for (const name of ['Alice', 'Bob', 'Carol', 'Dave']) {
      await page.fill('#name-input', name);
      await page.click('#add-btn');
    }
    await page.click('#next-btn');
    await page.waitForSelector('#start-btn');
    await page.click('#start-btn');
    await page.waitForSelector('.player-card', { timeout: 10000 });

    const idx = await page.evaluate(() =>
      State.players.findIndex(p => p.role === 'imposter')
    );
    imposterIndexes.push(idx);
  }

  console.log(`  Imposter positions across 15 runs: [${imposterIndexes.join(', ')}]`);
  check(
    'Imposter not always first in State.players order (reveal & vote targets)',
    !imposterIndexes.every(i => i === 0)
  );

  // ── DOM check: reveal card order matches State.players ────────────────────
  // (still on the last reveal screen from the loop above)
  const revealCardNames = await page.$$eval('.player-card', els =>
    els.map(e => e.textContent.trim())
  );
  const statePlayerNames = await page.evaluate(() => State.players.map(p => p.name));
  check(
    'Reveal screen card order matches State.players order',
    JSON.stringify(revealCardNames) === JSON.stringify(statePlayerNames)
  );

  // ── DOM check: vote target order matches State.players order ─────────────
  // Skip through reveal to reach vote screen
  await revealAllPlayers(page);
  await page.waitForSelector('#vote-btn');
  await page.click('#vote-btn');
  await page.waitForSelector('.vote-target');

  // Grab the candidate names from the first voter's target buttons
  const firstVoterName = await page.$eval('.vote-row strong', el => el.textContent.trim());
  const targetNames = await page.$$eval(
    '.vote-row:first-child .vote-target',
    btns => btns.map(b => b.dataset.target)
  );
  // Expected: all active players except the first voter, in State.players order
  const expectedTargets = await page.evaluate(name =>
    State.activePlayers().filter(p => p.name !== name).map(p => p.name),
    firstVoterName
  );
  check(
    'Vote target order matches State.players order',
    JSON.stringify(targetNames) === JSON.stringify(expectedTargets)
  );

  await shot(page, '02c-vote-targets-order');

  // ── Mr White not always second in play order ──────────────────────────────
  // With the old bug, findIndex always picked index 1 when Mr White landed at
  // index 0, making Mr White permanently second. Run 20 games with Mr White
  // enabled and assert he appears at positions other than 1.
  // With 3 valid positions (1–3 out of 4), always landing on 1: (1/3)^20 ≈ 10^-10.
  console.log('\n--- Mr White position check (20 iterations) ---');
  const mrWhitePositions = [];

  for (let i = 0; i < 20; i++) {
    await page.goto(BASE_URL);
    await page.waitForSelector('#name-input');
    for (const name of ['Alice', 'Bob', 'Carol', 'Dave', 'Eve']) {
      await page.fill('#name-input', name);
      await page.click('#add-btn');
    }
    await page.click('#next-btn');
    await page.waitForSelector('#start-btn');

    // Enable 1 Mr White (5 players: 1 imposter + 1 MrWhite + 3 civilians = valid)
    await page.click('#mw-up');
    await page.click('#start-btn');
    await page.waitForSelector('.player-card', { timeout: 10000 });

    const pos = await page.evaluate(() =>
      State.playOrder.indexOf(State.players.find(p => p.role === 'misterwhite').name)
    );
    mrWhitePositions.push(pos);
  }

  console.log(`  Mr White positions in playOrder across 20 runs: [${mrWhitePositions.join(', ')}]`);
  check('Mr White never plays first', mrWhitePositions.every(p => p !== 0));
  check('Mr White not always second (position varies)', !mrWhitePositions.every(p => p === 1));

  // Navigate back to setup for the main game flow
  await page.goto(BASE_URL);
  await page.waitForSelector('#name-input');
  for (const name of ['Alice', 'Bob', 'Carol', 'Dave']) {
    await page.fill('#name-input', name);
    await page.click('#add-btn');
  }
  await page.click('#next-btn');
  await page.waitForSelector('#start-btn');

  // ── Game 1 ────────────────────────────────────────────────────────────────
  await page.click('#start-btn');
  const g1ended = await playFullGame(page, 1);
  check('Game 1 reached end screen', g1ended);

  if (g1ended) {
    await shot(page, '03-end-screen-game1');

    const winner1 = await page.$eval('.winner-banner h2', el => el.textContent.trim());
    console.log(`  Winner: "${winner1}"`);

    const scoreRows = await page.$$('.score-row');
    check('Score table has 4 rows', scoreRows.length === 4);

    const earned = await page.$$eval('.score-earned', els => els.map(e => e.textContent.trim()));
    console.log(`  Points earned: ${earned.join(', ')}`);
    check('At least one player earned points', earned.some(v => v !== '+0'));

    const totals1 = await page.$$eval('.score-total', els => els.map(e => parseInt(e.textContent)));
    console.log(`  Totals after game 1: ${totals1.join(', ')}`);
    check('All totals are non-negative', totals1.every(v => v >= 0));

    // ── Game 2: Play Again ────────────────────────────────────────────────
    await page.click('#play-again-btn');
    await page.waitForSelector('#start-btn');
    await shot(page, '04-setup-roles-game2');
    await page.click('#start-btn');

    const g2ended = await playFullGame(page, 2);
    check('Game 2 reached end screen', g2ended);

    if (g2ended) {
      await shot(page, '05-end-screen-game2');

      const totals2 = await page.$$eval('.score-total', els => els.map(e => parseInt(e.textContent)));
      console.log(`  Totals after game 2: ${totals2.join(', ')}`);

      const sum1 = totals1.reduce((a, b) => a + b, 0);
      const sum2 = totals2.reduce((a, b) => a + b, 0);
      check('Scores accumulated across Play Again', sum2 > sum1);

      // ── Reset clears scores ──────────────────────────────────────────────
      await page.click('#reset-btn');
      await page.waitForSelector('#name-input');
      await shot(page, '06-after-reset');

      const badges = await page.$$('.player-score');
      check('Score badges gone after full reset', badges.length === 0);

      // Re-add players to confirm scores start at 0
      for (const name of ['Alice', 'Bob', 'Carol', 'Dave']) {
        await page.fill('#name-input', name);
        await page.click('#add-btn');
      }
      const badgesAfterAdd = await page.$$('.player-score');
      check('No score badges for fresh players after reset', badgesAfterAdd.length === 0);
    }
  }

  // ── JS errors ─────────────────────────────────────────────────────────────
  check('No JavaScript errors', errors.length === 0);
  if (errors.length > 0) errors.forEach(e => console.log(`    - ${e}`));

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const total  = results.length;
  console.log(`\n=== ${passed}/${total} checks passed ===\n`);

  await browser.close();
  server.kill();
  console.log('Screenshots saved to: test-screenshots/\n');

  if (passed < total) process.exit(1);
})();
