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
