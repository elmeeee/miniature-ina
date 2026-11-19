# Character extraction report

The 1536 × 1024 character sheet contains 35 portrait tiles and eight expressions for Bima. The [crop plan](../../assets/source/extraction-plan.json) records reviewed rectangles and the source checksum. Each crop keeps its source background. Pixel validation found the sheet and all crops fully opaque.

Bima Aditya Pratama and Anindita Prameswari are linked to the playable roster. Other crops keep the identities or role labels printed on the sheet and are listed separately in [sheet identities](../../assets/source/sheet-identities.json). For example, Laras Prameswari and Maya Kusumadewi are separate from Ratna Kusuma and Maya Santoso. The sheet also depicts Dewi Lestari as KPK chair, while the playable roster defines a civil-society figure with that name, so the crop is catalogued separately pending identity confirmation. The other ten active characters use initials. See the [validation report](asset-validation.json).

## Review and extract

1. Place the original PNG at the specified source path. Keep that file intact.
2. Run `npm run assets:validate` to report the PNG dimensions, alpha usage and source SHA-256.
3. Review the original at native resolution. Match each depicted person against approved concept art or a labeled sheet. Use manual editing or regeneration if identities, boundaries or clipped features cannot be resolved. A checkerboard printed into a PNG is not transparent.
4. In `assets/source/extraction-plan.json`, enter the reported `sourceSha256` and add one record per approved crop. Fields are `characterId`, `variant` (portrait or expression), `left`, `top`, `width`, `height` and `reviewed`. Coordinates are integer pixels from the upper-left corner. Mark `reviewed: true` after checking identity and framing. Leave missing expressions out of the plan.
5. Run `npm run assets:extract`, then `npm run assets:validate`. Review the extracted art over light and dark backgrounds, including halos around faces and hair, and check each expression against the corresponding character.

The script creates category folders on demand, refuses to overwrite different artwork, checks crop bounds and minimum size, rejects exact duplicate rendered pixels, and reads alpha values from actual pixels. Fully opaque files are reported as such and can be used as rectangular portraits. Alpha and pixel comparisons cannot establish identity, visual quality or whether altered crops depict the same expression. Those decisions require visual review.
