const app = document.getElementById('app');

function render() {
  app.innerHTML = '';           // clear current screen
  switch (State.phase) {
    case 'setup-names':    screenSetupNames(app);    break;
    case 'setup-roles':    screenSetupRoles(app);    break;
    case 'reveal':         screenReveal(app);         break;
    case 'discussion':     screenDiscussion(app);     break;
    case 'vote':           screenVote(app);           break;
    case 'vote-runoff':    screenVote(app, true);     break;
    case 'elimination':    screenElimination(app);    break;
    case 'mrwhite-guess':  screenMrWhiteGuess(app);   break;
    case 'end':            screenEnd(app);            break;
  }
}

// Transition helper — used by all screens to change phase
function goTo(phase) {
  State.phase = phase;
  render();
}

// Start the app
render();
