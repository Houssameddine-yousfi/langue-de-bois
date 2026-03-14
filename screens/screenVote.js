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
    <p id="vote-status" class="subtle"></p>
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
