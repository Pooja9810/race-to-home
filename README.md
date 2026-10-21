# Race to Home

A doodle-style browser board game for 2 to 4 players, based on the classic Indian race game
Chowka Bhara / Ashta Chamma. Roll the die, race your four creatures counter-clockwise around
the 5×5 board and into Home, and send everyone else back to start along the way.

## Run it

The game uses JavaScript modules, so it needs to be served over HTTP (opening the file directly won't work):

```sh
python3 -m http.server 5500
```

Then open http://127.0.0.1:5500/race-to-home.html. Add `#demo` to the URL to watch four computer players.

## Code layout

- `race-to-home.html` page structure
- `css/styles.css` styling
- `src/main.js` entry point; `src/game.js` turn flow; `src/rules.js` and `src/houseRules.js` the rules;
  the other files in `src/` draw the board, creatures, die and effects
