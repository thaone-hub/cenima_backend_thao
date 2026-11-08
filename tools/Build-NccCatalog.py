"""Build a local, attributed catalogue from public NCC HTML downloaded by the sync script."""
import argparse
import html
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path


def text(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", value))).strip()


def build(source, destination):
    today = datetime.now(timezone(timedelta(hours=7))).date()
    movies = []
    for path in sorted(source.glob("ncc-*.html")):
        match = re.fullmatch(r"ncc-(\d+)\.html", path.name)
        if not match:
            continue
        source_id = int(match[1])
        page = path.read_text(encoding="utf-8")
        title_match = re.search(r"<h3[^>]*>(.*?)</h3>", page, re.S)
        if not title_match:
            continue
        title = text(title_match[1])
        body = page[title_match.end():]
        paragraphs = [text(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", body, re.S)]
        paragraphs = [p for p in paragraphs if p]
        def field(prefix):
            return next((p.split(":", 1)[1].strip() for p in paragraphs if p.startswith(prefix)), "")
        release = field("Khởi chiếu:")
        release_date = datetime.strptime(release, "%d/%m/%Y").date() if release else None
        duration = next((int(re.match(r"(\d+)\s+phút", p)[1]) for p in paragraphs if re.match(r"(\d+)\s+phút", p)), None)
        description = next((text(p) for p in re.findall(r'<p[^>]*class="[^"]*line-clamp-4[^"]*"[^>]*>(.*?)</p>', body, re.S)), "")
        images = re.findall(r'https://res\.anvui\.vn/[^\s"<>\\]+\.(?:jpg|png|webp)', page)
        if not images or not description:
            continue
        age_match = re.search(r"-(T\d+|K|P)(?:\b|\s|\()", title)
        trailer_match = re.search(r"youtube\.com/(?:embed/|watch\?v=)([A-Za-z0-9_-]{11})", page)
        movies.append({
            "id": f"ncc-{source_id}", "sourceId": source_id, "title": title,
            "description": description, "duration": duration,
            "releaseDate": str(release_date) if release_date else None,
            "director": field("Đạo diễn:"), "actors": field("Diễn viên:"),
            "genre": paragraphs[0] if paragraphs else "", "country": paragraphs[1] if len(paragraphs)>1 else "",
            "ageRating": age_match[1] if age_match else "",
            "status": 2 if release_date and release_date > today else 1,
            "posterUrl": f"/assets/ncc-{source_id}.jpg", "originalPosterUrl": html.unescape(images[0]),
            "sourceName": "Trung tâm Chiếu phim Quốc gia", "sourceUrl": f"https://chieuphimquocgia.com.vn/movies/{source_id}",
            "trailerUrl": f"https://www.youtube.com/watch?v={trailer_match[1]}" if trailer_match else None,
        })
    if not movies:
        raise RuntimeError("No valid NCC film descriptions found; existing catalogue was preserved.")
    movies.sort(key=lambda movie: (movie["sourceId"] != 11248, movie["releaseDate"] or ""))
    destination.write_text(json.dumps({"source": "https://chieuphimquocgia.com.vn/", "collectedAt": today.isoformat(), "movies": movies},ensure_ascii=False,indent=2), encoding="utf-8")
    print(f"Built {len(movies)} attributed film records.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    build(args.source, args.destination)
