# 4.0.0 (2026-02-17)

### 🚀 Features

- switch to using global config ([a92dda2](https://github.com/apowers313/pupt-monorepo/commit/a92dda2))
- upgrade pupt-lib and use new prompt components ([c31f66a](https://github.com/apowers313/pupt-monorepo/commit/c31f66a))
- retire q, add kiro-cli ([d1363a7](https://github.com/apowers313/pupt-monorepo/commit/d1363a7))
- ⚠️  refactor to use jsx prompt files and pupt-lib ([a0913df](https://github.com/apowers313/pupt-monorepo/commit/a0913df))
- **history:** add directory-based filtering with git worktree support ([163028b](https://github.com/apowers313/pupt-monorepo/commit/163028b))
- **auto-annotation:** enhance service with improved path resolution and Claude integration ([cac9b56](https://github.com/apowers313/pupt-monorepo/commit/cac9b56))
- finish review command, minor fixes ([fbe6dbc](https://github.com/apowers313/pupt-monorepo/commit/fbe6dbc))
- add output logging ([8e4c2c1](https://github.com/apowers313/pupt-monorepo/commit/8e4c2c1))
- phase 3 features ([6097c68](https://github.com/apowers313/pupt-monorepo/commit/6097c68))
- add phase 2 designs and implementations ([40224f9](https://github.com/apowers313/pupt-monorepo/commit/40224f9))

### 🩹 Fixes

- move prompts so that they are imported, various lint and bug fixes ([b79f6e5](https://github.com/apowers313/pupt-monorepo/commit/b79f6e5))
- rename packages, move to monorepo ([eaa74f2](https://github.com/apowers313/pupt-monorepo/commit/eaa74f2))
- adopt new pupt-lib regexp fixes ([d76b568](https://github.com/apowers313/pupt-monorepo/commit/d76b568))
- fix init, rename prompts dir ([98f6985](https://github.com/apowers313/pupt-monorepo/commit/98f6985))
- potential infinite loop in input collection ([3e5da86](https://github.com/apowers313/pupt-monorepo/commit/3e5da86))
- update to latest pupt-lib and apply bug fixes ([0a63ecb](https://github.com/apowers313/pupt-monorepo/commit/0a63ecb))
- use kiro-cli chat for prompts ([2472d71](https://github.com/apowers313/pupt-monorepo/commit/2472d71))
- windows path seperator bugs ([e89b566](https://github.com/apowers313/pupt-monorepo/commit/e89b566))
- remove migration command remenants ([2d45d03](https://github.com/apowers313/pupt-monorepo/commit/2d45d03))
- fix os-specific bugs found in ci ([53ac16d](https://github.com/apowers313/pupt-monorepo/commit/53ac16d))
- update to latest pupt-lib ([8924614](https://github.com/apowers313/pupt-monorepo/commit/8924614))
- fix 'pt install' to work with different package managers ([ece0be3](https://github.com/apowers313/pupt-monorepo/commit/ece0be3))
- semantic release ([d977668](https://github.com/apowers313/pupt-monorepo/commit/d977668))
- windows path error ([46ec8dd](https://github.com/apowers313/pupt-monorepo/commit/46ec8dd))
- claude code 2.x parsing errors ([086cae1](https://github.com/apowers313/pupt-monorepo/commit/086cae1))
- config file migration when outputCapture is missing ([2edc2e8](https://github.com/apowers313/pupt-monorepo/commit/2edc2e8))
- update to work with claude code v2, add knip delinting ([e6d33ce](https://github.com/apowers313/pupt-monorepo/commit/e6d33ce))
- claude init and auto annotation errors ([0fbe7a7](https://github.com/apowers313/pupt-monorepo/commit/0fbe7a7))
- repo name, uninitialized claude directory ([16e53ba](https://github.com/apowers313/pupt-monorepo/commit/16e53ba))
- prompt improvements, rename labels to tags, docs improvements ([0c80694](https://github.com/apowers313/pupt-monorepo/commit/0c80694))
- history and annotation cosmetic fixes ([cfc01ea](https://github.com/apowers313/pupt-monorepo/commit/cfc01ea))
- capture complete annotation data ([0a81892](https://github.com/apowers313/pupt-monorepo/commit/0a81892))
- annotation cosmetic changes ([e1072fb](https://github.com/apowers313/pupt-monorepo/commit/e1072fb))
- minor to file search ([0efa525](https://github.com/apowers313/pupt-monorepo/commit/0efa525))
- more consistent help command ([0e027f4](https://github.com/apowers313/pupt-monorepo/commit/0e027f4))
- history elipsis alignment ([48ebf0b](https://github.com/apowers313/pupt-monorepo/commit/48ebf0b))
- history formatting, default directories, init command detection ([2570e5d](https://github.com/apowers313/pupt-monorepo/commit/2570e5d))
- various bugs, add prompts, add design for new 'pt review' command ([b85a4dd](https://github.com/apowers313/pupt-monorepo/commit/b85a4dd))
- aesthetic cli changes ([ed9cd39](https://github.com/apowers313/pupt-monorepo/commit/ed9cd39))

### ⚠️  Breaking Changes

- refactor to use jsx prompt files and pupt-lib  ([a0913df](https://github.com/apowers313/pupt-monorepo/commit/a0913df))
  prompt files are no longer .md, they are now either .prompt or .tsx and use the JSX
  format from pupt-lib

### 🧱 Updated Dependencies

- Updated @pupt/lib to 1.5.0

## 1.5.0 (2026-02-17)

### 🚀 Features

- more robust and complete components framework for extensibility and flexibility ([f85a763](https://github.com/apowers313/pupt-monorepo/commit/f85a763))
- add variables between components ([#10](https://github.com/apowers313/pupt-monorepo/issues/10), [#11](https://github.com/apowers313/pupt-monorepo/issues/11))
- add zod prop validation for all components ([b18ab8b](https://github.com/apowers313/pupt-monorepo/commit/b18ab8b))
- initial commit ([9db6bae](https://github.com/apowers313/pupt-monorepo/commit/9db6bae))

### 🩹 Fixes

- move prompts so that they are imported, various lint and bug fixes ([b79f6e5](https://github.com/apowers313/pupt-monorepo/commit/b79f6e5))
- rename packages, move to monorepo ([eaa74f2](https://github.com/apowers313/pupt-monorepo/commit/eaa74f2))
- use jsx fragments rather than regexp preprocessing to fix regexp bugs ([ca7c1d9](https://github.com/apowers313/pupt-monorepo/commit/ca7c1d9))
- make git branch an option for module loading ([f3eb27c](https://github.com/apowers313/pupt-monorepo/commit/f3eb27c))
- more verbose module loading api ([119b31f](https://github.com/apowers313/pupt-monorepo/commit/119b31f))
- refactor prompt and component modules ([7f096c1](https://github.com/apowers313/pupt-monorepo/commit/7f096c1))
- detect conflicting Format strict + ChainOfThought instructions ([#36](https://github.com/apowers313/pupt-monorepo/issues/36))
- stop Role from appending disjointed text when children are specified ([#37](https://github.com/apowers313/pupt-monorepo/issues/37))
- preserve whitespace in prompt text ([#25](https://github.com/apowers313/pupt-monorepo/issues/25))
- remove import scanning, depend on file names for syntactic sugar instead ([#29](https://github.com/apowers313/pupt-monorepo/issues/29))
- change require() calls to dynamic imports for ESM compatibility ([#30](https://github.com/apowers313/pupt-monorepo/issues/30))
- resolution of esm imports ([d360fbd](https://github.com/apowers313/pupt-monorepo/commit/d360fbd))
- missing url import ([35021cd](https://github.com/apowers313/pupt-monorepo/commit/35021cd))
- change default prompt output to markdown ([ca1c947](https://github.com/apowers313/pupt-monorepo/commit/ca1c947))
- add type exports after refactoring ([be187ff](https://github.com/apowers313/pupt-monorepo/commit/be187ff))
- ask components should never return undefined ([d9f7175](https://github.com/apowers313/pupt-monorepo/commit/d9f7175))
- specify relationship between llm model and llm provider ([8d75971](https://github.com/apowers313/pupt-monorepo/commit/8d75971))
- bundle dependencies in build ([aa74d8a](https://github.com/apowers313/pupt-monorepo/commit/aa74d8a))
- add trailing newline to structural components and default AskConfirm to false ([#15](https://github.com/apowers313/pupt-monorepo/issues/15))
- child and input rendering ([42a6b42](https://github.com/apowers313/pupt-monorepo/commit/42a6b42))
- make component export schemas optional, as originally intended ([a54fc55](https://github.com/apowers313/pupt-monorepo/commit/a54fc55))
- throw error when component lacks static schema ([#6](https://github.com/apowers313/pupt-monorepo/issues/6))
- add Component base class to preprocessor auto-imports ([#5](https://github.com/apowers313/pupt-monorepo/issues/5))
- add Option and Label to Ask namespace ([#4](https://github.com/apowers313/pupt-monorepo/issues/4))
- resolve structural component rendering issues ([#1](https://github.com/apowers313/pupt-monorepo/issues/1), [#2](https://github.com/apowers313/pupt-monorepo/issues/2), [#3](https://github.com/apowers313/pupt-monorepo/issues/3))
- async rendering for async components ([f779f39](https://github.com/apowers313/pupt-monorepo/commit/f779f39))
- minisearch import ([3919d78](https://github.com/apowers313/pupt-monorepo/commit/3919d78))
- remove remaining browser-incompatible imports ([164ce96](https://github.com/apowers313/pupt-monorepo/commit/164ce96))
- browser imports and exports, e2e tests and coverage ([70b758c](https://github.com/apowers313/pupt-monorepo/commit/70b758c))
- fix imports for .tsx files ([319462d](https://github.com/apowers313/pupt-monorepo/commit/319462d))
- rename components with Ask prefix and add non-interactive input mode ([0e6d500](https://github.com/apowers313/pupt-monorepo/commit/0e6d500))

## 1.3.0 (2026-02-17)

### 🚀 Features

- add react components for parity with pupt-lib ([737b6c5](https://github.com/apowers313/pupt-monorepo/commit/737b6c5))
- **demo:** add environment panel and adaptive example ([2aff0dd](https://github.com/apowers313/pupt-monorepo/commit/2aff0dd))
- initial commit ([ae03026](https://github.com/apowers313/pupt-monorepo/commit/ae03026))

### 🩹 Fixes

- move prompts so that they are imported, various lint and bug fixes ([b79f6e5](https://github.com/apowers313/pupt-monorepo/commit/b79f6e5))
- rename packages, move to monorepo ([eaa74f2](https://github.com/apowers313/pupt-monorepo/commit/eaa74f2))
- fix unwrapJsx prompt processing that was breaking imports ([7b08dff](https://github.com/apowers313/pupt-monorepo/commit/7b08dff))
- update to latest pupt-lib for bug fixes ([096e8ef](https://github.com/apowers313/pupt-monorepo/commit/096e8ef))
- smarter search component that uses prompt metadata ([fc58374](https://github.com/apowers313/pupt-monorepo/commit/fc58374))
- update pupt-lib, fix rendering glitch ([494560b](https://github.com/apowers313/pupt-monorepo/commit/494560b))
- trusted publishing ([20bce8b](https://github.com/apowers313/pupt-monorepo/commit/20bce8b))
- clean up demos ([4aeaebc](https://github.com/apowers313/pupt-monorepo/commit/4aeaebc))
- minor demo fixes for usability ([b395123](https://github.com/apowers313/pupt-monorepo/commit/b395123))

### 🧱 Updated Dependencies

- Updated @pupt/lib to 1.5.0

# 3.0.0 (2026-02-17)

### 🚀 Features

- switch to using global config ([a92dda2](https://github.com/apowers313/pupt-monorepo/commit/a92dda2))
- upgrade pupt-lib and use new prompt components ([c31f66a](https://github.com/apowers313/pupt-monorepo/commit/c31f66a))
- retire q, add kiro-cli ([d1363a7](https://github.com/apowers313/pupt-monorepo/commit/d1363a7))
- ⚠️  refactor to use jsx prompt files and pupt-lib ([a0913df](https://github.com/apowers313/pupt-monorepo/commit/a0913df))
- **history:** add directory-based filtering with git worktree support ([163028b](https://github.com/apowers313/pupt-monorepo/commit/163028b))
- **auto-annotation:** enhance service with improved path resolution and Claude integration ([cac9b56](https://github.com/apowers313/pupt-monorepo/commit/cac9b56))
- finish review command, minor fixes ([fbe6dbc](https://github.com/apowers313/pupt-monorepo/commit/fbe6dbc))
- add output logging ([8e4c2c1](https://github.com/apowers313/pupt-monorepo/commit/8e4c2c1))
- phase 3 features ([6097c68](https://github.com/apowers313/pupt-monorepo/commit/6097c68))
- add phase 2 designs and implementations ([40224f9](https://github.com/apowers313/pupt-monorepo/commit/40224f9))

### 🩹 Fixes

- move prompts so that they are imported, various lint and bug fixes ([b79f6e5](https://github.com/apowers313/pupt-monorepo/commit/b79f6e5))
- rename packages, move to monorepo ([eaa74f2](https://github.com/apowers313/pupt-monorepo/commit/eaa74f2))
- adopt new pupt-lib regexp fixes ([d76b568](https://github.com/apowers313/pupt-monorepo/commit/d76b568))
- fix init, rename prompts dir ([98f6985](https://github.com/apowers313/pupt-monorepo/commit/98f6985))
- potential infinite loop in input collection ([3e5da86](https://github.com/apowers313/pupt-monorepo/commit/3e5da86))
- update to latest pupt-lib and apply bug fixes ([0a63ecb](https://github.com/apowers313/pupt-monorepo/commit/0a63ecb))
- use kiro-cli chat for prompts ([2472d71](https://github.com/apowers313/pupt-monorepo/commit/2472d71))
- windows path seperator bugs ([e89b566](https://github.com/apowers313/pupt-monorepo/commit/e89b566))
- remove migration command remenants ([2d45d03](https://github.com/apowers313/pupt-monorepo/commit/2d45d03))
- fix os-specific bugs found in ci ([53ac16d](https://github.com/apowers313/pupt-monorepo/commit/53ac16d))
- update to latest pupt-lib ([8924614](https://github.com/apowers313/pupt-monorepo/commit/8924614))
- fix 'pt install' to work with different package managers ([ece0be3](https://github.com/apowers313/pupt-monorepo/commit/ece0be3))
- semantic release ([d977668](https://github.com/apowers313/pupt-monorepo/commit/d977668))
- windows path error ([46ec8dd](https://github.com/apowers313/pupt-monorepo/commit/46ec8dd))
- claude code 2.x parsing errors ([086cae1](https://github.com/apowers313/pupt-monorepo/commit/086cae1))
- config file migration when outputCapture is missing ([2edc2e8](https://github.com/apowers313/pupt-monorepo/commit/2edc2e8))
- update to work with claude code v2, add knip delinting ([e6d33ce](https://github.com/apowers313/pupt-monorepo/commit/e6d33ce))
- claude init and auto annotation errors ([0fbe7a7](https://github.com/apowers313/pupt-monorepo/commit/0fbe7a7))
- repo name, uninitialized claude directory ([16e53ba](https://github.com/apowers313/pupt-monorepo/commit/16e53ba))
- prompt improvements, rename labels to tags, docs improvements ([0c80694](https://github.com/apowers313/pupt-monorepo/commit/0c80694))
- history and annotation cosmetic fixes ([cfc01ea](https://github.com/apowers313/pupt-monorepo/commit/cfc01ea))
- capture complete annotation data ([0a81892](https://github.com/apowers313/pupt-monorepo/commit/0a81892))
- annotation cosmetic changes ([e1072fb](https://github.com/apowers313/pupt-monorepo/commit/e1072fb))
- minor to file search ([0efa525](https://github.com/apowers313/pupt-monorepo/commit/0efa525))
- more consistent help command ([0e027f4](https://github.com/apowers313/pupt-monorepo/commit/0e027f4))
- history elipsis alignment ([48ebf0b](https://github.com/apowers313/pupt-monorepo/commit/48ebf0b))
- history formatting, default directories, init command detection ([2570e5d](https://github.com/apowers313/pupt-monorepo/commit/2570e5d))
- various bugs, add prompts, add design for new 'pt review' command ([b85a4dd](https://github.com/apowers313/pupt-monorepo/commit/b85a4dd))
- aesthetic cli changes ([ed9cd39](https://github.com/apowers313/pupt-monorepo/commit/ed9cd39))

### ⚠️  Breaking Changes

- refactor to use jsx prompt files and pupt-lib  ([a0913df](https://github.com/apowers313/pupt-monorepo/commit/a0913df))
  prompt files are no longer .md, they are now either .prompt or .tsx and use the JSX
  format from pupt-lib

### 🧱 Updated Dependencies

- Updated @pupt/lib to 1.4.0

### ❤️ Thank You

- Adam Powers

## 1.4.0 (2026-02-17)

### 🚀 Features

- more robust and complete components framework for extensibility and flexibility ([f85a763](https://github.com/apowers313/pupt-monorepo/commit/f85a763))
- add variables between components ([#10](https://github.com/apowers313/pupt-monorepo/issues/10), [#11](https://github.com/apowers313/pupt-monorepo/issues/11))
- add zod prop validation for all components ([b18ab8b](https://github.com/apowers313/pupt-monorepo/commit/b18ab8b))
- initial commit ([9db6bae](https://github.com/apowers313/pupt-monorepo/commit/9db6bae))

### 🩹 Fixes

- move prompts so that they are imported, various lint and bug fixes ([b79f6e5](https://github.com/apowers313/pupt-monorepo/commit/b79f6e5))
- rename packages, move to monorepo ([eaa74f2](https://github.com/apowers313/pupt-monorepo/commit/eaa74f2))
- use jsx fragments rather than regexp preprocessing to fix regexp bugs ([ca7c1d9](https://github.com/apowers313/pupt-monorepo/commit/ca7c1d9))
- make git branch an option for module loading ([f3eb27c](https://github.com/apowers313/pupt-monorepo/commit/f3eb27c))
- more verbose module loading api ([119b31f](https://github.com/apowers313/pupt-monorepo/commit/119b31f))
- refactor prompt and component modules ([7f096c1](https://github.com/apowers313/pupt-monorepo/commit/7f096c1))
- detect conflicting Format strict + ChainOfThought instructions ([#36](https://github.com/apowers313/pupt-monorepo/issues/36))
- stop Role from appending disjointed text when children are specified ([#37](https://github.com/apowers313/pupt-monorepo/issues/37))
- preserve whitespace in prompt text ([#25](https://github.com/apowers313/pupt-monorepo/issues/25))
- remove import scanning, depend on file names for syntactic sugar instead ([#29](https://github.com/apowers313/pupt-monorepo/issues/29))
- change require() calls to dynamic imports for ESM compatibility ([#30](https://github.com/apowers313/pupt-monorepo/issues/30))
- resolution of esm imports ([d360fbd](https://github.com/apowers313/pupt-monorepo/commit/d360fbd))
- missing url import ([35021cd](https://github.com/apowers313/pupt-monorepo/commit/35021cd))
- change default prompt output to markdown ([ca1c947](https://github.com/apowers313/pupt-monorepo/commit/ca1c947))
- add type exports after refactoring ([be187ff](https://github.com/apowers313/pupt-monorepo/commit/be187ff))
- ask components should never return undefined ([d9f7175](https://github.com/apowers313/pupt-monorepo/commit/d9f7175))
- specify relationship between llm model and llm provider ([8d75971](https://github.com/apowers313/pupt-monorepo/commit/8d75971))
- bundle dependencies in build ([aa74d8a](https://github.com/apowers313/pupt-monorepo/commit/aa74d8a))
- add trailing newline to structural components and default AskConfirm to false ([#15](https://github.com/apowers313/pupt-monorepo/issues/15))
- child and input rendering ([42a6b42](https://github.com/apowers313/pupt-monorepo/commit/42a6b42))
- make component export schemas optional, as originally intended ([a54fc55](https://github.com/apowers313/pupt-monorepo/commit/a54fc55))
- throw error when component lacks static schema ([#6](https://github.com/apowers313/pupt-monorepo/issues/6))
- add Component base class to preprocessor auto-imports ([#5](https://github.com/apowers313/pupt-monorepo/issues/5))
- add Option and Label to Ask namespace ([#4](https://github.com/apowers313/pupt-monorepo/issues/4))
- resolve structural component rendering issues ([#1](https://github.com/apowers313/pupt-monorepo/issues/1), [#2](https://github.com/apowers313/pupt-monorepo/issues/2), [#3](https://github.com/apowers313/pupt-monorepo/issues/3))
- async rendering for async components ([f779f39](https://github.com/apowers313/pupt-monorepo/commit/f779f39))
- minisearch import ([3919d78](https://github.com/apowers313/pupt-monorepo/commit/3919d78))
- remove remaining browser-incompatible imports ([164ce96](https://github.com/apowers313/pupt-monorepo/commit/164ce96))
- browser imports and exports, e2e tests and coverage ([70b758c](https://github.com/apowers313/pupt-monorepo/commit/70b758c))
- fix imports for .tsx files ([319462d](https://github.com/apowers313/pupt-monorepo/commit/319462d))
- rename components with Ask prefix and add non-interactive input mode ([0e6d500](https://github.com/apowers313/pupt-monorepo/commit/0e6d500))

### ❤️ Thank You

- Adam Powers

## 1.2.0 (2026-02-17)

### 🚀 Features

- add react components for parity with pupt-lib ([737b6c5](https://github.com/apowers313/pupt-monorepo/commit/737b6c5))
- **demo:** add environment panel and adaptive example ([2aff0dd](https://github.com/apowers313/pupt-monorepo/commit/2aff0dd))
- initial commit ([ae03026](https://github.com/apowers313/pupt-monorepo/commit/ae03026))

### 🩹 Fixes

- move prompts so that they are imported, various lint and bug fixes ([b79f6e5](https://github.com/apowers313/pupt-monorepo/commit/b79f6e5))
- rename packages, move to monorepo ([eaa74f2](https://github.com/apowers313/pupt-monorepo/commit/eaa74f2))
- fix unwrapJsx prompt processing that was breaking imports ([7b08dff](https://github.com/apowers313/pupt-monorepo/commit/7b08dff))
- update to latest pupt-lib for bug fixes ([096e8ef](https://github.com/apowers313/pupt-monorepo/commit/096e8ef))
- smarter search component that uses prompt metadata ([fc58374](https://github.com/apowers313/pupt-monorepo/commit/fc58374))
- update pupt-lib, fix rendering glitch ([494560b](https://github.com/apowers313/pupt-monorepo/commit/494560b))
- trusted publishing ([20bce8b](https://github.com/apowers313/pupt-monorepo/commit/20bce8b))
- clean up demos ([4aeaebc](https://github.com/apowers313/pupt-monorepo/commit/4aeaebc))
- minor demo fixes for usability ([b395123](https://github.com/apowers313/pupt-monorepo/commit/b395123))

### 🧱 Updated Dependencies

- Updated @pupt/lib to 1.4.0

### ❤️ Thank You

- Adam Powers

## 1.1.0 (2026-02-17)

### 🩹 Fixes

- rename packages, move to monorepo ([eaa74f2](https://github.com/apowers313/pupt-monorepo/commit/eaa74f2))

### 🧱 Updated Dependencies

- Updated @pupt/lib to 1.4.0

### ❤️ Thank You

- Adam Powers