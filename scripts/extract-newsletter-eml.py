#!/usr/bin/env python3
"""Extract numbered news items from exported Structural Heart Digest emails.

This is an archive-import helper, not part of the application build. It reads
the text/plain MIME part and emits JSON so the historical newsletters can be
reviewed and curated into data/news.yaml without scraping rendered email HTML.
"""

from __future__ import annotations

import argparse
import email
import json
import re
import unicodedata
from email import policy
from email.message import Message
from pathlib import Path


ITEM_START = re.compile(r"(?m)^(\d{1,2})\.\s+(.+)$")
SOURCE_LINE = re.compile(
    r"\*Source/date:\*\s*(.+?)(?=\n\*(?:Direct link|Direct source)s?:\*|\Z)",
    re.S,
)
LINK_BLOCK = re.compile(
    r"\*(?:Direct link|Direct source)s?:\*\s*(.+?)(?=\n\n|\Z)", re.S
)
URL = re.compile(r"https://\S+")
TRAILING_SECTIONS = re.compile(
    r"(?m)^Recent developments and trends(?:\s+.*)?$|^Why this matters(?:\s+.*)?$"
)
MONTHS = {
    name: index
    for index, name in enumerate(
        [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ],
        start=1,
    )
}
DATE = re.compile(
    rf"({'|'.join(MONTHS)})\s+(\d{{1,2}})(?:[–-](\d{{1,2}}))?,\s+(20\d{{2}})"
)


def plain_part(message: Message) -> str:
    for part in message.walk():
        if part.get_content_type() == "text/plain":
            return str(part.get_content())
    raise ValueError("message has no text/plain MIME part")


def one_line(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def published_at(source_date: str) -> str:
    dates: list[tuple[int, int, int]] = []
    for month, start_day, end_day, year in DATE.findall(source_date):
        dates.append((int(year), MONTHS[month], int(end_day or start_day)))
    if not dates:
        raise ValueError(f"could not find a publication date in: {source_date}")
    year, month, day = max(dates)
    return f"{year:04d}-{month:02d}-{day:02d}"


def source_name(source_date: str) -> str:
    value = re.split(rf",\s*(?:{'|'.join(MONTHS)})\b", source_date, maxsplit=1)[0]
    value = re.split(r";\s*reported\b", value, maxsplit=1)[0]
    return value[:100].strip()


def slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return normalized[:72].rstrip("-")


def short_summary(value: str) -> str:
    value = one_line(value.replace("*", ""))
    if len(value) <= 500:
        return value
    cutoff = value.rfind(". ", 220, 498)
    if cutoff >= 0:
        return value[: cutoff + 1]
    return value[:496].rsplit(" ", 1)[0] + "…"


def curated_items(
    extracted: list[dict[str, object]], curation_path: Path
) -> list[dict[str, object]]:
    curation = json.loads(curation_path.read_text(encoding="utf-8"))
    archive = curation["archive"]
    titles = {str(item["title"]) for item in extracted}
    missing = sorted(titles - set(archive))
    unused = sorted(set(archive) - titles)
    if missing or unused:
        details = []
        if missing:
            details.append("missing curation:\n  - " + "\n  - ".join(missing))
        if unused:
            details.append("unused curation:\n  - " + "\n  - ".join(unused))
        raise ValueError("\n".join(details))

    output: list[dict[str, object]] = []
    for item in extracted:
        title = str(item["title"])
        date = published_at(str(item["sourceDate"]))
        mapping = archive[title]
        output.append(
            {
                "id": f"news-{date}-{slug(title)}",
                "publishedAt": date,
                "title": title,
                "summary": short_summary(str(item["summary"])),
                "sourceName": source_name(str(item["sourceDate"])),
                "sourceUrl": item["sourceUrl"],
                "topicTags": mapping["topicTags"],
                "relevantNodeIds": mapping["relevantNodeIds"],
            }
        )

    for item in curation.get("additionalItems", []):
        extra = dict(item)
        extra["id"] = f"news-{extra['publishedAt']}-{slug(extra['title'])}"
        output.append(extra)

    ids = [str(item["id"]) for item in output]
    if len(ids) != len(set(ids)):
        raise ValueError("generated duplicate news ids")
    return sorted(output, key=lambda item: (str(item["publishedAt"]), str(item["id"])), reverse=True)


def yaml_document(items: list[dict[str, object]]) -> str:
    quote = lambda value: json.dumps(value, ensure_ascii=False)
    lines = [
        "# News feed — source-linked items for the SH graph. Schema: schema/news.schema.json",
        "# Historical entries were imported from the archived weekly digest emails.",
        "# Every relevantNodeIds entry must resolve to an existing graph node.",
        "",
    ]
    for item in items:
        lines.extend(
            [
                f"- id: {quote(item['id'])}",
                f"  publishedAt: {quote(item['publishedAt'])}",
                f"  title: {quote(item['title'])}",
                f"  summary: {quote(item['summary'])}",
                f"  sourceName: {quote(item['sourceName'])}",
                f"  sourceUrl: {quote(item['sourceUrl'])}",
                f"  topicTags: {quote(item['topicTags'])}",
                f"  relevantNodeIds: {quote(item['relevantNodeIds'])}",
                "",
            ]
        )
    return "\n".join(lines)


def extract(path: Path) -> list[dict[str, str]]:
    with path.open("rb") as handle:
        message = email.message_from_binary_file(handle, policy=policy.default)
    body = plain_part(message).replace("\r\n", "\n")
    starts = list(ITEM_START.finditer(body))
    items: list[dict[str, str]] = []

    for index, match in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(body)
        block = body[match.start():end].strip()
        source_match = SOURCE_LINE.search(block)
        link_match = LINK_BLOCK.search(block)
        if not source_match or not link_match:
            continue
        urls = [url.rstrip(".,)") for url in URL.findall(link_match.group(1))]
        if not urls:
            continue

        title_region = block[match.end() - match.start():source_match.start()]
        title = one_line(f"{match.group(2)} {title_region}")
        link_end = link_match.end()
        summary = block[link_end:].strip()
        trailing = TRAILING_SECTIONS.search(summary)
        if trailing:
            summary = summary[:trailing.start()].strip()

        items.append(
            {
                "emailFile": path.name,
                "emailDate": str(message.get("date", "")),
                "number": match.group(1),
                "title": title,
                "sourceDate": one_line(source_match.group(1)),
                "sourceUrl": urls[0],
                "additionalSourceUrls": urls[1:],
                "summary": one_line(summary),
            }
        )
    return items


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--curation", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    items = [item for path in args.paths for item in extract(path)]
    if args.curation:
        content = yaml_document(curated_items(items, args.curation))
    else:
        content = json.dumps(items, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.write_text(content, encoding="utf-8")
    else:
        print(content, end="")


if __name__ == "__main__":
    main()
