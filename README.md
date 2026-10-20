# Investment Workbench · Public Preview

Version **0.1.0-preview.2**, candidate **c02_spatial_overview_candidate_20261020**.

This is a separate, owner-authorized publication of reviewed **static runtime artifacts**, model assets and public research excerpts. The original `Agent-OVO/investment-research-spatial-frontend` repository remains private and is the authoritative source. This repository has its own clean history; it is not a mirror, source backup or continuation of private Git history. Do not develop a parallel source branch here: make future source changes in the authoritative project, review the output, then publish a clearly versioned artifact snapshot.

[Open the preview](https://agent-ovo.github.io/investment-workbench-public-preview/) · [Release details](RELEASE.json) · [Component notices](THIRD_PARTY_NOTICES.md)

The input is the 2026-10-20 C02 spatial-overview candidate, not the older saved C02 branch. Input ZIP SHA-256: `444da1e6bebd2ead2427d13379624b0af1b4a7b79fb5441d468d3ab3f3cba410`. The original source-inventory fingerprint is `823c3fc9345f1a081dba9f34688fc0506a9bb30d22aef2e5a172fe8124db044c`. These identify the received source; the current runtime bytes are independently listed in `PUBLIC_RUNTIME_MANIFEST.json`.

## Build and changes

The isolated source copy was adapted for public distribution, then built with Node.js 24.12.0 using `node continuity/archive-manifest.mjs --write` and `node continuity/build.mjs`. Static output was reviewed and its site-root references and catalog route validation were adapted to `/investment-workbench-public-preview/`. Source files, private audits, credentials, source ZIPs and historic acceptance logs are excluded. `.nojekyll` makes Pages publish the static files directly.

Personal provenance paths and source-only metadata were removed; required runtime manifests remain. Bank history CSV/ZIP and their derived valuation display are withheld because redistribution permission has not been established. The bank public edition explicitly marks this reduced scope; the original received document is preserved privately. Current bank downloads are the scope README and issuer-source links, not a full offline reproduction bundle.

Three.js, Marble001, swisstopo and inherited project notices are retained. The C01 page points to public release details. No account integration or remote note storage is implemented. Review notes stay in the visitor's browser and can be exported locally.

## Local viewing

Keep this checkout named `investment-workbench-public-preview`. From its parent directory, run `python -c "import http.server,mimetypes; mimetypes.add_type('image/svg+xml','.svg'); http.server.test(bind='127.0.0.1',port=4173)"`, then open `http://127.0.0.1:4173/investment-workbench-public-preview/`. HTTPS or localhost is required for model SHA-256 verification.

[Actual browser observations and matched screenshots](VISUAL_REVIEW.md) cover the full homepage, research and model pages, selected navigation, narrow viewports and failure states. WebGL used SwiftShader software rendering; no hardware GPU or owner visual acceptance is claimed. Historical 595 offline checks are not evidence of this build's visual acceptance.


## 0.1.0-preview.2

Current public revision: [`v0.1.0-preview.2`](https://github.com/Agent-OVO/investment-workbench-public-preview/commit/v0.1.0-preview.2). The exact published commit is resolved by this release tag. Rollback baseline: `ce0124664c87b43cc402a37b6c10ada06d391cb7`.

C02 now uses compact peripheral indexes, a central judgment, smaller and mildly angled glass carriers, matching physical supports, four reading paths, an original seal motif and quieter stone/glass/brass materials. Camera and received GLB bytes are unchanged; runtime geometry is changed. The isolated adapted-source archive remains private; its SHA-256 is `70f78f4531ef930baa7bb9deffb210b9e98fc6c05ad90dfdec37065970111851`. The original private repository remains the sole source authority and was not edited.

[New comparison and focused browser observations](visual-review.html). Restore the rollback snapshot through a new reviewed commit; do not rewrite the publication history. Source handoff and subsequent integration into the private authority are separate from this artifact release.
