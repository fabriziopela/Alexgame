# Alex the Miner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prototipo beta di un platform 3D voxel a scorrimento orizzontale per smartphone in landscape, 10 livelli da ~2 minuti, eseguibile nel browser come sito statico/PWA.

**Architecture:** Logica di gioco pura (mondo, generatore, fisica, entità, sessione di livello) in moduli ES senza dipendenze da Three.js o dal DOM, testabile in Node. La sessione emette eventi (`session.events`) che renderer, audio e UI consumano ogni frame. Rendering con Three.js (InstancedMesh a chunk, texture pixel generate via canvas), UI in DOM sopra il canvas.

**Tech Stack:** JavaScript ES2020 moduli nativi, Three.js 0.187.0 (vendorizzato, minificato una tantum con esbuild), Web Audio API, Node 22 `node:test`, Playwright (preinstallato) per i test nel browser.

**Spec:** `docs/superpowers/specs/2026-11-26-alex-the-miner-design.md`

## Global Constraints

- Titolo "Alex the Miner", definito solo in `src/config.js` (`GAME_TITLE`).
- Nessun elemento riconoscibile di Minecraft: texture, palette, personaggi e suoni originali.
- Nessuna richiesta di rete a runtime: tutto servito dal repo; offline dopo il primo caricamento (service worker).
- Peso totale < 2 MB.
- Target: Safari iOS 16+, Chrome Android 10+, desktop per test. Landscape; schermata "Ruota il telefono" in verticale.
- Moduli in `src/world/`, `src/game/`, `src/core/rng.js`, `src/config.js` non importano `three` né usano `window`/`document`.
- Testi UI in italiano.
- localStorage sempre in try/catch; il gioco funziona senza.
- Fisica a passo fisso 1/60 s.
- Valori di riferimento (spec): corsa ~6 blocchi/s, salto ~3,2 blocchi alto e ~4 lungo, coyote 0,1 s, jump buffer 0,12 s, invulnerabilità dopo danno 1,2 s, colpo 0,3 s, boomerang 20 s / ~7 blocchi, invincibilità 5 s, power-up a terra 8 s, timer 120 s, completamento medio 100–110 s, cuori max 3.

## Review Focus

1. **Multi-touch simultaneo** (tenere ▶ e premere SALTA; scivolare da ◀ a ▶): ci si aspetta che entrambe le azioni restino attive → test in Task 9 (`touch: two pointers keep right+jump`).
2. **Rotazione / app in background durante il gioco**: il timer si ferma e il gioco va in pausa → test in Task 8 (`session.pause freezes timer`) e verifica Playwright in Task 12.
3. **Frame lunghi (tab sospesa, telefono lento)**: un dt di 2 s non deve far attraversare muri o pavimenti → test in Task 3 (`large dt is clamped, no tunneling`).
4. **Ricomparsa dopo buca/lava sopra un punto ormai rotto** (il terreno sicuro è stato scavato): si deve ricomparire su un blocco solido → test in Task 7 (`respawn skips broken safe point`).
5. **Salvataggio corrotto o localStorage bloccato** (navigazione privata Safari): il gioco parte con livello 1 sbloccato → test in Task 9 (`save: corrupt json falls back`).

---

### Task 1: Scaffold, config, RNG, tile set

**Files:**
- Create: `package.json` (`"type":"module"`, script `test`: `node --test tests/`), `.gitignore`, `src/config.js`, `src/core/rng.js`, `src/world/tiles.js`, `vendor/three.module.min.js`, `vendor/LICENSE-three.txt`
- Test: `tests/rng.test.js`, `tests/tiles.test.js`

**Interfaces:**
- Produces: `GAME_TITLE`, `PHYS` (`{GRAVITY, RUN_SPEED, ACCEL, JUMP_VELOCITY, JUMP_CUT, COYOTE, JUMP_BUFFER, MAX_FALL, DT}`), `RULES` (`{MAX_HEARTS:3, HURT_INVULN:1.2, SWING_TIME:0.3, BOOMERANG_TIME:20, BOOMERANG_RANGE:7, STAR_TIME:5, PICKUP_LIFETIME:8, LEVEL_TIME:120}`) da `src/config.js`.
- Produces: `createRng(seed:number) => {next():number /*[0,1)*/, int(a,b), pick(arr), weighted(obj:{key:weight}) => key, chance(p):bool}` (mulberry32).
- Produces: `T` enum (`AIR, GRASS, DIRT, SAND, SANDSTONE, STONE, DARKSTONE, WOOD, LEAVES, CRATE, BONUS, BEDROCK, LAVA, SPIKES, SPIKES_RETRACT, EXIT`) e `TILE_INFO[id] = {name, solid, breakable, hp, hazard: null|'lava'|'spikes', bonus:bool}`.

- [ ] **Step 1:** Test `rng`: stesso seme → stessa sequenza di 100 valori; semi diversi → sequenze diverse; `int(2,5)` sempre in [2,5]; `weighted({a:0,b:1})` restituisce sempre `'b'`.
- [ ] **Step 2:** Test `tiles`: `BEDROCK` solid e non breakable; `STONE.hp===2`, `SANDSTONE.hp===2`, `DIRT.hp===1`; `LAVA` non solid con hazard `'lava'`; `SPIKES` non solid hazard `'spikes'`; `BONUS` breakable, `bonus:true`, hp 1.
- [ ] **Step 3:** Esegui `npm test` → FAIL (moduli mancanti).
- [ ] **Step 4:** Implementa i tre moduli. Ricava `PHYS` da altezza 3,2 e tempo di apice ~0,38 s (`GRAVITY = 2h/t²`, `JUMP_VELOCITY = 2h/t`), `JUMP_CUT=0.45`.
- [ ] **Step 5:** Vendorizza Three.js: `npm pack three@0.187.0`, `npx esbuild package/build/three.module.js --bundle --minify --format=esm --outfile=vendor/three.module.min.js`; copia la licenza MIT.
- [ ] **Step 6:** `npm test` → PASS. Commit `feat: scaffold, config, rng, tiles`.

### Task 2: World grid

**Files:**
- Create: `src/world/grid.js`
- Test: `tests/grid.test.js`

**Interfaces:**
- Produces: `class Grid { constructor(w,h); w; h; get(x,y):id /* fuori dai limiti: BEDROCK ai lati e sotto, AIR sopra */; set(x,y,id); isSolid(x,y):bool; hazardAt(x,y):null|'lava'|'spikes'; hit(x,y,dmg=1) => {broken:bool, id, wasBonus:bool}|null; dirtyChunks:Set<number> }`; `CHUNK = 32`. I danni parziali stanno in `damage: Map<key,number>`; `hit` su tile non breakable → `null`.

- [ ] **Step 1:** Test: `get(-1,5)` e `get(3,-1)` = BEDROCK, `get(3,h)` = AIR; `hit` su STONE: prima `{broken:false}`, poi `{broken:true}` e tile diventa AIR; `hit` su BONUS → `wasBonus:true`; `hit` su BEDROCK → `null`; dopo un hit a x=40 `dirtyChunks` contiene 1.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementa (`Uint8Array`, y=0 in basso). **Step 4:** Run → PASS. **Step 5:** Commit `feat: world grid`.

### Task 3: Physics body + collisions

**Files:**
- Create: `src/game/physics.js`
- Test: `tests/physics.test.js`

**Interfaces:**
- Consumes: `Grid`, `PHYS`.
- Produces: `makeBody(x,y,w,h) => {x,y,w,h,vx,vy,onGround,hitWall:-1|0|1,hitCeil}` (x,y = centro dei piedi); `moveBody(body, grid, dt)` integra gravità e risolve per asse (prima X poi Y), clamp `vy >= -MAX_FALL`, sotto-passi di massimo 0,25 blocchi per evitare tunneling; `overlapsHazard(body, grid) => null|'lava'|'spikes'`; `aabbOverlap(a,b):bool`.

- [ ] **Step 1:** Test su griglia di prova (pavimento y=0..1):
  - `body lands and stays on ground` (onGround true, y==2 dopo 2 s).
  - `jump apex ≈ 3.2` (vy=JUMP_VELOCITY, max y−2 ∈ [3.0,3.4]).
  - `running jump clears 4-wide gap`, `does not clear 6-wide gap`.
  - `wall stops horizontal motion` (hitWall=1).
  - `large dt is clamped, no tunneling` (`moveBody(b,g,2.0)` con muro 1 blocco: non lo attraversa; pavimento sottile: non cade sotto).
  - `overlapsHazard` su LAVA → `'lava'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementa (dt clamp a 1/20). **Step 4:** Run → PASS. **Step 5:** Commit `feat: platform physics`.

### Task 4: Level recipes + guided generator

**Files:**
- Create: `src/world/levels.js`, `src/world/segments.js`, `src/world/generator.js`
- Test: `tests/generator.test.js`

**Interfaces:**
- Produces: `LEVELS: Recipe[10]`, `Recipe = {id, name, theme:'forest'|'sunset'|'mine'|'desert'|'dunes'|'deepmine'|'night'|'tomb'|'lavamine'|'abyss', indoor:bool, seed, length /*colonne*/, time:120, weights:{segmentName:weight}, maxGap, enemyRate, enemyMix:{zombie,mummy}, enemySpeed, zombieHp, mummyHp, bonusRate, powerTable:{heart,boomerang,star}}`. Lunghezze iniziali 380→520 colonne (da ricalibrare in Task 11).
- Produces: `generateLevel(recipe) => Level`, `Level = {recipe, grid:Grid, spawn:{x,y}, exitX, enemies:[{type:'zombie'|'mummy', x, y}], bonusLoot: Map<"x,y", 'heart'|'boomerang'|'star'>, retractSpikes:[{x,y,phase}]}`.
- Segmenti (`segments.js`): ognuno `(ctx) => void` che scrive colonne a partire da `ctx.x` e aggiorna `ctx.groundY`; nomi: `flat, stepUp, stepDown, gap, lavaGap, floating, spikeRow, digWall, lowTunnel, enemyGroup, bonusNiche, retractSpikes`. Ogni segmento rispetta i limiti fisici per costruzione (gap ≤ `recipe.maxGap` ≤ 4, salita ≤ 2 per gradino, galleria alta ≥ 3).
- Livelli indoor: soffitto continuo di pietra a `groundY+6..+8`; `digWall` usa solo tile breakable.
- Inizio: 12 colonne piane con un BONUS tutorial (cuore) a colonna 8 altezza testa; fine: 10 colonne piane + tile `EXIT`.

- [ ] **Step 1:** Test:
  - `LEVELS has 10 recipes with ids 1..10`.
  - `deterministic`: due generazioni dello stesso livello producono griglie identiche.
  - `difficulty is non-decreasing`: `enemyRate`, `maxGap`, `enemySpeed` non decrescono da 1 a 10 (tolleranza: nessun calo).
  - `mummies only from level 4`; `retractSpikes only from level 7`; `indoor levels have a ceiling`.
  - `every bonus tile has loot` e `spawn is on solid ground`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementa ricette (tabella del §6.7 dello spec) e generatore. **Step 4:** Run → PASS. **Step 5:** Commit `feat: level recipes and guided generator`.

### Task 5: Level validator

**Files:**
- Create: `src/world/validator.js`
- Test: `tests/validator.test.js`

**Interfaces:**
- Consumes: `Level`, `PHYS`.
- Produces: `validateLevel(level) => {ok:bool, problems:[{x, reason}]}`. Algoritmo: BFS su posizioni "in piedi" `(x,y)`; da ognuna, archi verso posizioni raggiungibili con camminata, caduta e salti precomputati da una tabella di archi simulati con `moveBody` (input destra/sinistra, salto pieno, durata 0–0,6 s); i tile breakable contano come attraversabili (si possono scavare); hazard e buche non sono posizioni valide. `ok` se `exitX` è raggiungibile da `spawn`.
- Il generatore (Task 4) chiama `validateLevel` e, se fallisce, rigenera con `seed+1` (max 20 tentativi, poi errore).

- [ ] **Step 1:** Test: `all 10 levels validate`; `a hand-made level with a 7-wide gap fails` con `problems[0].reason==='unreachable'`; `a bedrock wall blocks`; `a dirt wall does not block`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementa + aggancio nel generatore. **Step 4:** Run → PASS. **Step 5:** Commit `feat: reachability validator`.

### Task 6: Player

**Files:**
- Create: `src/game/player.js`
- Test: `tests/player.test.js`

**Interfaces:**
- Consumes: `makeBody`, `moveBody`, `overlapsHazard`, `Grid.hit`, `RULES`, `PHYS`.
- Produces: `class Player { body; facing:1|-1; hearts; invuln; star /*s rimanenti*/; boomerang /*s rimanenti*/; swing /*s rimanenti*/; lastSafe:{x,y}; state:'idle'|'run'|'jump'|'fall'|'swing'|'hurt'; update(dt, input, session); hurt(session, fromX):bool; heal(); }`. `input = {left,right,jump,jumpPressed,hit,hitPressed}`.
- Colpo: su `hitPressed` con `swing<=0`: se `boomerang>0` e nessun boomerang in volo → `session.spawnBoomerang()`; altrimenti `swing=0.3` e al frame d'inizio colpisce `grid.hit` alle celle `(fx, y..y+2)` con `fx = floor(x + facing*0.9)` e, se in aria, anche `(floor(x), floor(y+h)+0)`; emette `session.emit('break'|'chip', {x,y,id})`; i nemici nel box d'attacco ricevono `session.damageEnemy(e)`.
- Coyote/jump buffer/salto variabile come da `PHYS`.

- [ ] **Step 1:** Test con una sessione finta (`{grid, emit(){}, damageEnemy(){}, spawnBoomerang(){}}`):
  - `coyote jump allowed 0.08s after leaving edge`, `not after 0.15s`.
  - `buffered jump fires on landing`.
  - `swing breaks dirt in front at head height`; `stone needs two swings`.
  - `hurt removes one heart and grants 1.2s invuln`; `second hurt within invuln ignored`; `star blocks hurt`.
  - `heal caps at 3`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementa. **Step 4:** Run → PASS. **Step 5:** Commit `feat: player controller`.

### Task 7: Enemies, boomerang, pickups

**Files:**
- Create: `src/game/enemies.js`, `src/game/boomerang.js`, `src/game/pickups.js`
- Test: `tests/entities.test.js`

**Interfaces:**
- Produces: `class Enemy { type; body; hp; dir; active; state:'patrol'|'chase'|'windup'|'charge'|'hit'|'dead'; update(dt, session); }` — zombie: pattuglia, gira a bordi/muri, insegue entro 6 blocchi a `recipe.enemySpeed`; mummia: velocità ×0,7, entro 5 blocchi `windup` 0,5 s poi `charge` ×2,2 per 0,8 s; attivo solo entro 18 blocchi dalla camera. `hp` da `recipe.zombieHp/mummyHp`. Colpito: knockback e 0,25 s di stato `hit`.
- Produces: `class Boomerang { x,y,vx; returning; update(dt, session) }` — va avanti fino a `BOOMERANG_RANGE` o muro solido non breakable, poi torna verso il giocatore; rompe tile hp 1 e danneggia nemici (una volta per nemico per tratta); sparisce al contatto col giocatore.
- Produces: `class Pickup { kind; x,y; vy; ttl:8; update(dt, session) }` — salta fuori dal blocco, cade, lampeggia negli ultimi 2 s.

- [ ] **Step 1:** Test: `zombie turns at ledge`; `zombie chases player within 6`; `mummy windup precedes charge`; `enemy inactive when far`; `boomerang returns and breaks dirt`; `boomerang does not break stone`; `pickup expires after 8s`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementa. **Step 4:** Run → PASS. **Step 5:** Commit `feat: enemies, boomerang, pickups`.

### Task 8: Level session (rules, timer, events)

**Files:**
- Create: `src/game/session.js`
- Test: `tests/session.test.js`

**Interfaces:**
- Consumes: tutto quanto sopra.
- Produces: `class Session { constructor(level); level; grid; player; enemies; pickups; boomerang|null; time /*s rimanenti*/; score; status:'intro'|'playing'|'paused'|'won'|'lost'; lostReason:null|'time'|'hearts'; events:[{type, ...}]; emit(type,data); update(dt,input); pause(); resume(); progress():0..1; drainEvents() }`.
- Regole: contatto nemico → `player.hurt`; con stella → nemico eliminato; hazard lava/spikes → hurt (spikes: vy verso l'alto; lava: respawn); caduta sotto y<−3 → hurt + respawn; respawn su `lastSafe`, ma se quella cella non è più solida cerca la colonna solida più vicina all'indietro; 0 cuori → `lost/'hearts'`; `time<=0` → `lost/'time'`; superato `exitX` → `won`, `score += ceil(time)*10`.
- Punteggio: blocco 10, bonus 25, zombie 100, mummia 150, power-up 50, cuore a cuori pieni 200.
- Spuntoni a scomparsa: ciclo 2 s su / 1,5 s giù con `phase`.
- Eventi emessi: `jump, swing, chip, break, bonus, pickup, hurt, enemyHit, enemyDie, respawn, throw, starOn, starOff, win, lose, tick` (tick ogni secondo sotto i 15 s).

- [ ] **Step 1:** Test: `timer counts down only while playing`; `session.pause freezes timer`; `time out loses with reason time`; `three hurts lose with reason hearts`; `crossing exit wins and adds time bonus`; `falling in a pit costs a heart and respawns`; `respawn skips broken safe point`; `star kills enemy on contact`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementa. **Step 4:** Run → PASS. **Step 5:** Commit `feat: level session rules`.

### Task 9: Input, save, audio

**Files:**
- Create: `src/core/input.js`, `src/core/save.js`, `src/core/audio.js`
- Test: `tests/input.test.js`, `tests/save.test.js`

**Interfaces:**
- Produces: `class Input { constructor(target:EventTarget, buttons:{left,right,jump,hit}:HTMLElement|rectProvider); state():{left,right,jump,jumpPressed,hit,hitPressed}; endFrame(); }` — Pointer Events con `setPointerCapture` disattivato: a ogni `pointermove` il pulsante sotto il dito è ricalcolato via hit-test sui rettangoli (permette lo scivolamento ◀→▶); tastiera: frecce/A/D, Space/W/↑, J/K, P/Escape → evento `pause`. Per testabilità, il nucleo è `TouchMap` puro: `TouchMap.update(pointerId, x, y)`, `release(pointerId)`, `pressed(name)`.
- Produces: `loadSave(storage?) => {unlocked:number, best:{[id]:{time,score}}, audio:bool}`, `saveProgress(save, storage?)`, `recordResult(save, id, time, score)`; default `{unlocked:1, best:{}, audio:true}`.
- Produces: `class Audio { unlock(); play(name); music(theme|null); setEnabled(bool) }` — sintesi Web Audio (oscillatori + rumore filtrato), musica a pattern di 16 passi diversa per esterni/interni. Nessun test unitario (verifica manuale + Playwright senza errori).

- [ ] **Step 1:** Test `TouchMap`: `touch: two pointers keep right+jump`; `touch: slide from left to right switches button`; `release clears`. Test save: `defaults when empty`; `save: corrupt json falls back`; `storage throwing falls back`; `recordResult unlocks next and keeps best time`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementa i tre moduli. **Step 4:** Run → PASS. **Step 5:** Commit `feat: input, save, audio`.

### Task 10: Rendering

**Files:**
- Create: `src/render/textures.js`, `src/render/blocks.js`, `src/render/models.js`, `src/render/particles.js`, `src/render/scene.js`, `src/render/themes.js`

**Interfaces:**
- Consumes: `Session`, `Grid.dirtyChunks`, eventi di sessione.
- Produces: `buildAtlas() => THREE.Texture` (canvas 16×16 per tile, NearestFilter, SRGB, lava con 4 frame); `class BlockLayer { constructor(scene, atlas); load(grid, theme); sync(grid) /*ricostruisce solo dirtyChunks*/; setVisibleRange(x0,x1) }` (InstancedMesh per chunk, UV per faccia via attributo instanced); `makeMiner()/makeZombie()/makeMummy()/makePickaxe()/makePickup(kind) => {group, animate(state, t, facing)}`; `class Particles { burst(x,y,color,n); update(dt) }` (pool fisso di 300); `class Renderer { constructor(canvas); start(session); render(alpha, dt); resize(); dispose() }` con camera prospettica FOV 35, posizione `(px+facing*2.5, py+2.2, 17)`, look-at leggermente in basso, smorzamento; `THEMES[theme] = {sky, fog, ambient, sun, background layers, palette per decorazioni}`; pixel ratio `min(devicePixelRatio, 2)`, antialias off su mobile.
- Decorazioni di fondo: 2 file di blocchi a z = −1, −2 (alberi/cactus/pilastri) generate dal seme del livello; sfondo con 3 piani di sagome a parallasse.

- [ ] **Step 1:** Implementa i moduli.
- [ ] **Step 2:** Pagina di prova temporanea `tests/e2e/render-check.mjs` (Playwright): carica `index.html?level=N&autostart=1` per N=1,3,4,8,10 a viewport 844×390, nessun errore in console, salva screenshot nello scratchpad; ispezione visiva degli screenshot.
- [ ] **Step 3:** Commit `feat: voxel renderer`.

### Task 11: UI, screens, app wiring

**Files:**
- Create: `index.html`, `css/style.css`, `src/main.js`, `src/ui/hud.js`, `src/ui/screens.js`, `src/ui/touch-controls.js`

**Interfaces:**
- Consumes: `Session`, `Renderer`, `Input`, `Audio`, `loadSave/recordResult`, `LEVELS`, `generateLevel`.
- Produces: macchina a stati in `main.js`: `loading → title → levels → intro → playing ⇄ paused → result(won|lost) → (next|retry|levels)`. Loop: accumulatore a passo fisso `PHYS.DT`, max 5 passi per frame, render interpolato.
- HUD: cuori, timer (rosso e pulsante < 15 s), icona power-up con barra residua, punteggio, barra di avanzamento, pulsante pausa. Schermate secondo §6.8 dello spec, incluse l'overlay "Ruota il telefono" (media query `orientation: portrait` + `matchMedia` listener → `session.pause()`), pausa su `visibilitychange`, schermo intero + `screen.orientation.lock('landscape')` su Android al tocco "Gioca" (in try/catch), hint "Aggiungi a Home" su iOS Safari non standalone.
- Parametri URL per test: `?level=N&autostart=1`, `?bot=1`.

- [ ] **Step 1:** Implementa.
- [ ] **Step 2:** Playwright (iPhone 13 landscape e Pixel 7 landscape): titolo → livelli → livello 1 → tocco su SALTA → pausa → riprendi; nessun errore in console; screenshot di ogni schermata; viewport verticale mostra "Ruota il telefono".
- [ ] **Step 3:** Commit `feat: UI and game flow`.

### Task 12: Bot playthrough + balancing

**Files:**
- Create: `tests/bot.js` (giocatore automatico puro), `tests/balance.test.js`, `tools/balance-report.mjs`
- Modify: `src/world/levels.js` (lunghezze/parametri)

**Interfaces:**
- Produces: `runBot(level, {maxTime}) => {won, time, hurts, reason}` — usa `Session` in Node: corre a destra, salta prima di buche/hazard/gradini (lookahead da griglia), colpisce muri e nemici davanti, si ferma per lasciar passare la carica delle mummie.
- Calibrazione: la lunghezza di ogni livello è regolata perché il bot finisca in 75–95 s (stima di un umano medio ≈ +20–25 %, quindi ~100–110 s) con limite 120 s; nei livelli 8–10 il bot finisce in 85–100 s.

- [ ] **Step 1:** Test `balance`: per ogni livello `won===true` e `time` nell'intervallo del livello; tempi del bot non decrescenti in difficoltà effettiva (danni subiti medi crescenti tra livelli 1–3 e 8–10).
- [ ] **Step 2:** Run → FAIL o fuori intervallo. **Step 3:** Regola le ricette; `node tools/balance-report.mjs` stampa tabella livello/tempo/danni. **Step 4:** Run → PASS. **Step 5:** Commit `feat: bot playthrough and level balancing`.

### Task 13: PWA, offline, README, final verification

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png` (generate con Playwright da un canvas col minatore voxel), `README.md`
- Modify: `index.html` (link manifest, meta iOS, registrazione SW)

- [ ] **Step 1:** Manifest (`display: fullscreen`, `orientation: landscape`, colori del tema), SW cache-first con versione in `CACHE` e lista esplicita dei file.
- [ ] **Step 2:** README in italiano: come giocare, comandi, come pubblicare su GitHub Pages, come eseguire i test, struttura del codice, come modificare le ricette dei livelli.
- [ ] **Step 3:** Verifica finale: `npm test` tutto verde; Playwright: secondo caricamento con rete disattivata funziona (offline); peso totale `du -sh` escluse `docs/ tests/ tools/` < 2 MB; nessun errore in console su tutti e 10 i livelli con `?bot=1` per 10 s ciascuno.
- [ ] **Step 4:** Commit `feat: PWA and docs`; push sul branch di sviluppo.
