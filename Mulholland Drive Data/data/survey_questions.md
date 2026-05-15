# Mulholland Drive Viewer Interpretation Survey

## Why this exists

This is the **unique data layer** that separates your scrollytelling from prior CAUSEweb / Pudding entries. Lynch designed *Mulholland Drive* to be parsed differently by each viewer; quantifying that variance is genuinely original data nobody has collected at scale.

Use this draft to set up a Google Form, post it on r/davidlynch, r/TrueFilm, your school, your social media, etc. Aim for **50+ responses** before you call it usable; 100+ is competition-grade.

After collection: export Form responses → CSV → save as `data/survey_responses.csv`. The bundler in `analysis/csv_to_json.py` now picks up that file automatically.

## Form setup

- **Title:** *Mulholland Drive: How Did You Read It?*
- **Description:**
  > A short (5-min) survey for a data-storytelling project about David Lynch's *Mulholland Drive* (2001). Anonymous, no email collected, only fans/viewers please. Spoilers throughout — only proceed if you've finished the film at least once.
- **Settings:** Anonymous, no Google login required, one response per user not enforced (don't gate Reddit users), responses to a Google Sheet for easy CSV export.

---

## Section 1 — Watching context

**Q1. How many times have you watched *Mulholland Drive*?** *(single choice)*
- 1 (just once)
- 2–3 times
- 4 or more

**Q2. When did you first watch it?** *(single choice)*
- In a theater on release (2001–2002)
- 2003–2010
- 2011–2020
- 2021 or later
- Don't remember

**Q3. How familiar were you with David Lynch before this film?** *(single choice)*
- Never seen any of his work
- Seen 1–2 films/episodes
- Seen most of his major work
- A devoted fan

---

## Section 2 — Comprehension and the dream/reality split

**Q4. On your *first* watch, when did you first realize Betty was Diane (or that "something else was going on")?** *(single choice)*
- During the limo / opening
- During Club Silencio
- When the blue box opens
- When the dinner-party / cowboy scenes start
- When Diane wakes up on the couch
- When Diane meets the hitman at Winkie's
- Only after reading about it / on a rewatch
- I'm still not sure I understand it

**Q5. Which scene confused you the *most* on first watch?** *(scene picker — provide the 37 titles from `data/scenes.csv` as options)*
- (Use a dropdown built from the scene titles. Add an "Other / can't pinpoint" option.)

**Q6. After finishing the film, how confident were you in your interpretation?** *(linear scale 1–5)*
- 1 = "Lost, no idea what I just watched"
- 5 = "Felt I had a clear reading"

---

## Section 3 — Symbol interpretation (free response, the most interesting data)

**Q7. What did you think the *blue box* represented?** *(short text)*

**Q8. What did you think the *blue key* represented?** *(short text)*

**Q9. What did you think happened at *Club Silencio*?** *(short text — 1–2 sentences)*

**Q10. Who or what did you think the *Cowboy* was?** *(short text)*

**Q11. Who or what did you think the *Bum behind Winkie's* represented?** *(short text)*

---

## Section 4 — Reading

**Q12. Which interpretation feels closest to your reading?** *(single choice, multi-tradition framing)*
- The first half is Diane's dying dream / fantasy
- The first half is a literal alternate reality / multiverse
- The whole film is about Hollywood as a dream factory
- It's deliberately unresolvable; meaning is the wrong question
- A different reading (please describe in Q13)

**Q13. (Optional)** *(long text)*
> If you'd describe the film in your own words to a friend who hasn't seen it, what's the one-sentence pitch?

---

## Section 5 — Demographics (optional, last)

**Q14. Age band:** Under 18 / 18–24 / 25–34 / 35–44 / 45–54 / 55+

**Q15. Where did you hear about this survey?** *(single choice)*
- r/davidlynch
- r/TrueFilm
- Bates / school
- Twitter/X / Bluesky
- Other (text)

---

## How this data will be used in the scrollytelling

| Question | Visualization in the site |
|---|---|
| Q4 (when realized) | Scatter on the film timeline — when the audience caught up to Lynch |
| Q5 (most confusing) | Heat-map overlay on the scene timeline |
| Q6 (confidence) | Distribution chart, possibly faceted by Q1 (watch count) |
| Q7–Q11 (symbols) | Word clouds or themed clusters (manual coding pass needed) |
| Q12 (interpretation) | Pie / stacked bar showing reading frequencies |
| Q1 vs Q4/Q6 | Cross-tab: does watch count change comprehension? (Compelling if it does) |

## Manual coding pass after collection

Q7–Q11 are free text, so you'll spend ~1 hour manually tagging responses into 4–6 thematic buckets per question (e.g., for the blue box: "death", "memory", "Pandora's box", "unconscious", "Hollywood industry", "I have no idea"). Add a `theme_*` column per question to `survey_responses.csv` after coding. The bundler will pass it through verbatim.

## Posting templates

**Reddit (r/davidlynch):**
> **[Survey] Mulholland Drive viewer interpretations — 5 min, for a data-storytelling project**
> I'm building a scrollytelling site that maps the film's dream/reality structure with data, and I want to include how *people* actually read it on first watch. Anonymous, ~5 min, no login. Spoilers throughout. [Form link]

**r/TrueFilm:**
> Same as above but lead with: *"...building a scrollytelling piece for a CAUSEweb data-storytelling competition; one section visualizes how viewer interpretations split across the film."*

**School / personal network:**
> Casual ask, "if you've seen Mulholland Drive even once, mind helping me with a 5-min survey for a class project?"

## Don't block development on this

Run the survey *in parallel* with building the website. Sections 1–4 of the scrollytelling work without survey data; survey results splice into Section 5 (The Break) and Section 6 (Rewatching) once they arrive. **If you only get ~20 responses by competition deadline, that's still original data — show it as preliminary.**
