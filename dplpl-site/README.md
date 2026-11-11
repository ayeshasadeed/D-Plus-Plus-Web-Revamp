# D++ website (dplpl.com revamp)

Static, dependency-free site. Plain HTML, CSS and JavaScript, so it runs on GitHub Pages,
Netlify, Vercel or any web server as-is. There is no build step.

## Structure

```
dplpl-site/
├── index.html            Homepage (Hero, Problem, Solution, Testimonials, Contact)
├── about.html            About Us (Hero card + stats, Values, What working with D++ gets you, Case study placeholders)
├── services.html         Services (Selector hero, Logo strip, What we do, Case study placeholder, How we work with you, CTA)
├── contact.html          Contact (Hero, What happens next + details + form, Our offices)
├── faqs.html             FAQs (Hero + search, Service-line tabs + answers, Closing CTA)
├── team.html             Team (Hero collage, Leadership cards with photo placeholders, Careers CTA)
├── case-studies.html     Case studies (Hero + stats, Featured story, Board-question tabs + slider, Impact steps)
├── blog.html             Insights (Hero, Featured article, Topic filter + slider, Newsletter)
├── service-*.html        One page per service line (Hero scene, Problem, Point of view, What we do, CTA)
├── assets/
│   ├── css/styles.css    All styles. Tokens (colours, type, spacing) are at the top.
│   └── js/main.js        All behaviour. SETTINGS at the top controls the timings.
└── README.md
```

Pages planned next. Nav and footer links already point to these and show a
"coming soon" message until each file exists:

| Page | File |
| --- | --- |
| About Us (built) | `about.html` |
| Team (built, photo placeholders) | `team.html` |
| Services (built, one page for all four lines) | `services.html` |
| → Strategy, Innovation & Growth (built) | `service-strategy.html` |
| → Data & AI (built) | `service-data-ai.html` |
| → Systems, Operations & Business Transformation (built) | `service-systems.html` |
| → People, Process & Technology (built) | `service-people.html` |
| Case studies (built) | `case-studies.html` |
| Insights / blog (built) | `blog.html` (article pages not built yet) |
| Contact (built) | `contact.html` (`contact.html#start` jumps to the form) |
| FAQs (built) | `faqs.html` (`faqs.html#data-ai` etc. opens a tab) |

The D++ logo is the Homepage link (`index.html`).
When a page is built, remove `data-soon` from the links that point to it.
The Services overview also opens a line named after `#` (services.html#data-ai), and the "D++ for" selector
switches lines in place.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Editing

- **Copy:** every fold in `index.html` sits under a `FOLD n` comment block.
- **Colours / fonts / spacing:** the `:root` tokens at the top of `assets/css/styles.css`.
- **Animation speed, autoplay, parallax:** `SETTINGS` at the top of `assets/js/main.js`.
- **Hero illustration:** the inline `<svg class="scene">` in the hero. Each object is its own
  commented `<g class="layer">` group, and `data-depth` sets how far it moves with the pointer.
- **Reviews:** copy a `<figure class="review">` and set `data-group` to one of the tab keys
  (`strategy`, `data`, `systems`, `people`).
- **Problem demo:** the table cells with `data-before` / `data-after` swap when "Apply" runs.
  The table rows are an illustrative example, not client data.

Visitors who turn on "reduce motion" in their system settings see a still page.

## Deploy with GitHub Pages

1. Commit this folder to the repository (at the root, or in `/docs`).
2. Go to repository **Settings → Pages**, pick the branch and folder, and save.
3. The site is published at `https://<org>.github.io/<repo>/`. Point `dplpl.com` at it
   under **Custom domain** when it's approved.

## Contact form

The form in `contact.html` checks every field in the browser and shows the error messages
from the content doc. It has no server yet: with `data-endpoint=""` it shows the thank-you
message without sending anything. To make it live, set `data-endpoint` on the `<form>` to a
URL that accepts a JSON `POST` (for example a Formspree, HubSpot or your own API endpoint).
If that request fails, the page shows the "Something went wrong" message.
