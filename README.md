# Langue de Bois

A French pass-the-phone party game for 3+ players. Each round, players receive a secret word — but one player (the **Imposteur**) gets a different, related word, and an optional **Monsieur Blanc** gets no word at all. Players discuss, then vote to eliminate who they think is the impostor.

## Roles

| Role | Receives | Goal |
|------|----------|------|
| **Civil** | The main word | Identify and eliminate all hidden roles |
| **Imposteur** | A related but different word | Blend in, avoid being voted out |
| **Monsieur Blanc** | Nothing | Deduce the word from discussion; if voted out, one guess wins it all |

## Win Conditions

- **Civils** win when all hidden roles are eliminated.
- **Rôles cachés** win when hidden roles ≥ remaining civilians.
- **Monsieur Blanc** wins solo by guessing the civilians' word correctly when eliminated.

Ties go to a runoff vote. A double tie means no elimination that round.

## Running

The game uses `fetch()` to load the dictionary, so it must be served over HTTP:

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

No build step, no framework, no package manager required to play.

## Dictionary

~5000 French word pairs across 98 categories (food, animals, geography, sports, etc.), stored in `dictionary/`. Each category file follows this schema:

```json
{
  "id": "string",
  "category": "string",
  "pairs": [
    { "word": "string", "imposter": "string" }
  ]
}
```

`dictionary/index.json` lists all category files. Already-used pairs are tracked within a session to avoid repetition.

## Project Structure

```
index.html           # Entry point
style.css            # Dark theme UI
state.js             # Global State object (single source of truth)
dictionary.js        # Dictionary loader + Fisher-Yates shuffle
roles.js             # Role assignment + play order generation
voting.js            # Vote casting and tallying
victory.js           # Win condition checks
app.js               # Router: render() and goTo()
screens/             # One file per game phase
dictionary/          # JSON word pair files
```

## Tests

```bash
npm install
node test-game.js
```

Runs a headless Playwright browser through two full games, checking game flow, scoring, resets, and that the vote screen lists players in randomized order (not role-assignment order).
