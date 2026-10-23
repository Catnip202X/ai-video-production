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

**Uploading, posting, replying and messaging are public actions. Get the creator's explicit OK for each one,** with the final title, category, publish time and file shown.

Prepare `upload.json` next to the render:

```json
{
  "title": "...", "description": "...（资料来源、AI 声明）", "tags": ["...", "..."],
  "tid": 231, "video_path": ".../final.mp4",
  "cover_path": ".../cover_16x9.png", "cover43_path": ".../cover_4x3.png",
  "publish_time": "YYYY-MM-DD HH:MM", "ai_content": true
}
```

- **Category IDs (`tid`):**
  - The category table built into older code is out of date. For example, 188 科技资讯 no longer exists, and 231 is now 科技 → 计算机技术.
  - Bilibili silently files an unknown ID under 生活 → 日常.
  - The fork rejects unknown IDs. Look current ones up in `bilibili_api/data/video_uploader_meta_pre.json`, or with `bili_video_zones`.
  - Tech explainers go in **231**.
- **`publish_time`:** the server's **local** time, 2 hours to 15 days ahead. If the audience is in another time zone (e.g. Beijing 08:00), convert first. A time that is too close rolls to the next slot.
- **Covers:** 16:9 (1920×1080) and 4:3 (1440×1080) stills rendered from the Remotion project.
- **`ai_content: true`:** sets the "含AI生成内容" declaration. Use it for AI voiceover or AI-generated visuals.
- **Description:** sources (post URLs, data sources) plus the AI-content note. Tags: ≤ 12, with series base tags first.
- **Content ID:** mute embedded third-party clips that contain music before uploading.
