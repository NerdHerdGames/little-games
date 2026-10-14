# Moon Explorer data and artwork

## Scope and sources

The picker covers the eight planets and five officially recognized dwarf planets already in the project's shared planet data, retaining only worlds with moons. This yields Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Haumea, Makemake, and Eris. It does not classify additional trans-Neptunian dwarf-planet candidates as recognized dwarf planets.

The offline snapshot was checked October 14, 2026. Its full 465-moon list includes 115 Jovian and 293 Saturnian satellites, including moons still identified by provisional designations. All are instantiated in their system view, and all are reachable through the paged close-up list. The first page favors moons with published radii. Only a few labels appear in crowded overviews; label count does not limit the number of rendered moons.

- [JPL discovery circumstances](https://ssd.jpl.nasa.gov/sats/discovery.html): complete lists for Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto; official names or provisional designations are retained. The source's per-world counts are checked by the refresh script.
- [JPL satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/): mean radii where supplied, including Earth's Moon. Missing sizes remain `null`, rather than inventing physical measurements.
- [NASA moon facts](https://science.nasa.gov/solar-system/moons/facts/): the Moon and the moons of Haumea, Makemake, and Eris. MK 2 retains its provisional designation S/2015 (136472) 1.
- [JPL planet physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html): approximate parent radii used for schematic display sizing. Display radii are enlarged/compressed for visibility and are never a physical scale model.

Snapshot sources are bundled as metadata in `moon-catalogue.json`. These pages are development-time references; the app never requests them during gameplay.

## Updating the catalogue

Python's standard library is sufficient; no extra packages are required:

```sh
python scripts/update-moon-catalogue.py --date YYYY-MM-DD
npx prettier --write src/games/moon-explorer/moon-catalogue.json
```

The script validates parsed world counts and unique IDs before replacing the snapshot. For a repeatable offline refresh, use `--source-dir DIRECTORY` containing saved `discovery.html` and `physical.html`. Review changes, confirm the three outer dwarf-planet lists against NASA's moon facts, and update the snapshot count/date assertions in `rules.test.ts`, this document, and the README before running `npm run validate`.

## Illustrative view

The simulation deliberately rearranges moon orbits and compresses distances. Unknown-size moons use a fixed visible symbol size. The generated camera paths, orbit directions, inclinations, periods, and starting phases are illustrative and are not astronomical predictions. Haumea is displayed as an ellipsoid, and Saturn, Uranus, and Haumea have illustrative rings. Only the parent world and a few moons are labeled in busy overviews, while every moon has a named list entry and close-up view.

The original locally bundled NASA Earth and Moon textures retain their [image credits](../../../public/assets/games/earth-moon-explorer/CREDITS.md). Other surfaces are project-owned procedural canvas illustrations created by `surfaces.ts`, identified as illustrations in the game. They are not maps or photographs of unobserved terrain. No copyrighted third-party art, runtime CDN, or external texture requests are introduced.
