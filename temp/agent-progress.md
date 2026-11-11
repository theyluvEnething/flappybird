# Rocket Mode

## UI simplification

1. [x] Only Classic, Overdrive, Settings and the game remain visible by default. Removed external footer and HUD icon strip; simplified ready/game-over states; sound and recordings moved into Settings.
2. [x] Native full screen verified at 1800x1130, with an 855x512 world filling the 1800x1078 playfield. Portrait view verified at 390x844, with no horizontal overflow. Screenshots: temp/screenshots/clean-{fullscreen,portrait}.png.
3. [x] Power-ups pass engine tests. A full-screen game saved a completed replay with width/bird position, then played back from Settings without stretching. Test recording removed.
4. [x] Fourteen tests, syntax checks and git diff --check pass. Committed 176c71b6a87ada369b64a8a27530f62420d4ca78 and pushed main to theyluvEnething/flappybird. HEAD and origin/main match; only local temp/ is untracked.

Resolved checkout: /Users/Enething/Programmieren/Projekte/flappybird. Remote: theyluvEnething/flappybird. GitHub confirms old and new names resolve to repository ID 1453047095. Local history retains 981ef3a and 620d8a4; repository-name documentation commit is 9227d99. Existing uncommitted power-up implementation belongs to this chat and will be included in the requested commit. Keep scratch files and screenshots out of commits.

Interruption: source folder and repository renamed during this run. Automatic approval initially rejected the new path as a different repository; matching GitHub IDs and local history established it is the same checkout, and subsequent edits were approved. The existing server was already restarted from the renamed checkout, so no process was stopped or started by this UI run. Full-screen testing temporarily expanded the native browser; it was exited afterward. No subagents or installs.

Done means:
1. [x] Five collectible abilities. Evidence: 12 passing Node tests; a browser run collected all five and finished at score 42.
2. [x] Distinct pixel-art pickups, transformations, HUD and cinematic effects. Evidence: temp/screenshots/{jetpack,rocket-boost,shield,slow,pulse}.png at 1100x1000; phone layout at 390x844; reduced motion suppressed decorative effects and had no horizontal overflow. Refinement removed the shield bubble from Boost, hid debris for reduced motion, and fixed footer wrapping on phones.
3. [x] Replay preserves powers, pickups and effects. Evidence: the score-42 replay displayed all five powers and ended at the same score; an older recording without power fields played successfully. Snapshot independence and old-frame defaults covered by tests.
4. [x] JavaScript syntax, 12 tests and git diff --check pass. No Git mutations. Existing speed 240 and gap 148 preserved. Existing recording server remains running on port 8766.

Decisions: Rocket Mode enabled by default; Classic available before each run. One active power at a time. Keyboard/touch hold controls Jetpack. Pickups cycle through all five powers. Boost breaks pipes and flies automatically; protection on exit prevents unavoidable deaths. No dependencies.

Verification notes: Safari MCP opening stalled and was terminated; verification used the in-app browser. The keyboard-driven playthrough used controlled animation ticks and seeded pipe placement. Native browser controls used alongside runtime testing; no claim of a physical-phone test. Test-only browser changes were cleared by reload. Browser-test animation callbacks from locator polling required draining before mode switching; this was not a game defect. No subagents, installs, commits, pushes or deployments.
