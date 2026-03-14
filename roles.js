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
    if (firstPlayer && firstPlayer.role === 'misterwhite') {
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
