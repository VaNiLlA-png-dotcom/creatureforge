# Pocket Wilds prototype

Pocket Wilds is a gentle, single-player sanctuary prototype. The Sanctuary Chief can observe a small dragon in the Hidden Grotto, rearrange a few habitat objects, and offer optional enrichment. A formerly rescued gnome lives independently in a modest, functional cabin on the raised overlook; his porch has a rocking chair made from fallen branches.

## Run

Open `index.html` in a modern browser, or serve this directory with any static web server. For example:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. There are no dependencies, accounts, API keys, Gemini calls, or network services. The layout supports touch screens, including Android tablets.

## Explore

- The dragon cycles through exploration, drinking, resting, and sheltering. Its well-being is maintained automatically; enrichment is optional.
- Drag the outlined shelter, fern, or mossy rock, or select an object and use the direction buttons. Keyboard users can also focus an object and use the arrow keys. The dragon will investigate changes.
- Object positions are saved in the browser's local storage when available. Reset objects restores the initial layout. If saving is unavailable, the page reports that positions are temporary.
- The simulation runs only while the page is visible. There is no offline decay or penalty for leaving.
- The gnome's thoughts change occasionally without notifications; visit him when you wish. You can also ask him for help providing enrichment, which he volunteers to do.

All artwork is original, simplified SVG placeholder art. The dragon moves between locations without a walking animation; the gnome's small shift is likewise only a placeholder. Neither represents realistic movement.

## Structure

- `index.html`: interface and the original SVG grotto illustration.
- `styles.css`: responsive layout and touch-friendly controls.
- `app.js`: habitat data, resident state and routines, interactions, and local position storage.

The habitat's objects and creature routine are separate from rendering to give future versions a starting point for more habitats, creatures, discoveries, rescues, and rehabilitation. These additional features are not implemented yet.
