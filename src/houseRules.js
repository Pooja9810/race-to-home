// Rules players can switch on or off before a game. A game keeps the rules it started with.

export const DEFAULT_RULES = {
  sixBonus: true,
  threeSixes: false,
  bumpBonus: true,
  homeBonus: true,
  pairsSafe: true,
  exactHome: true,
  bumpToEnter: false,
  allowSkip: true,
  playForPlaces: true,
};

// [rule, label, explanation] in the order shown on the House rules screen
export const RULE_INFO = [
  ['sixBonus', 'Roll again on a 6', 'Every 6 earns another roll.'],
  ['threeSixes', 'Three 6s in a row ends your turn', 'Stops anyone from rolling forever.'],
  ['bumpBonus', 'Roll again after a bump', 'Sending someone back to start earns another roll.'],
  ['homeBonus', 'Roll again on reaching Home', 'Each creature that gets Home earns another roll.'],
  ['pairsSafe', 'Pairs are safe', 'Two or more of one color on a square can\'t be sent back.'],
  ['exactHome', 'Exact roll to get Home', 'When off, any roll big enough takes you Home.'],
  ['bumpToEnter', 'Bump before going inside', 'You can\'t enter the inner ring until you\'ve sent someone back.'],
  ['allowSkip', 'Allow skipping a turn', 'Players can pass instead of moving.'],
  ['playForPlaces', 'Play on for 2nd and 3rd', 'When off, the game ends as soon as someone wins.'],
];

export const withDefaults = rules => ({ ...DEFAULT_RULES, ...(rules || {}) });
