function screenSetupNames(container) {
  container.innerHTML = `
    <h1>Langue de Bois</h1>
    <h2>Joueurs</h2>
    <ul id="player-list"></ul>
    <div class="input-row">
      <input id="name-input" type="text" placeholder="Nom du joueur" maxlength="20" />
      <button id="add-btn">Ajouter</button>
    </div>
    <p id="error-msg" class="error hidden"></p>
    <button id="next-btn" class="primary" disabled>Suivant →</button>
  `;

  const list     = container.querySelector('#player-list');
  const input    = container.querySelector('#name-input');
  const addBtn   = container.querySelector('#add-btn');
  const nextBtn  = container.querySelector('#next-btn');
  const errorMsg = container.querySelector('#error-msg');

  function refreshList() {
    const hasScores = Object.keys(State.scores).length > 0;
    list.innerHTML = State.playerNames.map((name, i) => `
      <li>
        <span>${name}</span>
        ${hasScores ? `<span class="player-score">${State.scores[name] ?? 0} pts</span>` : ''}
        <button class="remove-btn" data-index="${i}">✕</button>
      </li>
    `).join('');

    // Attach remove handlers
    list.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        State.playerNames.splice(Number(btn.dataset.index), 1);
        refreshList();
      });
    });

    nextBtn.disabled = State.playerNames.length < 3;
  }

  function addPlayer() {
    const name = input.value.trim();
    if (!name) return;
    if (State.playerNames.includes(name)) {
      errorMsg.textContent = 'Ce nom existe déjà.';
      errorMsg.classList.remove('hidden');
      return;
    }
    errorMsg.classList.add('hidden');
    State.playerNames.push(name);
    input.value = '';
    refreshList();
  }

  addBtn.addEventListener('click', addPlayer);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

  nextBtn.addEventListener('click', () => {
    goTo('setup-roles');
  });

  refreshList();
}
