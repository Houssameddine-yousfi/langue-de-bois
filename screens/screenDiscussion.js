function screenDiscussion(container) {
  container.innerHTML = `
    <h2>Round ${State.currentRound}</h2>
    <p>Ordre de jeu (chacun donne un indice sur son mot) :</p>
    <ol id="play-order"></ol>
    <p class="subtle">Discutez, puis passez au vote.</p>
    <button id="vote-btn" class="primary">Voter →</button>
  `;

  const ol = container.querySelector('#play-order');
  ol.innerHTML = State.playOrder.map(name => `<li>${name}</li>`).join('');

  container.querySelector('#vote-btn').addEventListener('click', () => {
    Voting.resetVotes();
    goTo('vote');
  });
}
