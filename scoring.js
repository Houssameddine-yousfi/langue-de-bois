const Scoring = {

  // Award points for the finished game.
  // Returns { [playerName]: pointsEarned } for display on the end screen.
  award() {
    const earned = {};

    for (const p of State.players) {
      if (!(p.name in State.scores)) State.scores[p.name] = 0;
      earned[p.name] = Scoring._pointsFor(p);
      State.scores[p.name] += earned[p.name];
    }

    return earned;
  },

  _pointsFor(player) {
    const winner = State.winner;

    if (winner === 'misterwhite') {
      return player.role === 'misterwhite' ? 3 : 0;
    }
    if (winner === 'civilians') {
      if (player.role !== 'civilian') return 0;
      return player.eliminated ? 1 : 2;
    }
    if (winner === 'hidden') {
      if (player.role === 'civilian') return 0;
      return player.eliminated ? 1 : 2;
    }
    return 0;
  }
};
