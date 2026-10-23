# Real social posts as translated cards

When a video covers news, show the actual posts. Don't paraphrase them into generic graphics.

## The look

- A faithful card: real avatar, display name, verification badge (individual blue, organisation gold, government grey), handle, date and time, reply / repost / like / view counts, and the original photos or video playing inside the card.
- **Original-language text first.** About 2.5 s later, a translation note slides up and covers the body text, with a small 译 marker in the corner. Media is never covered.
- On a hand-drawn background, the card is "taped" on, slightly rotated, with a slow push-in. Add a tape SFX when it lands and a paper SFX when the translation covers it.
- Give a card shot at least 6–7 s (the `Min` column), so the original stays readable for ≥ 2.5 s.
- When a post's text is truncated in the API, show "Show more" as X does. Don't invent the rest.

## Fetching

```bash
python3 tools/fetch_posts.py <handle>/status/<id> ...
```

- The script uses `https://api.fxtwitter.com/<handle>/status/<id>`, which needs no auth. A profile timeline is at `/2/profile/<handle>/statuses`.
- Download media with a browser User-Agent. Request avatars at `_400x400`.
- Output goes to `public/x/posts.json` plus the image and video files. Translations go in `src/translations.js` keyed by post id.
- **Translation rules.** Translate faithfully, without commentary. Keep the original's typos. Translate quoted posts too.

## Integrity rules

- Use only real posts, each attributed to its author and date. Credit all the post URLs on the end card or in the description.
- **For a deleted post,** use `DeletedPost`: name, date, "原帖已删除" (post deleted), and only media with a clear provenance (e.g. the same demo the author later published elsewhere), with the source named. Never reconstruct the text.
- **Don't use a post or promo video that doesn't clearly show the topic.** Log the rejection in the decision log.
- **Official warnings** (national CERTs, cyber agencies, law enforcement) carry weight in news videos. If the specific agency the creator asked for has no post, say so and use the closest real one, e.g. a sub-agency. Log the substitution.
