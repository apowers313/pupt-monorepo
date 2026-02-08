# [2.1.0](https://github.com/apowers313/pupt/compare/v2.0.1...v2.1.0) (2026-02-08)


### Features

* retire q, add kiro-cli ([22c3165](https://github.com/apowers313/pupt/commit/22c31650b8e4c2c3f3486c594480f691a9d757cf))

## [2.0.1](https://github.com/apowers313/pupt/compare/v2.0.0...v2.0.1) (2026-02-07)


### Bug Fixes

* remove migration command remenants ([30bedc9](https://github.com/apowers313/pupt/commit/30bedc912c5ccbff36aff7bec494e194e73e9095))
* windows path seperator bugs ([5ace9cd](https://github.com/apowers313/pupt/commit/5ace9cd0132d97e305261413b785b190a314d630))

# [2.0.0](https://github.com/apowers313/pupt/compare/v1.4.1...v2.0.0) (2026-02-06)


### Bug Fixes

* fix os-specific bugs found in ci ([38744ac](https://github.com/apowers313/pupt/commit/38744ac1cd97d3b7b6553bd6b36371fe9ab39228))
* update to latest pupt-lib ([54d63c1](https://github.com/apowers313/pupt/commit/54d63c15b4061a34e9448a4ffd5d47e42f1eb33b))


### Features

* refactor to use jsx prompt files and pupt-lib ([4289e56](https://github.com/apowers313/pupt/commit/4289e5695cca02db216aa321be0234f635f7d760))


### BREAKING CHANGES

* prompt files are no longer .md, they are now either .prompt or .tsx and use the JSX
format from pupt-lib

## [1.4.1](https://github.com/apowers313/pupt/compare/v1.4.0...v1.4.1) (2026-01-20)


### Bug Fixes

* fix 'pt install' to work with different package managers ([1683ebc](https://github.com/apowers313/pupt/commit/1683ebc799510143490bbb813de74aa18cb48846))

# [1.4.0](https://github.com/apowers313/pupt/compare/v1.3.2...v1.4.0) (2026-01-16)


### Bug Fixes

* semantic release ([5c4598f](https://github.com/apowers313/pupt/commit/5c4598fcaf0698d4751f3d9f00ca64d8087b78ad))
* windows path error ([c3bb870](https://github.com/apowers313/pupt/commit/c3bb8707e85a2be2a4b1dbd0800e234235d0c3b7))


### Features

* **history:** add directory-based filtering with git worktree support ([12be809](https://github.com/apowers313/pupt/commit/12be80975d44d202a10fda066c79898cf4613ff6))

## [1.3.2](https://github.com/apowers313/pupt/compare/v1.3.1...v1.3.2) (2025-12-06)


### Bug Fixes

* restore prompt inputs ([3aef0d6](https://github.com/apowers313/pupt/commit/3aef0d6eddacc8793fea1ab316317f152e6650a4))

## [1.3.1](https://github.com/apowers313/pupt/compare/v1.3.0...v1.3.1) (2025-11-13)


### Bug Fixes

* claude code 2.x parsing errors ([33a2b8c](https://github.com/apowers313/pupt/commit/33a2b8cdd10850a8245a63c4825b3ded73f2c6e3))
* config file migration when outputCapture is missing ([56881ac](https://github.com/apowers313/pupt/commit/56881ac18a56b7e881e6e494182d0c3abf3c8088))

# [1.3.0](https://github.com/apowers313/pupt/compare/v1.2.1...v1.3.0) (2025-10-26)


### Bug Fixes

* update to work with claude code v2, add knip delinting ([85f04e2](https://github.com/apowers313/pupt/commit/85f04e2afa9ec054837e41c4100458fb707008c9))


### Features

* **auto-annotation:** enhance service with improved path resolution and Claude integration ([4c04124](https://github.com/apowers313/pupt/commit/4c04124885bf2d84610b21e9a9d6f600354ec77f))

## [1.2.1](https://github.com/apowers313/pupt/compare/v1.2.0...v1.2.1) (2025-08-23)


### Bug Fixes

* claude init and auto annotation errors ([e062d50](https://github.com/apowers313/pupt/commit/e062d50f5955bd7584c4852d57b9dc7d2e5897f1))
* history and annotation cosmetic fixes ([2485846](https://github.com/apowers313/pupt/commit/24858465f1ae93b36fdfa5652534f2e7dc9d571d))
* prompt improvements, rename labels to tags, docs improvements ([d72fd8a](https://github.com/apowers313/pupt/commit/d72fd8a73b3ab51fc1f763db17d4fa97a34356fe))
* repo name, uninitialized claude directory ([549da3c](https://github.com/apowers313/pupt/commit/549da3cdbe2a1f1620e95ef7ec20804d47aed2a2))

# [1.2.0](https://github.com/apowers313/pupt/compare/v1.1.0...v1.2.0) (2025-08-22)


### Bug Fixes

* annotation cosmetic changes ([eb8c66f](https://github.com/apowers313/pupt/commit/eb8c66fac876c88514d5f8fb756afd96c0d70858))
* capture complete annotation data ([e6b6910](https://github.com/apowers313/pupt/commit/e6b6910f673d1cac0e3395edf48632cfe842e76b))


### Features

* finish review command, minor fixes ([8602e1f](https://github.com/apowers313/pupt/commit/8602e1f8188853587049d57d98077bdcbdfc13e7))

# [1.1.0](https://github.com/apowers313/pupt/compare/v1.0.2...v1.1.0) (2025-08-20)


### Features

* add output logging ([e5f64ce](https://github.com/apowers313/pupt/commit/e5f64ce547039e6684070d848b243ce84f6da18d))

## [1.0.2](https://github.com/apowers313/pupt/compare/v1.0.1...v1.0.2) (2025-08-19)


### Bug Fixes

* history elipsis alignment ([f90e06d](https://github.com/apowers313/pupt/commit/f90e06d739bdbc1d328c8e729bec79f1c42f16c0))
* history formatting, default directories, init command detection ([9483658](https://github.com/apowers313/pupt/commit/9483658245c5714d55b7f3ecd5f14875f05a6756))
* minor to file search ([ae6ba6f](https://github.com/apowers313/pupt/commit/ae6ba6fa21747f25408b184bd2505b28a62f673e))
* more consistent help command ([9b67376](https://github.com/apowers313/pupt/commit/9b6737606d0c23bcd07987890885104652a163b4))
* various bugs, add prompts, add design for new 'pt review' command ([0553a70](https://github.com/apowers313/pupt/commit/0553a704f07ecbb26d8e5106b0f741e822fde737))

## [1.0.1](https://github.com/apowers313/pupt/compare/v1.0.0...v1.0.1) (2025-08-17)


### Bug Fixes

* aesthetic cli changes ([478c0d3](https://github.com/apowers313/pupt/commit/478c0d3e51b2f9a76e49b8d082c96dea1c6f1da4))

# 1.0.0 (2025-08-16)


### Features

* add phase 2 designs and implementations ([14db363](https://github.com/apowers313/pupt/commit/14db363baf8700040a454d7549afad99e71d47c4))
* phase 3 features ([e5b5ddf](https://github.com/apowers313/pupt/commit/e5b5ddfa7e0a509dfbcedd24f96c68f4de185f68))
