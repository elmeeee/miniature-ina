# Character extraction report

The original `assets/source/characters-sheet.png` is present on `main`. Pixel validation found a 1536 × 1024 PNG with fully opaque pixels and no pixel transparency. No crops have been approved. The manifest is empty, and all twelve characters use initials. Review the background, face boundaries and identities before approving any crops. The current extractor requires at least one fully opaque pixel in each crop. See the [validation report](asset-validation.json).

## Review and extract

1. Place the original PNG at the specified source path. Keep that file intact.
2. Run `npm run assets:validate` to report the PNG dimensions, alpha usage and source SHA-256.
3. Review the original at native resolution. Match each depicted person against approved concept art or a labeled sheet. Use manual editing or regeneration if identities, boundaries or clipped features cannot be resolved. A checkerboard printed into a PNG is not transparent.
4. In `assets/source/extraction-plan.json`, enter the reported `sourceSha256` and add one record per approved crop. Fields are `characterId`, `variant` (portrait or expression), `left`, `top`, `width`, `height` and `reviewed`. Coordinates are integer pixels from the upper-left corner. Mark `reviewed: true` after checking identity and framing. Leave missing expressions out of the plan.
5. Run `npm run assets:extract`, then `npm run assets:validate`. Review the extracted art over light and dark backgrounds, including halos around faces and hair, and check each expression against the corresponding character.

The script creates category folders on demand, refuses to overwrite different artwork, checks crop bounds and minimum size, rejects exact duplicate rendered pixels, and reads alpha values from actual pixels. Fully opaque files are reported as such and can be used as rectangular portraits. Alpha and pixel comparisons cannot establish identity, visual quality or whether altered crops depict the same expression. Those decisions require visual review.
