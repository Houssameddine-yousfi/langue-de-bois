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
