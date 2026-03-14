function screenMrWhiteGuess(container) {
  const player = State.getPlayer(State.pendingElimination);

  container.innerHTML = `
    <div class="mrwhite-screen">
      <h2>${player.name} est Monsieur Blanc !</h2>
      <p>Dernière chance : devinez le mot des civils.</p>
      <input id="guess-input" type="text" placeholder="Votre mot..." />
      <button id="guess-btn" class="primary">Valider</button>
      <p id="guess-error" class="error hidden"></p>
    </div>
  `;

  const input    = container.querySelector('#guess-input');
  const guessBtn = container.querySelector('#guess-btn');
  const errorMsg = container.querySelector('#guess-error');

  guessBtn.addEventListener('click', () => {
    const guess = input.value.trim().toLowerCase();
    const correct = State.wordPair.word.toLowerCase();

    if (!guess) return;

    if (guess === correct) {
      Victory.mrWhiteGuessCorrect();
      goTo('end');
    } else {
      errorMsg.textContent = 'Mauvaise réponse. Monsieur Blanc est éliminé.';
      errorMsg.classList.remove('hidden');
      guessBtn.disabled = true;

      setTimeout(() => {
        // Proceed with elimination normally
        player.eliminated = true;
        const result = Victory.check();
        if (result) {
          goTo('end');
        } else {
          proceedToNextRound();
        }
      }, 2000);
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') guessBtn.click();
  });
}
