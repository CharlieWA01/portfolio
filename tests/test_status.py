"""The Stargazer bot's status page (site/stargazer-bot.html), in a real browser.

The page reads data/stargazer/live.json and stats.json, which AWS Lambdas
write into the site's bucket (cloud-homelab, stargazer-history.tf); they
are never in this repo. Here Playwright answers those two requests with
sample files, so the page is checked against known data, including
hostile data (an opponent's name is whatever Lichess says it is).

Browser tests are skipped when Playwright isn't installed, unless
REQUIRE_BROWSER_TESTS is set (as in CI); see test_play.py.
"""

import datetime
import functools
import http.server
import json
import os
import pathlib
import re
import threading
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

try:
    from playwright.sync_api import expect, sync_playwright
except ImportError:
    sync_playwright = None


def iso(minutes_ago):
    when = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=minutes_ago)
    return when.strftime("%Y-%m-%dT%H:%M:%SZ")


def live(minutes_ago=2, online=True):
    return {
        "checked_at": iso(minutes_ago),
        "online": online,
        "hours": {"start": "10:00", "end": "21:15", "time_zone": "America/Chicago"},
        "today": {"date": "2026-11-07", "games": 31, "wins": 17, "draws": 5, "losses": 9, "time_losses": 1,
                  "checks": 80, "online_checks": 80, "ratings": {"blitz": 2104, "bullet": 2188}},
    }


STATS = {
    "generated_at": "2026-11-08T04:51:00Z",
    "totals": {"games": 700, "wins": 400, "draws": 100, "losses": 200, "first_day": "2026-10-26"},
    "by_speed": [
        {"speed": "blitz", "colour": "black", "games": 300, "wins": 160, "draws": 40, "losses": 100},
        {"speed": "blitz", "colour": "white", "games": 400, "wins": 240, "draws": 60, "losses": 100},
    ],
    "rating_by_day": [
        {"day": "2026-11-05", "speed": "blitz", "rating": 2080},
        {"day": "2026-11-06", "speed": "blitz", "rating": 2096},
        {"day": "2026-11-07", "speed": "blitz", "rating": 2104},
        {"day": "2026-11-06", "speed": "bullet", "rating": 2170},
        {"day": "2026-11-07", "speed": "bullet", "rating": 2188},
    ],
    "top_openings": [{"opening": "Sicilian Defense", "games": 90, "wins": 50, "draws": 10, "losses": 30}],
    "recent_games": [
        {"id": "abcd1234", "ended_at": "2026-11-08T03:30:00Z", "speed": "blitz", "colour": "white",
         "opponent": "SomeBot", "opponent_rating": 2050, "result": "win", "status": "mate",
         "opening": "Sicilian Defense"},
    ],
    "slo": {
        "days": 28,
        "online": {"checks": 3700, "online": 3696, "share": 0.9989, "target": 0.99},
        "time_losses": {"games": 1500, "lost_on_time": 45, "share": 0.03, "target": 0.02},
    },
}


class NoBrowserTests(unittest.TestCase):
    def test_the_page_never_writes_html_from_the_data(self):
        script = (SITE / "stargazer" / "status.js").read_text()
        for unsafe in ("innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval("):
            with self.subTest(unsafe=unsafe):
                self.assertNotIn(unsafe, script)

    def test_the_deploy_leaves_the_data_files_alone(self):
        # The Lambdas write site/data/ in the bucket; a sync with --delete
        # and no exclude would delete their files on every deploy.
        deploy = (ROOT / ".github" / "workflows" / "deploy.yml").read_text()
        sync = next(line for line in deploy.splitlines() if "aws s3 sync" in line)
        self.assertIn('--exclude "data/*"', sync)

    def test_no_data_files_in_the_repo(self):
        self.assertFalse((SITE / "data").exists())


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@unittest.skipIf(
    sync_playwright is None and not os.environ.get("REQUIRE_BROWSER_TESTS"),
    "Playwright isn't installed",
)
class StatusPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(SITE))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/stargazer-bot.html"
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH"))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def open(self, live_doc, stats_doc):
        page = self.browser.new_page()
        self.addCleanup(page.close)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("dialog", lambda dialog: errors.append("dialog: " + dialog.message))
        self.addCleanup(lambda: self.assertEqual(errors, []))
        for name, doc in (("live", live_doc), ("stats", stats_doc)):
            if doc is None:
                page.route(f"**/data/stargazer/{name}.json", lambda route: route.fulfill(status=404, body=""))
            else:
                page.route(f"**/data/stargazer/{name}.json",
                           functools.partial(lambda d, route: route.fulfill(
                               status=200, content_type="application/json", body=json.dumps(d)), doc))
        page.goto(self.url)
        return page

    def test_shows_the_bot_online_and_todays_games(self):
        page = self.open(live(), STATS)
        expect(page.locator("#now")).to_have_text(re.compile(r"^Online"))
        expect(page.locator("#today-games")).to_have_text("31")
        expect(page.locator("#today-score")).to_have_text("17 · 5 · 9")
        expect(page.locator("#ratings")).to_have_text("Ratings after today's games: bullet 2188, blitz 2104.")

    def test_an_old_check_means_off_for_the_night(self):
        page = self.open(live(minutes_ago=600), STATS)
        expect(page.locator("#now")).to_have_text(
            "Off for the night. It plays every day from 10:00, taking new games until 21:15 Central time.")
        expect(page.locator("#today")).to_be_hidden()

    def test_offline_at_the_last_check(self):
        page = self.open(live(online=False), STATS)
        expect(page.locator("#now")).to_have_text(re.compile(r"^Not online"))

    def test_slos_against_their_targets(self):
        page = self.open(live(), STATS)
        slos = page.locator("#slos li")
        expect(slos.nth(0)).to_contain_text("99.9%")
        expect(slos.nth(0).locator(".slo-met")).to_have_count(1)
        expect(slos.nth(1)).to_contain_text("3.0%")
        expect(slos.nth(1).locator(".slo-missed")).to_have_count(1)
        expect(slos.nth(1)).to_contain_text("45 of 1500 games")

    def test_rating_chart_tables_and_games(self):
        page = self.open(live(), STATS)
        expect(page.locator("#rating-chart path.series")).to_have_count(2)
        expect(page.locator("#rating-chart .legend")).to_contain_text("blitz: 2104")
        expect(page.locator("#totals")).to_have_text("700 games since 2026-10-26: 400 won, 100 drawn, 200 lost.")
        expect(page.locator("#by-speed tbody tr")).to_have_count(2)
        expect(page.locator("#openings tbody tr").first).to_contain_text("Sicilian Defense")
        game = page.locator("#recent li a")
        expect(game).to_have_attribute("href", "https://lichess.org/abcd1234")
        expect(game).to_have_text("Won with white against SomeBot (2050), blitz")

    def test_no_data_yet(self):
        page = self.open(None, None)
        expect(page.locator("#now")).to_have_text("No live data yet.")
        expect(page.locator("#slos")).to_have_text("No data yet.")
        expect(page.locator("#recent")).to_have_text("No games yet.")

    def test_hostile_data_stays_text(self):
        evil = '<img src=x onerror="alert(1)">'
        stats = json.loads(json.dumps(STATS))
        stats["recent_games"] = [
            {**STATS["recent_games"][0], "opponent": evil},
            {**STATS["recent_games"][0], "id": "javascript:alert(1)"},
        ]
        stats["top_openings"][0]["opening"] = evil
        page = self.open(live(), stats)
        expect(page.locator("#recent li").first).to_contain_text(evil)
        expect(page.locator("#openings tbody td").first).to_have_text(evil)
        expect(page.locator("img")).to_have_count(0)
        # A game id that isn't Lichess's shape is shown, not linked.
        expect(page.locator("#recent li").nth(1).locator("a")).to_have_count(0)


if __name__ == "__main__":
    unittest.main()
