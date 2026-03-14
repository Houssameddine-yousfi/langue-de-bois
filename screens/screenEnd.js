function screenEnd(container) {
  const earned = Scoring.award();

  const winnerMessages = {
    civilians:   'Les Civils ont gagné !',
    hidden:      'Les rôles cachés ont gagné !',
    misterwhite: 'Monsieur Blanc a deviné le mot — victoire solo !'
  };

  const winnerIcons = {
    civilians:   '🎉',
    hidden:      '🕵️',
    misterwhite: '🤍'
  };

  const roleLabels = {
    civilian:    'Civil',
    imposter:    'Imposteur',
    misterwhite: 'Monsieur Blanc'
  };

  // Sort players by total score descending for the results table
  const sorted = [...State.players].sort(
    (a, b) => State.scores[b.name] - State.scores[a.name]
  );

  container.innerHTML = `
    <div class="end-screen">
      <div class="winner-banner">
        <div class="winner-icon">${winnerIcons[State.winner]}</div>
        <h2>${winnerMessages[State.winner]}</h2>
      </div>

      <div class="word-reveal-box">
        <p>Le mot des civils : <strong>${State.wordPair.word}</strong></p>
        <p>Le mot des imposteurs : <strong>${State.wordPair.imposter}</strong></p>
        <p class="subtle">Catégorie : ${State.wordPair.category}</p>
      </div>

      <h3>Résultats</h3>
      <div class="score-table">
        ${sorted.map(p => `
          <div class="score-row role-${p.role}">
            <span class="score-name">${p.name}${p.eliminated ? ' <span class="eliminated-mark">✗</span>' : ''}</span>
            <span class="score-role">${roleLabels[p.role]}</span>
            <span class="score-earned ${earned[p.name] > 0 ? '' : 'score-zero'}">+${earned[p.name]}</span>
            <span class="score-total">${State.scores[p.name]} pts</span>
          </div>
        `).join('')}
      </div>

      <button id="play-again-btn" class="primary">Rejouer (mêmes joueurs)</button>
      <button id="reset-btn" class="secondary">Recommencer depuis le début</button>
    </div>
  `;

  container.querySelector('#play-again-btn').addEventListener('click', () => {
    State.players        = [];
    State.wordPair       = null;
    State.phase          = 'setup-roles';
    State.playOrder      = [];
    State.currentRound   = 0;
    State.votes          = {};
    State.tiedNames      = [];
    State.pendingElimination = null;
    State.winner         = null;
    State.impostorCount  = 1;
    State.mrWhiteCount   = 0;
    render();
  });

  container.querySelector('#reset-btn').addEventListener('click', () => {
    State.playerNames    = [];
    State.players        = [];
    State.wordPair       = null;
    State.phase          = 'setup-names';
    State.playOrder      = [];
    State.currentRound   = 0;
    State.votes          = {};
    State.tiedNames      = [];
    State.pendingElimination = null;
    State.winner         = null;
    State.impostorCount  = 1;
    State.mrWhiteCount   = 0;
    State.scores         = {};
    render();
  });
}
