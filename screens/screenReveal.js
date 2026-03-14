// Module-level flag: true means show handoff screen on next render
let _revealShowHandoff = false;

function screenReveal(container) {
  // Find first player who hasn't revealed yet
  const pending = State.players.filter(p => !p.revealed);

  if (pending.length === 0) {
    // All players have seen their word
    _revealShowHandoff = false;
    goTo('discussion');
    return;
  }

  // Show handoff screen only when flag is set (right after a reveal)
  if (_revealShowHandoff) {
    _revealShowHandoff = false; // reset so next render shows player list
    container.innerHTML = `
      <div class="handoff-screen">
        <h2>Passez l'écran au prochain joueur</h2>
        <p class="subtle">Ne regardez pas !</p>
        <button id="ready-btn" class="primary">Prêt →</button>
      </div>
    `;
    container.querySelector('#ready-btn').addEventListener('click', () => render());
    return;
  }

  // Show list of players who still need to see their word
  container.innerHTML = `
    <h2>Découvrez votre mot</h2>
    <p class="subtle">Appuyez sur votre nom pour voir votre mot en privé.</p>
    <ul class="player-cards" id="player-cards"></ul>
  `;

  const cardList = container.querySelector('#player-cards');
  cardList.innerHTML = pending.map(p => `
    <li>
      <button class="player-card" data-name="${p.name}">${p.name}</button>
    </li>
  `).join('');

  cardList.querySelectorAll('.player-card').forEach(btn => {
    btn.addEventListener('click', () => showWordFor(btn.dataset.name));
  });

  function showWordFor(name) {
    const player = State.getPlayer(name);
    container.innerHTML = `
      <div class="private-reveal">
        <h2>${player.name}</h2>
        ${player.role === 'misterwhite'
          ? `<p class="no-word">Vous n'avez pas de mot.</p>
             <p class="role-hint">Rôle : Monsieur Blanc</p>`
          : `<p class="secret-word">${player.word}</p>`
        }
        <button id="memorized-btn" class="primary">J'ai mémorisé ✓</button>
      </div>
    `;

    container.querySelector('#memorized-btn').addEventListener('click', () => {
      player.revealed = true;
      _revealShowHandoff = true; // next render shows handoff
      render();
    });
  }
}
