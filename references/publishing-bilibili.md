# Publishing to Bilibili

Upload with the patched **bilibili-mcp** fork: <https://github.com/Catnip202X/bilibili-mcp/tree/patched>.

It extends [adoresever/bilibili-mcp](https://github.com/adoresever/bilibili-mcp) with:

- a working QR login
- scheduled publishing, a 4:3 cover and the AI-content declaration on `bili_upload_video`
- a validated category list
- an encrypted credential vault, so the AI client can *use* the login but never *read* it

## Install

```bash
git clone -b patched https://github.com/Catnip202X/bilibili-mcp.git ~/bilibili-mcp
cd ~/bilibili-mcp
python3.11 -m venv .venv && .venv/bin/pip install --require-hashes -r requirements.lock
claude mcp add --scope user bilibili -- ~/bilibili-mcp/.venv/bin/python ~/bilibili-mcp/mcp_server.py
```

Then add Claude Code deny rules so the assistant cannot weaken the vault:

- deny `Edit`/`Write` on `~/bilibili-mcp/secure_store.py`
- deny `Edit`/`Write` on `~/bilibili-mcp/bili_credential.enc`
- deny `Read` on `~/bilibili-mcp/bili_credential.enc`

## Credential vault rules (for the assistant)

- **Never read, decrypt or work around the vault.** That means:
  - no shell reads of the `.enc`
  - no scripts that import `secure_store`
  - no code changes that log keys
- **If a tool reports the vault is "locked",** ask the creator to retry the passphrase in the macOS dialog. If the passphrase is forgotten, the creator deletes the `.enc` themselves and logs in again.
- **Restarting the server:** kill the `mcp_server.py` process. The next tool call respawns it with the new code, still logged in.

## Uploading

**Uploading runs without a per-upload confirmation** — the creator granted a standing authorization on 2026-10-25: prepare the metadata, upload, then report the BV, title, category and publish time. Ask first only for catastrophic cases: an irreversible overwrite or loss of the creator's work, a wrong account or wrong target, money outside an approved budget, or anything that would expose credentials.

Prepare `upload.json` next to the render:

```json
{
  "title": "...", "description": "...（资料来源、AI 声明）", "tags": ["...", "..."],
  "tid": 231, "video_path": ".../final.mp4",
  "cover_path": ".../cover_16x9.png", "cover43_path": ".../cover_4x3.png",
  "publish_time": "YYYY-MM-DD HH:MM", "ai_content": true,
  "season_id": 0
}
```

- **Category IDs (`tid`):**
  - The category table built into older code is out of date. For example, 188 科技资讯 no longer exists, and 231 is now 科技 → 计算机技术.
  - Bilibili silently files an unknown ID under 生活 → 日常.
  - The fork rejects unknown IDs. Look current ones up in `bilibili_api/data/video_uploader_meta_pre.json`, or with `bili_video_zones`.
  - Tech explainers go in **231**.
- **`publish_time`:** the server's **local** time, 2 hours to 15 days ahead. If the audience is in another time zone (e.g. Beijing 08:00), convert first. A time that is too close rolls to the next slot.
- **Covers — both ratios, every upload.** Bilibili shows a 16:9 crop on some surfaces and a 4:3 crop on others, so the upload carries two separate stills rendered from the same Remotion project and the same design:
  - `cover_16x9.png` — 1920×1080 → `cover_path`
  - `cover_4x3.png` — 1440×1080 → `cover43_path`
  Neither is optional: with one missing, stop and tell the creator instead of uploading with a single ratio. Stills render at frame 0, so draw every shape with a negative `at`.
- **`ai_content: true`:** sets the "含AI生成内容" declaration. Use it for AI voiceover or AI-generated visuals.
- **`season_id` — the collection (新版合集).** Bilibili's submit endpoint (`x/vu/web/add/v3`) takes no collection field, so a collection is joined *after* upload: take the new `aid`, look up the collection's first section, and POST it to `x2/creative/web/season/section/episodes/add`. Two hard limits:
  - The write needs a **section_id**, not a season_id — `bili_seasons` returns both. `bili_set_season(bvid=..., season_id=...)` does the whole thing for one existing video.
  - A scheduled-but-unpublished video **cannot** be added (Bilibili answers `62003 稿件已审核通过，等待发布中`). So the add after upload usually fails on a timed release, and the video joins once it actually goes live. Run the collection sync (`pipeline/season_sync.py`) on a timer instead of once at upload: it adds every published video that is missing from the collection and treats `62003` as "not yet, retry next tick". `20080` (already in the collection) counts as success, so the sync is idempotent.
  - Space the sync out — hitting the member endpoints every few minutes with full credentials earns a `412` risk-control page, which is why the sync throttles itself and treats `412` as "skip this round".
- **Description:** sources (post URLs, data sources) plus the AI-content note. Tags: at most 10 (Bilibili rejects more at init, `tags 不合法或者多于 10 个`), with series base tags first.
- **Content ID:** mute embedded third-party clips that contain music before uploading.
