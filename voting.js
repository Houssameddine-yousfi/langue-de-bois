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
