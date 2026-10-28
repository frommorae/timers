# Morae pets · art export (batch 1, geometric)

Drawing code and data for the optional study pets. Designed and coded with Claude (Anthropic) for Morae; all rights belong to the Morae project owner.

- `morae-pets.js`: `window.MoraePets.svg({ pet, stage, state, colour, items, island, weather, animate, frame })` returns an SVG string; `anchors()` gives item anchor points. No network, fonts or images.
- `pets.json`, `items.json`, `events.json`: roster, wardrobe and event sets.
- `preview.html`: every pet × stage × state, plus 32 px stills on four backgrounds.
- `icons/`: 512 and 1024 px head shots of the 13 starters.

Not wired into the timer yet (release 1 is being built).
