# Alex the Miner

Platform 3D a blocchi a scorrimento orizzontale, pensato per smartphone tenuti in orizzontale e giocabile dal browser. Questa è una **beta (0.9.0)**.

Alex è un minatore armato di piccone. Deve attraversare 10 livelli tra foreste, deserti e miniere entro 2 minuti per livello. Lungo il percorso evita buche, lava e spuntoni e affronta zombie e mummie.

---

## Come si gioca

| Comando | Touch | Tastiera (PC) |
|---|---|---|
| Cammina | ◀ ▶ in basso a sinistra | Frecce oppure A / D |
| Salta | **SALTA** in basso a destra (più a lungo si tiene premuto, più in alto si salta) | Spazio, W oppure ↑ |
| Colpisci | **COLPISCI** (piccone) | J, K oppure X |
| Pausa | pulsante ❚❚ in alto a destra | P oppure Esc |

- **Cuori**: se ne hanno 3. Il contatto con un nemico, gli spuntoni, la lava o una caduta in una buca ne tolgono uno. Dopo una caduta o la lava si riparte dall'ultimo punto sicuro.
- **Timer**: ogni livello dura al massimo 2:00. Se il tempo scade o finiscono i cuori, il livello ricomincia da capo.
- **Blocchi**: quasi tutti si rompono col piccone. Terra e sabbia cedono a un colpo, pietra e arenaria a due.
- **Blocchi bonus** (con la gemma luminosa) contengono un potenziamento:
  - ❤ **Cuore**: un cuore in più, fino a un massimo di 3. Se i cuori sono già al massimo, dà punti.
  - ⛏ **Piccone-boomerang**: per 20 secondi "Colpisci" lancia il piccone, che va avanti e poi torna.
  - ★ **Invincibilità**: per 5 secondi Alex è immune ai danni ed elimina i nemici al contatto.
- **Nemici**:
  - gli **zombie** vanno incontro ad Alex;
  - le **mummie** caricano dopo un segnale: gli occhi si illuminano;
  - nei livelli avanzati entrambi resistono a più colpi.

## I 10 livelli

| # | Ambiente | Novità |
|---|---|---|
| 1 | La Foresta | tutorial, zombie lenti |
| 2 | Tramonto nel Bosco | piattaforme sospese |
| 3 | Ingresso della Miniera | buio, lava, muri da scavare |
| 4 | Il Deserto | arrivano le mummie |
| 5 | Le Dune | spuntoni |
| 6 | Miniera Profonda | zombie da 2 colpi, lava frequente |
| 7 | La Foresta di Notte | spuntoni a scomparsa |
| 8 | La Tomba Perduta | mummie da 3 colpi, corridoi stretti |
| 9 | Miniera di Lava | lava ovunque |
| 10 | L'Abisso | tutto insieme |

I livelli completati restano sbloccati sul dispositivo, insieme a miglior tempo e punteggio.

---

## Pubblicazione (GitHub Pages)

Il gioco è un sito statico e non richiede alcuna fase di compilazione.

1. Su GitHub aprire **Settings → Pages**.
2. In **Source** scegliere *Deploy from a branch*, poi il branch desiderato e la cartella `/ (root)`.
3. Dopo circa un minuto il gioco è disponibile all'indirizzo `https://<utente>.github.io/<repository>/`.

**Sul telefono:**
- **iPhone (Safari)**: tocca *Condividi* e poi *Aggiungi alla schermata Home*. Il gioco si apre a schermo intero e funziona anche offline.
- **Android (Chrome)**: il gioco va a schermo intero da solo quando si tocca "Gioca". In alternativa, dal menu ⋮ scegli *Installa app*.

## Prova in locale

```bash
python3 -m http.server 8080
```

Poi aprire `http://localhost:8080` nel browser. Per simulare un telefono si usa la modalità dispositivo degli strumenti per sviluppatori, in orientamento orizzontale.

Parametri utili per i test:
- `?level=N&autostart=1` apre direttamente il livello N.
- `?bot=1` fa giocare il personaggio automatico.

## Test

```bash
npm test
```

Questo comando esegue i test automatici: fisica, generatore e validatore dei livelli, minatore, nemici, regole di gioco, comandi, salvataggi e bilanciamento.

Test nel browser (richiedono Playwright e il server locale sulla porta 8765):

```bash
node tests/e2e/flow.mjs <cartella-screenshot>
```

```bash
node tests/e2e/offline.mjs
```

```bash
node tests/e2e/render-check.mjs <cartella-screenshot> 1 2 3
```

Rapporto di bilanciamento, con durata di ogni livello percorso dal giocatore automatico:

```bash
node tools/balance-report.mjs
```

## Modificare la difficoltà

Tutti i parametri dei livelli si trovano in `src/world/levels.js`:

| Parametro | Cosa regola |
|---|---|
| `length` | lunghezza del livello in blocchi |
| `maxGap` | larghezza massima delle buche (al massimo 4) |
| `enemyRate`, `enemyMix`, `enemySpeed` | quantità, tipo e velocità dei nemici |
| `zombieHp`, `mummyHp` | colpi necessari per eliminare i nemici |
| `bonusRate`, `powerTable` | frequenza dei blocchi bonus e probabilità di ciascun potenziamento |
| `weights` | frequenza dei tratti di percorso (buche, lava, muri, gallerie…) |
| `seed` | variante del percorso: cambiandolo si ottiene un livello diverso |

Dopo ogni modifica si eseguono `npm test` e `node tools/balance-report.mjs`.

Il generatore scarta da solo i percorsi impossibili e rigenera il livello. Il test di bilanciamento verifica che il giocatore automatico completi ogni livello in 75–95 s (85–100 s nei livelli 8–10). Per un giocatore medio questo corrisponde a circa 100–115 s.

I valori di fisica e regole (velocità, salto, durata dei potenziamenti, timer) sono in `src/config.js`, insieme al titolo del gioco.

## Struttura del codice

```
index.html, css/style.css     pagina e interfaccia
src/config.js                 titolo, fisica, regole, punteggi
src/core/                     PRNG, comandi, audio sintetizzato, salvataggi
src/world/                    blocchi, griglia, ricette, generatore, validatore
src/game/                     fisica, minatore, nemici, boomerang, power-up, sessione, bot
src/render/                   texture pixel, blocchi 3D, personaggi voxel, particelle, scena
src/ui/                       HUD, schermate, pulsanti touch
vendor/three.module.min.js    Three.js 0.187 (licenza MIT)
sw.js, manifest.webmanifest   funzionamento offline e installazione
```

La logica di gioco (`src/world`, `src/game`) non dipende dalla grafica e viene testata in Node. Grafica, texture, personaggi e suoni sono generati via codice e sono originali.
