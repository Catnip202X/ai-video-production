#!/usr/bin/env python3
"""从 X 取回真实帖子（经 fxtwitter API）：原文、作者、时间、头像、原配图/视频 → public/x/posts.json。
用法：python3 tools/fetch_posts.py <handle/status/id> ...（不带参数时用 POSTS 列表）
个人主页时间线：https://api.fxtwitter.com/2/profile/<handle>/statuses"""
import json, os, subprocess, sys, urllib.request

POSTS = """
""".split()  # 每行若干个 handle/status/id，或直接在命令行传

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "x")
UA = "Mozilla/5.0"


def get(url, dst):
    if not os.path.exists(dst):
        subprocess.run(["curl", "-s", "-L", "-m", "120", "-A", UA, "-o", dst, url], check=True)


def fetch(path):
    req = urllib.request.Request("https://api.fxtwitter.com/" + path, headers={"User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=30))["tweet"]


def badge(author):
    v = author.get("verification") or {}
    return v.get("type") if v.get("verified") else None


def main():
    os.makedirs(OUT, exist_ok=True)
    posts = {}
    for path in sys.argv[1:] or POSTS:
        t = fetch(path)
        a = t["author"]
        get(a["avatar_url"].replace("_200x200", "_400x400"), f"{OUT}/av_{a['screen_name']}.jpg")
        media = []
        for i, m in enumerate((t.get("media") or {}).get("all", [])):
            fn = f"{t['id']}_{i}.{'mp4' if m['type'] in ('video', 'gif') else 'jpg'}"
            get(m["url"], f"{OUT}/{fn}")
            media.append({"type": m["type"], "file": fn, "w": m["width"], "h": m["height"]})
        q = t.get("quote")
        if q:
            get(q["author"]["avatar_url"].replace("_200x200", "_400x400"), f"{OUT}/av_{q['author']['screen_name']}.jpg")
        posts[t["id"]] = {
            "id": t["id"], "url": t["url"], "name": a["name"], "handle": a["screen_name"], "badge": badge(a),
            "avatar": f"av_{a['screen_name']}.jpg", "text": t["text"], "created": t["created_timestamp"],
            "views": t.get("views"), "likes": t["likes"], "retweets": t["retweets"], "replies": t["replies"],
            "media": media,
            "quote": q and {"name": q["author"]["name"], "handle": q["author"]["screen_name"], "text": q["text"],
                            "avatar": f"av_{q['author']['screen_name']}.jpg", "created": q.get("created_timestamp"),
                            "badge": badge(q["author"])},
        }
        print(t["id"], a["screen_name"], [m["file"] for m in media])
    json.dump(posts, open(f"{OUT}/posts.json", "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
