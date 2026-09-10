# CzernexReach-TestPilot

Quick pre-flight QA check for websites before publishing or handing them off to a client.

TestPilot answers one question: **is this site technically ready to go live or be delivered to the client?**

It loads the page in a real browser (via Playwright), checks that it responds correctly, has no console errors, and has no broken links, and runs a basic mobile check (~390x844 viewport) — then gives you a clear PASS / WARNING / FAIL verdict with the details behind it.

## Result meanings

- **PASS** — basic technical checks passed, the site looks ready.
- **WARNING** — the site works, but there are things worth a look before handoff.
- **FAIL** — a problem was found that should be fixed before publishing or delivering to the client.

### Mobile check

The report includes a "Mobile check" section that verifies:

- the page loads on a mobile viewport,
- a correct `<meta name="viewport">` tag is present,
- there is no horizontal overflow (content wider than the screen),
- a mobile screenshot is saved.

A missing viewport tag or horizontal overflow only downgrades the overall result to WARNING. The overall result becomes FAIL only for a critical mobile problem, such as the page not loading at all on mobile.
