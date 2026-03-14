# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

Because the game uses `fetch()` to load dictionary files, it must be served over HTTP — opening `index.html` directly via `file://` will not work.

```bash
cd /home/houssam/wordGame
python3 -m http.server 8080
# Then open http://localhost:8080
```

There are no build steps, no package manager, no transpilation, and no test suite. All code is plain HTML/CSS/ES6+.

## Architecture

The game is a **single-screen, pass-the-phone party game** with a vanilla JS architecture. There is no framework. All state lives in a single global object.

### Module loading order (index.html)

Script tags must appear in this exact order — later files depend on globals defined earlier:

1. `state.js` — global `State` object
2. `dictionary.js` — global `Dictionary` object + `shuffle()` utility
3. `roles.js` — global `Roles` object
4. `voting.js` — global `Voting` object
5. `victory.js` — global `Victory` object
6. `screens/screenSetupNames.js`
7. `screens/screenSetupRoles.js`
8. `screens/screenReveal.js`
9. `screens/screenDiscussion.js`
10. `screens/screenVote.js` — **also defines `proceedToNextRound()` (global)**, used by the next two screens
11. `screens/screenElimination.js`
12. `screens/screenMrWhiteGuess.js`
13. `screens/screenEnd.js`
14. `app.js` — defines `render()` and `goTo()`, must load last

### Routing

`app.js` owns routing. Every screen transition calls `goTo(phase)`, which sets `State.phase` and calls `render()`. `render()` clears `#app` and delegates to the matching screen function based on `State.phase`.

Possible phase values: `setup-names`, `setup-roles`, `reveal`, `discussion`, `vote`, `vote-runoff`, `elimination`, `mrwhite-guess`, `end`.

### State

`State` (state.js) is the single source of truth. Key fields:
- `playerNames` / `players[]` — setup names vs in-game player objects
- `wordPair` — `{ word, imposter, category }` used for the current round
- `votes` — `{ [voterName]: targetName }`
- `pendingElimination` — name of the player about to be eliminated
- `tiedNames[]` — used for runoff vote
- `usedPairs` — `Set<string>` of `"word|imposter"` keys, persists across rounds to avoid repetition
- `winner` — `null | 'civilians' | 'hidden' | 'misterwhite'`

### Dictionary

`Dictionary.getRandomPair()` fetches `index.json` once, then picks a random category file and a random pair, skipping any already in `State.usedPairs`. When all pairs are exhausted it resets and retries.

### Screens

Each screen is a function `screenXxx(container)` that imperatively writes HTML into the container and attaches event listeners. Screens do not return values. Transitions are done by calling `goTo()`.

`screenVote.js` accepts a second argument (`isRunoff = false`) and is reused for both normal voting and runoff voting.

## Dictionary Format

Each category file follows this schema:
```json
{
  "id": "string",
  "category": "string",
  "pairs": [
    { "word": "string", "imposter": "string" }
  ]
}
```

`index.json` lists all categories with their filenames and total pair counts. Files are numbered `01`–`100` (some numbers are unused). All content is in French.

## Game Rules Summary

- **Civilian**: receives the main word; goal is to eliminate all hidden roles.
- **Imposter**: receives a related-but-different word; blends in.
- **Mister White**: receives no word; must deduce it from discussion. When voted out, gets one guess at the civilians' word — a correct guess is an instant solo win.
- **Hidden win**: when hidden roles ≥ remaining civilians.
- **Tie**: goes to runoff; double tie → no elimination that round.
- The first player in the discussion order can never be Mister White (enforced in `Roles.generatePlayOrder()`).
