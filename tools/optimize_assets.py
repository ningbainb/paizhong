#!/usr/bin/env python3
"""
按 UI 实际显示尺寸压缩 assets 下的 JPG。
路径与文件名保持不变，游戏代码无需改动。

用法（仓库根目录）:
  python tools/optimize_assets.py
  python tools/optimize_assets.py --dry-run
"""

from __future__ import annotations

import argparse
import io
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def rule_for(path: Path) -> tuple[int, int]:
    """返回 (max_edge, jpeg_quality)。"""
    rel = path.relative_to(ASSETS).as_posix()
    folder = rel.split("/", 1)[0]
    name = path.name.lower()

    if folder == "icons":
        return 128, 82
    if folder in ("qipai", "xinfa", "hands", "achieve", "diff", "sects"):
        return 256, 82
    if folder == "chars":
        return 512, 82
    if folder == "cards":
        return 384, 82
    if folder == "fx":
        return 1280, 78
    if folder == "shell":
        return 1280, 78
    if folder == "ui":
        if name.startswith("frame_") or name == "card_back.jpg":
            return 480, 80
        if "banner" in name or name.endswith("_bg.jpg") or name in {
            "title_bg.jpg", "table_felt.jpg", "shop_bg.jpg", "map_bg.jpg",
            "result_bg.jpg", "char_bg.jpg", "mode_bg.jpg", "help_bg.jpg",
            "codex_bg.jpg", "rank_bg.jpg", "meta_bg.jpg",
        }:
            return 1280, 78
        if name in {"seal.jpg", "enemy.jpg", "boss.jpg", "enemy_boss.jpg"}:
            return 256, 82
        if "guide/" in rel or path.parent.name == "guide":
            return 256, 82
        return 512, 80
    return 720, 80


def optimize_one(path: Path, dry_run: bool = False) -> tuple[int, int, str]:
    before = path.stat().st_size
    max_edge, quality = rule_for(path)

    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", im.size, (12, 14, 20))
            src = im.convert("RGBA")
            bg.paste(src, mask=src.split()[-1] if src.mode == "RGBA" else None)
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")

        w, h = im.size
        long_edge = max(w, h)
        if long_edge > max_edge:
            scale = max_edge / long_edge
            nw = max(1, int(round(w * scale)))
            nh = max(1, int(round(h * scale)))
            im = im.resize((nw, nh), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        im.save(
            buf,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
            subsampling=2,
        )
        data = buf.getvalue()

    after = len(data)
    # 若压缩后反而更大（极少见），保留原文件
    if after >= before:
        return before, before, "skip-larger"

    if not dry_run:
        path.write_bytes(data)
    return before, after, f"max{max_edge}/q{quality}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = sorted(ASSETS.rglob("*.jpg"))
    if not files:
        print("No jpg files found under assets/")
        return 1

    total_before = 0
    total_after = 0
    changed = 0
    for path in files:
        before, after, note = optimize_one(path, dry_run=args.dry_run)
        total_before += before
        total_after += after
        if after < before:
            changed += 1
            pct = 100 * (1 - after / before)
            print(
                f"{'DRY ' if args.dry_run else ''}"
                f"{before/1024:7.1f}KB → {after/1024:6.1f}KB  ({pct:5.1f}%↓)  "
                f"{path.relative_to(ROOT).as_posix()}  [{note}]"
            )

    print()
    print(
        f"{'Would save' if args.dry_run else 'Saved'}: "
        f"{changed}/{len(files)} files, "
        f"{total_before/1024/1024:.2f} MB → {total_after/1024/1024:.2f} MB "
        f"({100 * (1 - total_after / total_before):.1f}% smaller)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
