function screenSetupRoles(container) {
  const n = State.playerNames.length;

  container.innerHTML = `
    <h2>Configuration des rôles</h2>
    <p>${n} joueurs</p>

    <label>Imposteurs : <span id="imp-val">${State.impostorCount}</span></label>
    <div class="counter-row">
      <button id="imp-down">−</button>
      <button id="imp-up">+</button>
    </div>

    <label>Monsieur Blanc : <span id="mw-val">${State.mrWhiteCount}</span></label>
    <div class="counter-row">
      <button id="mw-down">−</button>
      <button id="mw-up">+</button>
    </div>

    <p id="role-error" class="error hidden"></p>
    <p id="role-summary"></p>

    <button id="start-btn" class="primary">Commencer</button>
    <button id="back-btn" class="secondary">← Retour</button>
  `;

  const impVal   = container.querySelector('#imp-val');
  const mwVal    = container.querySelector('#mw-val');
  const summary  = container.querySelector('#role-summary');
  const errorMsg = container.querySelector('#role-error');
  const startBtn = container.querySelector('#start-btn');

  function validate() {
    const imp = State.impostorCount;
    const mw  = State.mrWhiteCount;
    const civilians = n - imp - mw;
    const hidden    = imp + mw;

    const valid = civilians > 0 && hidden < civilians && imp >= 1;

    errorMsg.classList.toggle('hidden', valid);
    if (!valid) {
      errorMsg.textContent =
        'Configuration invalide : les civils doivent être plus nombreux que les rôles cachés.';
    }

    summary.textContent =
      `${civilians} civil(s) · ${imp} imposteur(s) · ${mw} M. Blanc`;

    startBtn.disabled = !valid;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  container.querySelector('#imp-up').addEventListener('click', () => {
    State.impostorCount = clamp(State.impostorCount + 1, 1, Math.floor(n / 3));
    impVal.textContent = State.impostorCount;
    validate();
  });
  container.querySelector('#imp-down').addEventListener('click', () => {
    State.impostorCount = clamp(State.impostorCount - 1, 1, Math.floor(n / 3));
    impVal.textContent = State.impostorCount;
    validate();
  });
  container.querySelector('#mw-up').addEventListener('click', () => {
    State.mrWhiteCount = clamp(State.mrWhiteCount + 1, 0, Math.floor(n / 4));
    mwVal.textContent = State.mrWhiteCount;
    validate();
  });
  container.querySelector('#mw-down').addEventListener('click', () => {
    State.mrWhiteCount = clamp(State.mrWhiteCount - 1, 0, Math.floor(n / 4));
    mwVal.textContent = State.mrWhiteCount;
    validate();
  });

  container.querySelector('#back-btn').addEventListener('click', () => goTo('setup-names'));

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Chargement...';

    State.wordPair = await Dictionary.getRandomPair();
    Roles.assign();
    Roles.generatePlayOrder();
    State.currentRound = 1;
    Voting.resetVotes();

    goTo('reveal');
  });

  validate();
}
