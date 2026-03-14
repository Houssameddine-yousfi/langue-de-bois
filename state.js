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
  tiedNames: [],            // string[] — names involved in a tie (for runoff)
  pendingElimination: null, // string — name of player about to be eliminated

  // --- Session memory (avoid repeated pairs) ---
  usedPairs: new Set(),     // Set<string> — "word|imposter" strings

  // --- Scores (persist across Play Again) ---
  scores: {},               // { [playerName: string]: number }

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
