#!/bin/zsh
# 把项目的逐句配音和时间线同步进 Remotion（每次 assemble_vo.py 之后运行）。
# 用法：tools/sync_vo.sh <项目文件夹> [VO 版本，默认 v1]
P="${1:?用法：tools/sync_vo.sh <项目文件夹> [v1]}"
V="${2:-v1}"
M="${0:A:h}/.."
rsync -a --delete --exclude '*.try*' --exclude '*.json' --exclude 'VO full*' "$P/Audio Tracks/VO $V/" "$M/public/vo/"
cp "$P/Audio Tracks/VO $V/timeline.json" "$M/src/timeline.json"
