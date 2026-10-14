"""Refresh the offline moon-name snapshot from NASA/JPL; never run during gameplay."""

import argparse
from datetime import date
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.request import urlopen


class TableRows(HTMLParser):
    """Read table cells, including HTML tables with optional closing td tags."""

    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def finish_cell(self):
        if self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        if tag in ("td", "th") and self.row is not None:
            self.finish_cell()
            self.cell = []

    def handle_data(self, text):
        if self.cell is not None:
            self.cell.append(text)

    def handle_endtag(self, tag):
        if tag in ("td", "th"):
            self.finish_cell()
        if tag == "tr" and self.row is not None:
            self.finish_cell()
            self.rows.append(self.row)
            self.row = None


def rows(html):
    parser = TableRows()
    parser.feed(html)
    return parser.rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, help="Use saved discovery.html and physical.html")
    parser.add_argument("--date", default=date.today().isoformat())
    args = parser.parse_args()
    sources = {
        "discovery": "https://ssd.jpl.nasa.gov/sats/discovery.html",
        "physical": "https://ssd.jpl.nasa.gov/sats/phys_par/",
    }
    documents = {}
    for key, url in sources.items():
        if args.source_dir:
            documents[key] = (args.source_dir / (key + ".html")).read_text(encoding="utf-8")
        else:
            with urlopen(url, timeout=30) as response:
                documents[key] = response.read().decode("utf-8")
    radii = {}
    for row in rows(documents["physical"]):
        if len(row) >= 9 and row[0] in ("Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"):
            try:
                radii[row[1]] = float(row[6])
            except ValueError:
                pass
    worlds = {"earth": [{"id": "moon", "name": "Moon", "designation": "", "radiusKm": radii["Moon"]}]}
    expected = {}
    world = None
    for row in rows(documents["discovery"]):
        heading = re.fullmatch(r"Satellites of\s+(?:Dwarf Planet\s+)?(\w+):\s*(\d+)", row[0]) if row else None
        if heading:
            world = heading[1].lower()
            expected[world] = int(heading[2])
            worlds[world] = []
        elif world and len(row) == 6:
            name = row[1] or row[2]
            if not name:
                raise ValueError("Moon row has neither a name nor a designation")
            moon_id = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            worlds[world].append({"id": moon_id, "name": name, "designation": row[2], "radiusKm": radii.get(name)})
    if set(expected) != {"mars", "jupiter", "saturn", "uranus", "neptune", "pluto"}:
        raise ValueError("JPL discovery table structure changed; check the source before updating")
    for world, count in expected.items():
        if len(worlds[world]) != count:
            raise ValueError(f"{world}: parsed {len(worlds[world])} moons, header says {count}")
    # Other officially recognized dwarf planets are listed separately on NASA's moon facts page.
    worlds.update({
        "haumea": [
            {"id": "hi-iaka", "name": "Hi'iaka", "designation": "", "radiusKm": None},
            {"id": "namaka", "name": "Namaka", "designation": "", "radiusKm": None},
        ],
        "makemake": [{"id": "mk-2", "name": "MK 2", "designation": "S/2015 (136472) 1", "radiusKm": None}],
        "eris": [{"id": "dysnomia", "name": "Dysnomia", "designation": "", "radiusKm": None}],
    })
    for world, moons in worlds.items():
        if not moons or len({moon["id"] for moon in moons}) != len(moons):
            raise ValueError(f"Empty or duplicate moon IDs in {world}")
    output = Path(__file__).resolve().parents[1] / "src/games/moon-explorer/moon-catalogue.json"
    snapshot = {"verifiedOn": args.date, "sources": [*sources.values(), "https://science.nasa.gov/solar-system/moons/facts/"], "worlds": worlds}
    output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Offline moon catalogue:", ", ".join(f"{key}: {len(value)}" for key, value in worlds.items()))


if __name__ == "__main__":
    main()
