"""The Stargazer play page (site/stargazer.html), in a real browser.

Serves site/ on a local port and plays through Playwright's Chromium: the
engine (stargazer.wasm in a worker) must load, accept your move and reply.

Skipped when Playwright isn't installed, so `python3 -m unittest discover
-s tests` still runs with no installs; the checks workflow installs it and
sets REQUIRE_BROWSER_TESTS=1, which turns that skip into a failure. Set
CHROMIUM_PATH to use a Chromium other than Playwright's own.
"""

import functools
import hashlib
import http.server
import os
import pathlib
import re
import threading
import unittest

SITE = pathlib.Path(__file__).resolve().parent.parent / "site"

try:
    from playwright.sync_api import expect, sync_playwright
except ImportError:  # no installs: run the other checks only
    sync_playwright = None


class EngineFileTests(unittest.TestCase):
    """No browser needed."""

    def test_the_engine_is_the_release_named_in_ENGINE(self):
        # site/stargazer/ENGINE (written by tools/update-stargazer.sh) names
        # the release and its checksum; the file must be that release.
        fields = dict(
            line.split("=", 1)
            for line in (SITE / "stargazer" / "ENGINE").read_text().splitlines()
            if line and not line.startswith("#")
        )
        self.assertRegex(fields["tag"], r"^v\d+\.\d+\.\d+$")
        wasm = (SITE / "stargazer" / "stargazer.wasm").read_bytes()
        self.assertEqual(hashlib.sha256(wasm).hexdigest(), fields["sha256"])

    def test_every_piece_is_there(self):
        for colour in "wb":
            for piece in "KQRBNP":
                with self.subTest(piece=colour + piece):
                    self.assertTrue((SITE / "stargazer" / "pieces" / f"{colour}{piece}.svg").is_file())


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    # Like S3 and CloudFront: .wasm is served as application/wasm.
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".wasm": "application/wasm"}

    def log_message(self, *args):
        pass


@unittest.skipIf(
    sync_playwright is None and not os.environ.get("REQUIRE_BROWSER_TESTS"),
    "Playwright isn't installed",
)
class PlayPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(SITE))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/stargazer.html"
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH"))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.page = self.browser.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.on("console", lambda m: m.type == "error" and self.errors.append(m.text))
        self.page.goto(self.url)

    def tearDown(self):
        self.page.close()
        self.assertEqual(self.errors, [])

    def square(self, name):
        return self.page.locator(f'.square[data-square="{name}"]')

    def test_you_move_and_the_engine_replies(self):
        page = self.page
        expect(page.locator("#status")).to_have_text("Your move.")
        expect(page.locator("#version")).to_have_text("Stargazer " + self.release_version())
        expect(self.square("e2")).to_have_attribute("aria-label", "e2, white pawn")
        self.square("e2").click()
        expect(self.square("e2")).to_have_class(re.compile(r"\bselected\b"))
        expect(self.square("e4")).to_have_class(re.compile(r"\btarget\b"))
        self.square("e4").click()
        # The engine replies within its second, and it's your move again.
        expect(page.locator("#moves li").first).to_have_text(re.compile(r"^e4 \S+$"), timeout=10_000)
        expect(page.locator("#status")).to_have_text("Your move.")
        expect(page.locator("#thought")).to_contain_text("Stargazer searched")

    def drag(self, start, end):
        """Press on one square, move across the board, let go on another."""
        mouse = self.page.mouse
        # The mouse works in window coordinates: bring the board into view.
        self.page.locator("#board").scroll_into_view_if_needed()
        a = self.square(start).bounding_box()
        b = self.square(end).bounding_box()
        mouse.move(a["x"] + a["width"] / 2, a["y"] + a["height"] / 2)
        mouse.down()
        mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, steps=8)
        mouse.up()

    def test_a_piece_can_be_dragged_to_its_square(self):
        page = self.page
        expect(page.locator("#status")).to_have_text("Your move.")
        self.drag("g1", "f3")
        expect(page.locator("#moves li").first).to_have_text(re.compile(r"^Nf3 \S+$"), timeout=10_000)
        expect(page.locator(".drag-ghost")).to_have_count(0)

    def test_a_piece_dropped_where_it_cannot_go_goes_back(self):
        page = self.page
        expect(page.locator("#status")).to_have_text("Your move.")
        self.drag("e2", "e5")
        expect(page.locator(".drag-ghost")).to_have_count(0)
        expect(page.locator("#moves li")).to_have_count(0)
        expect(self.square("e2")).to_have_attribute("aria-label", "e2, white pawn")
        # Still picked up, so a click finishes the move.
        expect(self.square("e2")).to_have_class(re.compile(r"\bselected\b"))
        self.square("e4").click()
        expect(page.locator("#moves li").first).to_have_text(re.compile(r"^e4 \S+$"), timeout=10_000)

    def test_a_promotion_can_be_dragged(self):
        self.open_position("8/P6k/8/8/8/8/8/K7 w - - 0 1")
        self.drag("a7", "a8")
        expect(self.page.locator("#promotion button")).to_have_count(4)

    def test_an_illegal_move_is_not_played(self):
        expect(self.page.locator("#status")).to_have_text("Your move.")
        self.square("e2").click()
        self.square("e5").click()
        expect(self.page.locator("#moves li")).to_have_count(0)
        # The engine's own pieces can't be picked up.
        self.square("e7").click()
        expect(self.square("e7")).not_to_have_class(re.compile(r"\bselected\b"))

    def test_as_black_the_engine_moves_first_on_a_flipped_board(self):
        page = self.page
        expect(page.locator("#status")).to_have_text("Your move.")
        page.locator("#new-black").click()
        expect(page.locator("#moves li").first).to_have_text(re.compile(r"^\S+$"), timeout=10_000)
        expect(page.locator("#status")).to_have_text("Your move.")
        # Black at the bottom: the first square drawn is h1.
        self.assertEqual(page.locator(".square").first.get_attribute("data-square"), "h1")

    def open_position(self, fen):
        self.page.goto(f"{self.url}#fen={fen.replace(' ', '%20')}")
        expect(self.page.locator("#status")).to_have_text("Your move.")

    def test_a_pawn_on_the_last_rank_becomes_the_piece_you_choose(self):
        self.open_position("8/P6k/8/8/8/8/8/K7 w - - 0 1")
        self.square("a7").click()
        self.square("a8").click()
        choices = self.page.locator("#promotion button")
        expect(choices).to_have_count(4)
        self.page.get_by_label("Promote to a rook").click()
        expect(self.page.locator("#promotion")).to_be_hidden()
        expect(self.square("a8")).to_have_attribute("aria-label", "a8, white rook")
        expect(self.page.locator("#moves li").first).to_have_text(re.compile(r"^a8=R \S+$"), timeout=10_000)

    def test_checkmate_ends_the_game(self):
        # Ra8 mates.
        self.open_position("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1")
        self.square("a1").click()
        self.square("a8").click()
        expect(self.page.locator("#status")).to_have_text("Checkmate. You win!")
        expect(self.page.locator("#moves li").first).to_have_text("Ra8#")
        expect(self.square("g8")).to_have_class(re.compile(r"\bcheck\b"))

    def release_version(self):
        for line in (SITE / "stargazer" / "ENGINE").read_text().splitlines():
            if line.startswith("tag=v"):
                return line[len("tag=v"):]
        raise AssertionError("no tag in ENGINE")


if __name__ == "__main__":
    unittest.main()
