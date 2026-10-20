"""Checks for the landing page, run on every pull request.

Plain Python (no installs): `python3 -m unittest discover -s tests` from the repo root.
They catch the mistakes a static site can make: a broken link to one of
its own files, an inline script (which a Content-Security-Policy would
block later), an external link that can reach back into this page
(missing rel="noopener"), or a placeholder left in.
"""

import pathlib
import unittest
from html.parser import HTMLParser

SITE = pathlib.Path(__file__).resolve().parent.parent / "site"


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.local_refs = []
        self.external_links = []
        self.inline_scripts = 0
        self.style_attributes = 0
        self.titles = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "style" in attrs:
            self.style_attributes += 1
        if tag == "title":
            self.titles += 1
        if tag == "script" and "src" not in attrs:
            self.inline_scripts += 1
        for name in ("href", "src"):
            value = attrs.get(name)
            if not value:
                continue
            if value.startswith(("http://", "https://")):
                if tag == "a":
                    self.external_links.append((value, attrs.get("rel", "")))
            elif not value.startswith(("#", "mailto:")):
                self.local_refs.append(value)


def parse(name):
    parser = PageParser()
    parser.feed((SITE / name).read_text(encoding="utf-8"))
    return parser


class LandingPageTests(unittest.TestCase):
    def setUp(self):
        self.page = parse("index.html")
        self.html = (SITE / "index.html").read_text(encoding="utf-8")

    def test_every_local_file_it_links_to_exists(self):
        for ref in self.page.local_refs:
            with self.subTest(ref=ref):
                self.assertTrue((SITE / ref.lstrip("/")).is_file(), f"site/{ref} is missing")

    def test_no_inline_scripts_or_styles(self):
        self.assertEqual(self.page.inline_scripts, 0)
        self.assertEqual(self.page.style_attributes, 0)
        self.assertNotIn("<style", self.html)

    def test_external_links_use_noopener(self):
        for href, rel in self.page.external_links:
            with self.subTest(href=href):
                self.assertIn("noopener", rel)

    def test_external_links_are_https(self):
        for href, _ in self.page.external_links:
            with self.subTest(href=href):
                self.assertTrue(href.startswith("https://"))

    def test_has_a_title_and_no_placeholders(self):
        self.assertEqual(self.page.titles, 1)
        self.assertNotIn("_URL", self.html)


if __name__ == "__main__":
    unittest.main()
