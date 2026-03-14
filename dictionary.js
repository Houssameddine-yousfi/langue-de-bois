const Dictionary = {

  index: null,   // parsed index.json

  // Load the index once at startup
  async loadIndex() {
    const res = await fetch('./dictionary/index.json');
    this.index = await res.json();
  },

  // Pick a random unused pair from a random category
  async getRandomPair() {
    if (!this.index) await this.loadIndex();

    // Shuffle categories and try until we find an unused pair
    const shuffled = shuffle([...this.index.categories]);

    for (const cat of shuffled) {
      const res = await fetch(`./dictionary/${cat.file}`);
      const data = await res.json();

      // Filter out already-used pairs this session
      const available = data.pairs.filter(p =>
        !State.usedPairs.has(`${p.word}|${p.imposter}`)
      );

      if (available.length > 0) {
        const pair = available[Math.floor(Math.random() * available.length)];
        State.usedPairs.add(`${pair.word}|${pair.imposter}`);
        return { ...pair, category: cat.category };
      }
    }

    // All pairs exhausted — reset session memory and retry
    State.usedPairs.clear();
    return this.getRandomPair();
  }
};

// Generic array shuffle (Fisher-Yates)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
