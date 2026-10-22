#!/usr/bin/env bash
# 把整个闯关岛（含 math/、physics/、audio/）推到 GitHub Pages。每次批改/物理更新后运行。
# 首次需要：GitHub 上已建公开仓库 winren79/xuanxuan-island，且本机 git 已有推送权限（家长在自己的会话里 gh auth login 一次）。
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${REPO:-https://github.com/winren79/xuanxuan-island.git}"
touch .nojekyll
[ -d .git ] || { git init -q -b main; git remote add origin "$REPO"; }
git add -A
git -c user.name="xuanxuan-bot" -c user.email="bot@local" commit -qm "update $(date '+%F %T')" || echo "无改动"
git push -u origin main
# 首次推送后，在仓库 Settings → Pages 选 main / root，或：gh api -X POST repos/winren79/xuanxuan-island/pages -f source[branch]=main -f source[path]=/
URL="https://winren79.github.io/xuanxuan-island"
for p in index.html math/index.html variants.html audio/voice/praise_1.mp3 physics/index.html; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$URL/$p")" "$p"; done
cd .. && python3 -c "import shutil;shutil.make_archive('xuanxuan-game','zip','.','xuanxuan-game')" && echo "zip 已更新"
