# Technical Document — Le Mot Secret
## JavaScript Implementation Specification

**Version:** 1.0
**Stack:** Vanilla HTML5 / CSS3 / JavaScript (ES6+)
**Runtime:** Browser, fully offline, no build tools required

---

## 1. Project Structure

```
wordGame/
├── index.html                  ← single HTML entry point
├── style.css                   ← all styles
├── app.js                      ← main application entry, screen router
├── state.js                    ← global game state + mutations
├── dictionary.js               ← dictionary loading + word selection
├── roles.js                    ← role assignment logic
├── voting.js                   ← vote collection + tally logic
├── victory.js                  ← win condition checks
├── screens/
│   ├── screenSetupNames.js     ← screen 1: enter player names
│   ├── screenSetupRoles.js     ← screen 2: choose imposter/MrWhite counts
│   ├── screenReveal.js         ← screen 3: private word reveal
│   ├── screenDiscussion.js     ← screen 4: play order display
│   ├── screenVote.js           ← screen 5: voting
│   ├── screenElimination.js    ← screen 6: elimination + role reveal
│   ├── screenMrWhiteGuess.js   ← screen 6b: Mr White last-chance guess
│   └── screenEnd.js            ← screen 7: end game results
└── dictionary/
    ├── index.json
    ├── 01_fruits.json
    └── ... (98 category files)
```

---

## 2. index.html

One HTML file. All screens are rendered dynamically into a single `<div id="app">`.
No page reloads. No routing library needed.

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Le Mot Secret</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app"></div>

  <script src="state.js"></script>
  <script src="dictionary.js"></script>
  <script src="roles.js"></script>
  <script src="voting.js"></script>
  <script src="victory.js"></script>
  <script src="screens/screenSetupNames.js"></script>
  <script src="screens/screenSetupRoles.js"></script>
  <script src="screens/screenReveal.js"></script>
  <script src="screens/screenDiscussion.js"></script>
  <script src="screens/screenVote.js"></script>
  <script src="screens/screenElimination.js"></script>
  <script src="screens/screenMrWhiteGuess.js"></script>
  <script src="screens/screenEnd.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

---

## 3. State — `state.js`

The single source of truth. All modules read from and write to this object.
No frameworks. Direct mutation + a `render()` call after each change.

```js
const State = {

  // --- Setup ---
  playerNames: [],          // string[] — entered during setup
  impostorCount: 1,
  mrWhiteCount: 0,

  // --- In-game ---
  players: [],
  /*
    Each player object:
    {
      name:      string,
      role:      'civilian' | 'imposter' | 'misterwhite',
      word:      string | null,   // null for misterwhite
      revealed:  boolean,         // true once they've seen their word
      eliminated: boolean
    }
  */

  wordPair: null,
  /*
    {
      word:      string,   // civilians' word
      imposter:  string,   // imposters' word
      category:  string
    }
  */

  // --- Flow ---
  phase: 'setup-names',
  /*
    Possible values:
    'setup-names'
    'setup-roles'
    'reveal'
    'discussion'
    'vote'
    'vote-runoff'
    'elimination'
    'mrwhite-guess'
    'end'
  */

  playOrder: [],            // string[] — active player names in round order
  currentRound: 0,

  // --- Voting ---
  votes: {},                // { [voterName: string]: targetName: string }
  pendingElimination: null, // string — name of player about to be eliminated

  // --- Session memory (avoid repeated pairs) ---
  usedPairs: new Set(),     // Set<string> — "word|imposter" strings

  // --- Result ---
  winner: null,
  /*
    null | 'civilians' | 'hidden' | 'misterwhite'
  */

  // --- Helpers ---
  activePlayers() {
    return this.players.filter(p => !p.eliminated);
  },
  getPlayer(name) {
    return this.players.find(p => p.name === name);
  },
  activeHiddenCount() {
    return this.activePlayers().filter(p =>
      p.role === 'imposter' || p.role === 'misterwhite'
    ).length;
  },
  activeCivilianCount() {
    return this.activePlayers().filter(p => p.role === 'civilian').length;
  },
  activeMrWhites() {
    return this.activePlayers().filter(p => p.role === 'misterwhite');
  }
};
```

---

## 4. Screen Router — `app.js`

One function `render()` reads `State.phase` and mounts the correct screen into `#app`.

```js
const app = document.getElementById('app');

function render() {
  app.innerHTML = '';           // clear current screen
  switch (State.phase) {
    case 'setup-names':    screenSetupNames(app);    break;
    case 'setup-roles':    screenSetupRoles(app);    break;
    case 'reveal':         screenReveal(app);         break;
    case 'discussion':     screenDiscussion(app);     break;
    case 'vote':           screenVote(app);           break;
    case 'vote-runoff':    screenVote(app, true);     break;
    case 'elimination':    screenElimination(app);    break;
    case 'mrwhite-guess':  screenMrWhiteGuess(app);   break;
    case 'end':            screenEnd(app);            break;
  }
}

// Transition helper — used by all screens to change phase
function goTo(phase) {
  State.phase = phase;
  render();
}

// Start the app
render();
```

---

## 5. Dictionary — `dictionary.js`

Loads word pairs from JSON files. Uses `fetch()` (works with a local HTTP server)
or falls back to `XMLHttpRequest` for `file://` protocol.

```js
const Dictionary = {

  index: null,   // parsed index.json

  // Load the index once at startup
  async loadIndex() {
    const res = await fetch('./dictionary/index.json');
    this.index = await res.json();
  },

  // Pick a random unused pair from a random category
  async getRandomPair() {
    if (!this.index) await this.loadIndex();

    // Shuffle categories and try until we find an unused pair
    const shuffled = shuffle([...this.index.categories]);

    for (const cat of shuffled) {
      const res = await fetch(`./dictionary/${cat.file}`);
      const data = await res.json();

      // Filter out already-used pairs this session
      const available = data.pairs.filter(p =>
        !State.usedPairs.has(`${p.word}|${p.imposter}`)
      );

      if (available.length > 0) {
        const pair = available[Math.floor(Math.random() * available.length)];
        State.usedPairs.add(`${pair.word}|${pair.imposter}`);
        return { ...pair, category: cat.category };
      }
    }

    // All pairs exhausted — reset session memory and retry
    State.usedPairs.clear();
    return this.getRandomPair();
  }
};

// Generic array shuffle (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

---

## 6. Role Assignment — `roles.js`

Called once at game start after word pair is loaded.

```js
const Roles = {

  assign() {
    const names = [...State.playerNames];
    shuffle(names);

    State.players = names.map((name, i) => {
      let role, word;

      if (i < State.impostorCount) {
        role = 'imposter';
        word = State.wordPair.imposter;
      } else if (i < State.impostorCount + State.mrWhiteCount) {
        role = 'misterwhite';
        word = null;
      } else {
        role = 'civilian';
        word = State.wordPair.word;
      }

      return { name, role, word, revealed: false, eliminated: false };
    });
  },

  // Generate play order for a round — first player cannot be Mr White
  generatePlayOrder() {
    const active = shuffle(State.activePlayers().map(p => p.name));

    // If first player is Mr White, swap with first non-Mr White
    const firstPlayer = State.getPlayer(active[0]);
    if (firstPlayer.role === 'misterwhite') {
      const swapIdx = active.findIndex(name =>
        State.getPlayer(name).role !== 'misterwhite'
      );
      if (swapIdx !== -1) {
        [active[0], active[swapIdx]] = [active[swapIdx], active[0]];
      }
    }

    State.playOrder = active;
  }
};
```

---

## 7. Voting — `voting.js`

Handles vote collection, tallying, tie detection, and runoff logic.

```js
const Voting = {

  // Submit a vote (called when a player taps a name on the vote screen)
  castVote(voterName, targetName) {
    State.votes[voterName] = targetName;
  },

  // Count votes and return { target: name | null, isTie: boolean, tied: string[] }
  tally(votes) {
    const counts = {};
    for (const target of Object.values(votes)) {
      counts[target] = (counts[target] || 0) + 1;
    }

    const max = Math.max(...Object.values(counts));
    const leaders = Object.keys(counts).filter(name => counts[name] === max);

    if (leaders.length === 1) {
      return { target: leaders[0], isTie: false, tied: [] };
    }
    return { target: null, isTie: true, tied: leaders };
  },

  // Check if all active players have voted
  allVoted() {
    const active = State.activePlayers();
    return active.every(p => State.votes[p.name] !== undefined);
  },

  resetVotes() {
    State.votes = {};
  }
};
```

---

## 8. Victory Check — `victory.js`

Called after every elimination.

```js
const Victory = {

  check() {
    const hiddenLeft = State.activeHiddenCount();
    const civiliansLeft = State.activeCivilianCount();

    // All hidden roles eliminated → civilians win
    if (hiddenLeft === 0) {
      State.winner = 'civilians';
      return 'civilians';
    }

    // Hidden roles >= civilians → hidden roles win
    if (hiddenLeft >= civiliansLeft) {
      State.winner = 'hidden';
      return 'hidden';
    }

    return null;  // game continues
  },

  // Called when Mr White correctly guesses the word
  mrWhiteGuessCorrect() {
    State.winner = 'misterwhite';
    return 'misterwhite';
  }
};
```

---

## 9. Screens

Each screen is a function that receives the `app` DOM element, builds HTML, attaches events.

---

### 9.1 `screenSetupNames.js`

**Purpose:** Collect player names.
**Transitions to:** `setup-roles`

```js
function screenSetupNames(container) {
  container.innerHTML = `
    <h1>Le Mot Secret</h1>
    <h2>Joueurs</h2>
    <ul id="player-list"></ul>
    <div class="input-row">
      <input id="name-input" type="text" placeholder="Nom du joueur" maxlength="20" />
      <button id="add-btn">Ajouter</button>
    </div>
    <p id="error-msg" class="error hidden"></p>
    <button id="next-btn" class="primary" disabled>Suivant →</button>
  `;

  const list     = container.querySelector('#player-list');
  const input    = container.querySelector('#name-input');
  const addBtn   = container.querySelector('#add-btn');
  const nextBtn  = container.querySelector('#next-btn');
  const errorMsg = container.querySelector('#error-msg');

  function refreshList() {
    list.innerHTML = State.playerNames.map((name, i) => `
      <li>
        <span>${name}</span>
        <button class="remove-btn" data-index="${i}">✕</button>
      </li>
    `).join('');

    // Attach remove handlers
    list.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        State.playerNames.splice(Number(btn.dataset.index), 1);
        refreshList();
      });
    });

    nextBtn.disabled = State.playerNames.length < 3;
  }

  function addPlayer() {
    const name = input.value.trim();
    if (!name) return;
    if (State.playerNames.includes(name)) {
      errorMsg.textContent = 'Ce nom existe déjà.';
      errorMsg.classList.remove('hidden');
      return;
    }
    errorMsg.classList.add('hidden');
    State.playerNames.push(name);
    input.value = '';
    refreshList();
  }

  addBtn.addEventListener('click', addPlayer);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

  nextBtn.addEventListener('click', () => {
    goTo('setup-roles');
  });

  refreshList();
}
```

---

### 9.2 `screenSetupRoles.js`

**Purpose:** Configure imposter count and Mr White count.
**Transitions to:** `reveal` (after loading word pair and assigning roles)

```js
function screenSetupRoles(container) {
  const n = State.playerNames.length;

  container.innerHTML = `
    <h2>Configuration des rôles</h2>
    <p>${n} joueurs</p>

    <label>Imposteurs : <span id="imp-val">${State.impostorCount}</span></label>
    <div class="counter-row">
      <button id="imp-down">−</button>
      <button id="imp-up">+</button>
    </div>

    <label>Monsieur Blanc : <span id="mw-val">${State.mrWhiteCount}</span></label>
    <div class="counter-row">
      <button id="mw-down">−</button>
      <button id="mw-up">+</button>
    </div>

    <p id="role-error" class="error hidden"></p>
    <p id="role-summary"></p>

    <button id="start-btn" class="primary">Commencer</button>
    <button id="back-btn">← Retour</button>
  `;

  const impVal   = container.querySelector('#imp-val');
  const mwVal    = container.querySelector('#mw-val');
  const summary  = container.querySelector('#role-summary');
  const errorMsg = container.querySelector('#role-error');
  const startBtn = container.querySelector('#start-btn');

  function validate() {
    const imp = State.impostorCount;
    const mw  = State.mrWhiteCount;
    const civilians = n - imp - mw;
    const hidden    = imp + mw;

    const valid = civilians > 0 && hidden < civilians && imp >= 1;

    errorMsg.classList.toggle('hidden', valid);
    if (!valid) {
      errorMsg.textContent =
        'Configuration invalide : les civils doivent être plus nombreux que les rôles cachés.';
    }

    summary.textContent =
      `${civilians} civil(s) · ${imp} imposteur(s) · ${mw} M. Blanc`;

    startBtn.disabled = !valid;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  container.querySelector('#imp-up').addEventListener('click', () => {
    State.impostorCount = clamp(State.impostorCount + 1, 1, Math.floor(n / 3));
    impVal.textContent = State.impostorCount;
    validate();
  });
  container.querySelector('#imp-down').addEventListener('click', () => {
    State.impostorCount = clamp(State.impostorCount - 1, 1, Math.floor(n / 3));
    impVal.textContent = State.impostorCount;
    validate();
  });
  container.querySelector('#mw-up').addEventListener('click', () => {
    State.mrWhiteCount = clamp(State.mrWhiteCount + 1, 0, Math.floor(n / 4));
    mwVal.textContent = State.mrWhiteCount;
    validate();
  });
  container.querySelector('#mw-down').addEventListener('click', () => {
    State.mrWhiteCount = clamp(State.mrWhiteCount - 1, 0, Math.floor(n / 4));
    mwVal.textContent = State.mrWhiteCount;
    validate();
  });

  container.querySelector('#back-btn').addEventListener('click', () => goTo('setup-names'));

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Chargement...';

    State.wordPair = await Dictionary.getRandomPair();
    Roles.assign();
    Roles.generatePlayOrder();
    State.currentRound = 1;
    Voting.resetVotes();

    goTo('reveal');
  });

  validate();
}
```

---

### 9.3 `screenReveal.js`

**Purpose:** Each player privately views their word on the shared screen.
**Transitions to:** `discussion`

```js
function screenReveal(container) {
  // Find first player who hasn't revealed yet
  const pending = State.players.filter(p => !p.revealed);

  if (pending.length === 0) {
    // All players have seen their word
    goTo('discussion');
    return;
  }

  // "Pass the device" neutral screen shown BETWEEN reveals
  // We show it only after at least one reveal has happened
  const alreadyRevealed = State.players.some(p => p.revealed);

  if (alreadyRevealed) {
    // Neutral handoff screen
    container.innerHTML = `
      <div class="handoff-screen">
        <h2>Passez l'écran au prochain joueur</h2>
        <p class="subtle">Ne regardez pas !</p>
        <button id="ready-btn" class="primary">Prêt →</button>
      </div>
    `;
    container.querySelector('#ready-btn').addEventListener('click', () => render());
    return;
  }

  // Show list of players who still need to see their word
  container.innerHTML = `
    <h2>Découvrez votre mot</h2>
    <p>Appuyez sur votre nom pour voir votre mot en privé.</p>
    <ul class="player-cards" id="player-cards"></ul>
  `;

  const cardList = container.querySelector('#player-cards');
  cardList.innerHTML = pending.map(p => `
    <li>
      <button class="player-card" data-name="${p.name}">${p.name}</button>
    </li>
  `).join('');

  cardList.querySelectorAll('.player-card').forEach(btn => {
    btn.addEventListener('click', () => showWordFor(btn.dataset.name));
  });

  function showWordFor(name) {
    const player = State.getPlayer(name);
    container.innerHTML = `
      <div class="private-reveal">
        <h2>${player.name}</h2>
        ${player.role === 'misterwhite'
          ? `<p class="no-word">Vous n'avez pas de mot.</p>
             <p class="role-hint">Rôle : Monsieur Blanc</p>`
          : `<p class="secret-word">${player.word}</p>`
        }
        <button id="memorized-btn" class="primary">J'ai mémorisé ✓</button>
      </div>
    `;

    container.querySelector('#memorized-btn').addEventListener('click', () => {
      player.revealed = true;
      render();   // re-render this screen → will show handoff or next player
    });
  }
}
```

---

### 9.4 `screenDiscussion.js`

**Purpose:** Show the round number and play order to all players.
**Transitions to:** `vote`

```js
function screenDiscussion(container) {
  container.innerHTML = `
    <h2>Round ${State.currentRound}</h2>
    <p>Ordre de jeu (chacun donne un indice sur son mot) :</p>
    <ol id="play-order"></ol>
    <p class="subtle">Discutez, puis passez au vote.</p>
    <button id="vote-btn" class="primary">Voter →</button>
  `;

  const ol = container.querySelector('#play-order');
  ol.innerHTML = State.playOrder.map(name => `<li>${name}</li>`).join('');

  container.querySelector('#vote-btn').addEventListener('click', () => {
    Voting.resetVotes();
    goTo('vote');
  });
}
```

---

### 9.5 `screenVote.js`

**Purpose:** Each active player votes to eliminate someone.
Handles both normal vote and runoff vote (same screen, `isRunoff` flag).
**Transitions to:** `elimination` or back to `discussion` (no elimination on double tie)

```js
function screenVote(container, isRunoff = false) {
  // In runoff mode, only show tied players as targets
  const candidates = isRunoff
    ? State.activePlayers().filter(p => State.tiedNames.includes(p.name))
    : State.activePlayers();

  const voters = State.activePlayers();

  container.innerHTML = `
    <h2>${isRunoff ? 'Égalité ! Re-vote' : 'Vote'}</h2>
    <p>Chaque joueur vote pour éliminer quelqu'un.</p>
    <div id="voter-list"></div>
    <p id="vote-status"></p>
    <button id="confirm-btn" class="primary" disabled>Confirmer les votes →</button>
  `;

  const voterList  = container.querySelector('#voter-list');
  const status     = container.querySelector('#vote-status');
  const confirmBtn = container.querySelector('#confirm-btn');

  // Build one selector per voter
  voterList.innerHTML = voters.map(voter => `
    <div class="vote-row" id="voter-${voter.name}">
      <strong>${voter.name}</strong> vote contre :
      <div class="vote-targets">
        ${candidates
          .filter(c => c.name !== voter.name)   // can't vote for yourself
          .map(c => `
            <button class="vote-target"
                    data-voter="${voter.name}"
                    data-target="${c.name}">
              ${c.name}
            </button>
          `).join('')}
      </div>
    </div>
  `).join('');

  voterList.querySelectorAll('.vote-target').forEach(btn => {
    btn.addEventListener('click', () => {
      const { voter, target } = btn.dataset;

      // Deselect previous choice for this voter
      voterList.querySelectorAll(
        `.vote-target[data-voter="${voter}"]`
      ).forEach(b => b.classList.remove('selected'));

      // Select new
      btn.classList.add('selected');
      Voting.castVote(voter, target);

      // Update status
      const votedCount = Object.keys(State.votes).length;
      status.textContent = `${votedCount} / ${voters.length} votes`;
      confirmBtn.disabled = !Voting.allVoted();
    });
  });

  confirmBtn.addEventListener('click', () => {
    const result = Voting.tally(State.votes);

    if (!result.isTie) {
      // Clear winner of vote
      State.pendingElimination = result.target;
      goTo('elimination');

    } else {
      // Tie — check if it's already a runoff
      if (isRunoff) {
        // Double tie → no elimination this round
        State.pendingElimination = null;
        proceedToNextRound();
      } else {
        // First tie → start runoff
        State.tiedNames = result.tied;
        Voting.resetVotes();
        goTo('vote-runoff');
      }
    }
  });
}

function proceedToNextRound() {
  State.currentRound++;
  Roles.generatePlayOrder();
  Voting.resetVotes();
  goTo('discussion');
}
```

---

### 9.6 `screenElimination.js`

**Purpose:** Reveal the eliminated player's role. Trigger Mr White guess if needed. Check victory.
**Transitions to:** `mrwhite-guess`, `end`, or `discussion`

```js
function screenElimination(container) {
  const name = State.pendingElimination;

  if (!name) {
    // No elimination (double tie) — go to next round
    proceedToNextRound();
    return;
  }

  const player = State.getPlayer(name);

  // Special case: Mr White gets a guess before elimination
  if (player.role === 'misterwhite') {
    goTo('mrwhite-guess');
    return;
  }

  // Normal elimination
  player.eliminated = true;

  const roleLabels = {
    civilian:    'Civil',
    imposter:    'Imposteur',
    misterwhite: 'Monsieur Blanc'
  };

  container.innerHTML = `
    <div class="elimination-screen">
      <h2>${name} est éliminé(e) !</h2>
      <p class="role-reveal">Rôle : <strong>${roleLabels[player.role]}</strong></p>
      ${player.role === 'imposter'
        ? `<p class="word-reveal">Son mot était : <strong>${player.word}</strong></p>`
        : ''
      }
      <button id="continue-btn" class="primary">Continuer →</button>
    </div>
  `;

  container.querySelector('#continue-btn').addEventListener('click', () => {
    const result = Victory.check();
    if (result) {
      goTo('end');
    } else {
      proceedToNextRound();
    }
  });
}
```

---

### 9.7 `screenMrWhiteGuess.js`

**Purpose:** Give Mister White one chance to guess the civilians' word.
**Transitions to:** `end` (if correct) or `elimination` re-render (if wrong)

```js
function screenMrWhiteGuess(container) {
  const player = State.getPlayer(State.pendingElimination);

  container.innerHTML = `
    <div class="mrwhite-screen">
      <h2>${player.name} est Monsieur Blanc !</h2>
      <p>Dernière chance : devinez le mot des civils.</p>
      <input id="guess-input" type="text" placeholder="Votre mot..." />
      <button id="guess-btn" class="primary">Valider</button>
      <p id="guess-error" class="error hidden"></p>
    </div>
  `;

  const input    = container.querySelector('#guess-input');
  const guessBtn = container.querySelector('#guess-btn');
  const errorMsg = container.querySelector('#guess-error');

  guessBtn.addEventListener('click', () => {
    const guess = input.value.trim().toLowerCase();
    const correct = State.wordPair.word.toLowerCase();

    if (!guess) return;

    if (guess === correct) {
      Victory.mrWhiteGuessCorrect();
      goTo('end');
    } else {
      errorMsg.textContent = 'Mauvaise réponse. Monsieur Blanc est éliminé.';
      errorMsg.classList.remove('hidden');
      guessBtn.disabled = true;

      setTimeout(() => {
        // Proceed with elimination normally
        player.eliminated = true;
        const result = Victory.check();
        if (result) {
          goTo('end');
        } else {
          proceedToNextRound();
        }
      }, 2000);
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') guessBtn.click();
  });
}
```

---

### 9.8 `screenEnd.js`

**Purpose:** Display the result, reveal all roles and the word pair.
**Transitions to:** `setup-names` (Play Again, keeping names) or full reset

```js
function screenEnd(container) {
  const winnerMessages = {
    civilians:   '🎉 Les Civils ont gagné !',
    hidden:      '🕵️ Les rôles cachés ont gagné !',
    misterwhite: '🤍 Monsieur Blanc a deviné le mot — victoire solo !'
  };

  const roleLabels = {
    civilian:    'Civil',
    imposter:    'Imposteur',
    misterwhite: 'Monsieur Blanc'
  };

  container.innerHTML = `
    <div class="end-screen">
      <h2>${winnerMessages[State.winner]}</h2>

      <div class="word-reveal-box">
        <p>Le mot des civils : <strong>${State.wordPair.word}</strong></p>
        <p>Le mot des imposteurs : <strong>${State.wordPair.imposter}</strong></p>
        <p class="subtle">Catégorie : ${State.wordPair.category}</p>
      </div>

      <h3>Rôles</h3>
      <ul class="role-list">
        ${State.players.map(p => `
          <li class="role-item role-${p.role}">
            <span class="role-name">${p.name}</span>
            <span class="role-label">${roleLabels[p.role]}</span>
            ${p.word ? `<span class="role-word">(${p.word})</span>` : ''}
          </li>
        `).join('')}
      </ul>

      <button id="play-again-btn" class="primary">Rejouer (mêmes joueurs)</button>
      <button id="reset-btn">Recommencer depuis le début</button>
    </div>
  `;

  container.querySelector('#play-again-btn').addEventListener('click', () => {
    // Keep playerNames, reset everything else
    State.players        = [];
    State.wordPair       = null;
    State.phase          = 'setup-roles';
    State.playOrder      = [];
    State.currentRound   = 0;
    State.votes          = {};
    State.pendingElimination = null;
    State.winner         = null;
    State.impostorCount  = 1;
    State.mrWhiteCount   = 0;
    render();
  });

  container.querySelector('#reset-btn').addEventListener('click', () => {
    State.playerNames    = [];
    State.players        = [];
    State.wordPair       = null;
    State.phase          = 'setup-names';
    State.playOrder      = [];
    State.currentRound   = 0;
    State.votes          = {};
    State.pendingElimination = null;
    State.winner         = null;
    State.impostorCount  = 1;
    State.mrWhiteCount   = 0;
    render();
  });
}
```

---

## 10. CSS Architecture — `style.css`

### Reset and base

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', sans-serif;
  background: #1a1a2e;
  color: #eee;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

#app {
  width: 100%;
  max-width: 480px;
  padding: 24px 16px;
  min-height: 100vh;
}
```

### Buttons

```css
button {
  cursor: pointer;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 1rem;
  transition: opacity 0.15s;
}

button:disabled { opacity: 0.4; cursor: default; }

button.primary {
  background: #e94560;
  color: white;
  font-weight: bold;
  width: 100%;
  padding: 14px;
  margin-top: 16px;
}
```

### Player cards (reveal screen)

```css
.player-card {
  background: #16213e;
  color: #eee;
  width: 100%;
  padding: 18px;
  margin: 8px 0;
  border-radius: 12px;
  font-size: 1.2rem;
  text-align: center;
}

.player-card:active { background: #0f3460; }
```

### Private reveal

```css
.private-reveal {
  text-align: center;
  padding: 40px 20px;
}

.secret-word {
  font-size: 3rem;
  font-weight: bold;
  color: #e94560;
  margin: 32px 0;
  letter-spacing: 2px;
}

.no-word {
  font-size: 1.5rem;
  color: #aaa;
  margin: 32px 0;
  font-style: italic;
}
```

### Vote targets

```css
.vote-targets { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 16px; }

.vote-target {
  background: #16213e;
  color: #eee;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.vote-target.selected { background: #e94560; color: white; }
```

### Role colors (end screen)

```css
.role-item { display: flex; gap: 12px; padding: 10px; border-radius: 8px; margin: 4px 0; }
.role-civilian    { background: #0f3460; }
.role-imposter    { background: #6b1a1a; }
.role-misterwhite { background: #2d2d2d; }
```

### Error message

```css
.error { color: #e94560; font-size: 0.9rem; margin-top: 8px; }
.hidden { display: none; }
.subtle { color: #888; font-size: 0.85rem; }
```

---

## 11. Data Flow Summary

```
User action
    │
    ▼
Screen function (reads State, builds DOM, attaches events)
    │
    ▼
Event handler (mutates State directly)
    │
    ▼
goTo(newPhase)  ──→  State.phase = newPhase  ──→  render()
    │
    ▼
render() clears #app, calls correct screen function
```

---

## 12. Running the Game

### Option A — Simple local server (recommended)
```bash
# Python 3
cd /home/houssam/wordGame
python3 -m http.server 8080

# then open in browser:
# http://localhost:8080
```

### Option B — Node.js
```bash
npx serve .
```

### Option C — VS Code Live Server extension
Right-click `index.html` → "Open with Live Server"

> **Why not `file://`?** The `fetch()` calls for dictionary JSON files are blocked by browsers on `file://` due to CORS policy. A local HTTP server is required.

---

## 13. Implementation Order (Recommended)

Build in this order so you can test each layer incrementally:

1. `index.html` + `style.css` skeleton
2. `state.js` — global state object
3. `app.js` — `render()` + `goTo()` router
4. `screenSetupNames.js` — name entry works
5. `dictionary.js` — load and log a word pair to console
6. `roles.js` — assign roles, log to console
7. `screenSetupRoles.js` — role config + triggers dictionary + role assignment
8. `screenReveal.js` — private reveal flow
9. `screenDiscussion.js` — simple order display
10. `voting.js` + `screenVote.js` — voting works
11. `victory.js` + `screenElimination.js` — elimination + win check
12. `screenMrWhiteGuess.js` — Mr White guess
13. `screenEnd.js` — results screen
14. Polish CSS
