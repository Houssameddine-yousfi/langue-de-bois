# Game Design Document — Le Mot Secret (Word Imposter Game)

**Version:** 1.0
**Platform:** Browser (JavaScript, offline single-screen)
**Language:** French

---

## 1. Overview

**Le Mot Secret** is a social deduction party game played on a single shared screen.
Each round, all players receive a secret word — except the **Imposters** (who get a *different but related* word) and **Mister White** (who gets *no word at all*).

Players discuss, try to expose each other without revealing their own word, then vote to eliminate someone. The Civilians try to eliminate all hidden roles; the hidden roles try to survive until the end.

---

## 2. Roles

### 2.1 Civilian
- Receives the **main word** (same as all other civilians).
- Goal: identify and eliminate all Imposters and Mister Whites before they are outnumbered.

### 2.2 Imposter
- Receives a **different but related word** (e.g. civilians get *yaourt*, imposter gets *glace*).
- The imposter knows they have a different word, but not what the civilians' word is.
- Goal: blend in, avoid suspicion, survive until civilians can no longer win.

### 2.3 Mister White
- Receives **no word at all**.
- Must listen to descriptions during discussion and deduce the civilians' word.
- Goal: survive by blending in as a civilian.
- **Special rule — Last chance:** When Mister White is voted out and eliminated, before being confirmed eliminated they get **one attempt to guess the civilians' word**. If correct, Mister White wins immediately (solo victory). If wrong, they are eliminated normally.

---

## 3. Game Setup

### 3.1 Player Registration
1. A setup screen is shown.
2. Players enter their names one by one (minimum 3 players recommended).
3. Names are listed on screen; a player can be removed if added by mistake.

### 3.2 Role Configuration
After entering all names, the host configures:

| Setting | Options |
|---|---|
| Number of Imposters | 1 to N (cannot exceed ⌊players/3⌋) |
| Number of Mister Whites | 0 to N (cannot exceed ⌊players/4⌋) |

> **Validation rule:** The number of hidden roles (Imposters + Mister Whites) must always be strictly less than the number of Civilians. The UI should enforce this and warn if the configuration is invalid.

### 3.3 Word Selection
- The game randomly picks a **word pair** from the dictionary (`word` / `imposter`).
- Civilians all receive `word`.
- Imposters all receive `imposter`.
- Mister Whites receive nothing.

---

## 4. Word Reveal Phase (Party Mode)

Because the game is played on a **single shared screen**, word reveal must be private:

1. All player names are displayed as cards on screen (face down / blurred).
2. The screen shows: **"Each player, tap your name to see your word."**
3. A player taps their name → the screen switches to a **private view** showing only their name and their word (or "Vous n'avez pas de mot." for Mister White).
4. After a few seconds (or when the player taps "J'ai mémorisé"), the screen returns to the list.
5. Repeat until all players have seen their word.
6. Once all players have confirmed, the game moves to the Play phase.

> **Privacy note:** Between each reveal, a neutral "pass the phone" screen is shown so no one can peek at another player's word.

---

## 5. Play Phase

### 5.1 Turn Order
- At the start of each round, a **random play order** is generated.
- **The first player in the order can never be Mister White** (because Mister White has no word and would have nothing to describe — this would immediately reveal them).
- The order is displayed to all players.

### 5.2 Discussion Round
Players speak in the established order. Each player gives **one clue or description** related to their word without saying it directly.

**Rules for descriptions:**
- You may not say your word or the imposter word directly.
- You may not use a word that is an obvious synonym of your word.
- Descriptions should be short (one sentence or a few words).

> The game does not enforce these rules electronically — players police each other.

### 5.3 Voting
After all active players have spoken:
1. A **voting screen** is displayed.
2. Each player votes for who they think is an Imposter or Mister White.
3. Votes are cast simultaneously (all tap their chosen player's name).
4. The player with the **most votes** is eliminated.
5. In case of a **tie**, the tied players are put to a **runoff vote** (only tied players can be voted for).
6. If still tied after runoff, **no one is eliminated** this round (the round ends with no elimination).

### 5.4 Elimination
When a player is eliminated:
- Their role is revealed to all players.
- **Special case — Mister White:** before the role is revealed, Mister White gets one chance to guess the civilians' word (see Section 2.3).
- The eliminated player is removed from the active player list.
- The game checks victory conditions (see Section 6).

### 5.5 Next Round
If no victory condition is met:
- A new random play order is generated for remaining players.
- The same rule applies: first player cannot be Mister White.
- The discussion and voting repeat.

---

## 6. Victory Conditions

The game checks for a winner **after each elimination**.

### 6.1 Civilians Win
> All Imposters **and** all Mister Whites have been eliminated.

All remaining players are Civilians. The civilians win collectively. The word pair is revealed.

### 6.2 Imposters & Mister White Win (Hidden roles win)
> The number of remaining hidden roles (Imposters + Mister Whites) is **equal to or greater than** the number of remaining Civilians.

At this point, hidden roles can control the votes and civilians can no longer win. Hidden roles win collectively.

### 6.3 Mister White Solo Win
> Mister White is voted out but **correctly guesses** the civilians' secret word.

Mister White wins alone (other Imposters do not win with them).

---

## 7. Scoring System

Scores accumulate across games as long as the same players stay in the session ("Rejouer — mêmes joueurs"). Scores reset when "Recommencer depuis le début" is pressed.

### Points per game

| Outcome | Condition | Points |
|---|---|---|
| Civilians win | Civilian, alive at end | **+2** |
| Civilians win | Civilian, eliminated | **+1** |
| Hidden roles win | Imposter or Mister White, alive at end | **+2** |
| Hidden roles win | Imposter or Mister White, eliminated | **+1** |
| Mister White solo win | Mister White | **+3** |
| Any outcome | Player on losing side | **0** |

### Display

- **End screen:** a results table showing each player's role, points earned this game, and running total — sorted by total score descending.
- **Player setup screen:** each player's running total is shown next to their name once at least one game has been played.

---

## 8. End Screen

After the game ends, the screen displays:
- Who won (Civilians / Hidden Roles / Mister White solo)
- The **word pair** that was played (`word` vs `imposter`)
- The role of each player
- A "Play Again" button that returns to the Setup screen (keeping the same player list)

---

## 9. Dictionary

Words are loaded from the JSON dictionary at `/dictionary/`.

- **98 categories**, ~5 000 pairs available.
- Each pair has a `word` (civilians' word) and an `imposter` (imposter's word).
- At the start of each game, one pair is selected **at random** from a randomly chosen category.
- Previously played pairs within a session can be tracked to avoid repetition.

**Pair format:**
```json
{ "word": "yaourt", "imposter": "glace" }
```

---

## 10. Screen Flow

```
[Setup: Enter player names]
        ↓
[Setup: Choose roles (imposters / Mr White count)]
        ↓
[Word Reveal: each player taps their name privately]
        ↓
[Play: Discussion round (random order)]
        ↓
[Play: Voting]
        ↓
[Elimination + role reveal]
        ↓
[Victory check]
   ↙           ↘
[End screen]  [Next round → Discussion]
```

---

## 11. Technical Notes (JavaScript Implementation)

### State to track
```js
{
  players: [
    { name: string, role: "civilian" | "imposter" | "misterwhite", word: string | null, eliminated: boolean }
  ],
  wordPair: { word: string, imposter: string, category: string },
  phase: "setup" | "reveal" | "discussion" | "vote" | "elimination" | "end",
  playOrder: string[],          // player names in current round order
  currentRound: number,
  votes: { [voterName]: targetName },
  winner: null | "civilians" | "hidden" | "misterwhite"
}
```

### Dictionary loading
- Fetch `index.json` to get the category list.
- Pick a random category, fetch its file.
- Pick a random pair from the `pairs` array.

### Randomization rules
- Role assignment: shuffle the player array, assign roles in order.
- Play order: shuffle active players, then check if first is Mister White → if yes, swap with the next non-Mister-White player.

### Offline support
- All files are local (no server needed).
- Can be run via `file://` protocol or a simple local HTTP server.
- No external dependencies required (pure HTML/CSS/JS).

---

## 12. Recommended Minimum Player Counts

| Players | Max Imposters | Max Mr Whites |
|---|---|---|
| 3 | 1 | 0 |
| 4 | 1 | 1 |
| 5–6 | 2 | 1 |
| 7–9 | 2–3 | 1–2 |
| 10+ | 3+ | 2+ |

---

## 13. Future Enhancements (Out of scope for v1)

- Timer per player during discussion
- Category filtering (e.g. exclude adult categories)
- Score tracking across multiple rounds
- Custom word pairs added by players
- Animated transitions between screens
- Sound effects
- QR code / local network multiplayer (each player uses their own phone)
