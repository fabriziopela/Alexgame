# Minatore — Documento di progetto (prototipo beta)

Data: 2026-11-26 · Stato: in approvazione

## 1. Intento

Prototipo giocabile, con finitura da **beta test**, di un platform 3D a scorrimento
orizzontale per **smartphone in orizzontale**, eseguito nel browser. Serve a
presentare il concept (potenziali clienti/investitori, tester) e a raccogliere
feedback su gameplay e difficoltà. Deve quindi essere stabile, fluido, leggibile e
completo in tutte le sue schermate, non solo "funzionante".

Titolo provvisorio: **Minatore** (modificabile in un punto solo, `src/config.js`).

## 2. Obiettivi, non-obiettivi, anti-obiettivi

**Obiettivi**
- 10 livelli completi, difficoltà crescente, ciascuno completabile in ~2 minuti.
- Controlli touch reattivi: cammina (sinistra/destra), salta, colpisci.
- Grafica 3D a blocchi (voxel), texture pixelate originali, 60 fps su telefoni di fascia media.
- Ciclo completo: titolo → selezione livello → gioco → pausa → vittoria/sconfitta → livello successivo.
- Pubblicabile come sito statico (GitHub Pages) e installabile sulla schermata Home (PWA).

**Non-obiettivi (fuori da questo prototipo)**
- Multiplayer, classifiche online, account, acquisti in-app, editor di livelli.
- Localizzazione: il gioco è solo in italiano.
- Supporto a controller fisici (la tastiera c'è solo per test da PC).

**Anti-obiettivi (sarebbe un fallimento anche se "funziona")**
- Elementi riconoscibili di Minecraft (texture, personaggi, mostri, logo, suoni).
  Lo stile a blocchi è solo una direzione estetica.
- Salti impossibili o morti "ingiuste" (collisioni imprecise, nemici invisibili fuori schermo).
- Controlli che coprono l'azione o non rispondono al multi-touch (correre + saltare insieme).
- Scatti o surriscaldamento su un telefono medio.

## 3. Vincoli

- **Piattaforme**: Safari iOS 16+, Chrome Android 10+; PC (Chrome/Edge/Firefox/Safari) per test.
- **iPhone**: Safari non consente blocco orientamento né schermo intero → schermata
  "Ruota il telefono" in verticale + invito a "Aggiungi a Home" (PWA in landscape).
  Su Android: richiesta di schermo intero e blocco landscape al primo tocco su "Gioca".
- **Nessuna dipendenza da server esterni** a runtime: librerie incluse nel progetto, funziona offline dopo il primo caricamento.
- **Peso** complessivo < 2 MB (texture e suoni generati via codice).

## 4. Approcci considerati

| Approccio | Pro | Contro | Esito |
|---|---|---|---|
| **A. Three.js puro, ES modules, nessuna build** | leggero, veloce su mobile, pubblicazione immediata, controllo totale di collisioni | UI scritta a mano | **Scelto** dal committente |
| B. Three.js + TypeScript + Vite | codice più tipizzato | passaggio di compilazione senza benefici visibili nel prototipo | scartato |
| C. Babylon.js / PlayCanvas | fisica e strumenti pronti | più pesante, fisica generica meno precisa per un platform | scartato |

Livelli: **generatore guidato** (scelto) invece di 10 livelli disegnati interamente a
mano, che renderebbero lento ogni ritocco di bilanciamento.

## 5. Decisioni del committente

- Opzione A con generatore guidato.
- Ogni livello dura indicativamente 2 minuti; c'è un **timer**; se scade si **ricomincia il livello** da capo.
- Perdere 3 cuori → si ricomincia il livello.
- Nemici: **zombie** e **mummie**; il contatto toglie **1 cuore su 3**.
- Pericoli: **buche, lava, spuntoni**.
- Power-up **solo dentro blocchi da rompere** col piccone: **cuore**, **piccone-boomerang**, **invincibilità 5 s**.
- Ambienti: esterni (foresta, deserto) e interni (miniere). Difficoltà crescente.
- Comandi: cammina, salta, colpisci.
- Livelli completati restano sbloccati sul dispositivo.

## 6. Progetto

### 6.1 Architettura tecnica
- `index.html` con import map → `vendor/three.module.min.js` (Three.js 0.18x incluso nel repo).
- Codice in `src/` come moduli ES, nessun bundler. Struttura:
  - `src/config.js` — costanti (fisica, tempi, titolo).
  - `src/core/` — loop a passo fisso (60 Hz, render interpolato), input, audio, salvataggi, PRNG.
  - `src/render/` — renderer, camera, generatore texture pixel, mesh voxel dei personaggi, particelle.
  - `src/world/` — tipi di blocco, griglia del mondo, generatore, ricette dei livelli, validatore.
  - `src/entities/` — giocatore, zombie, mummia, boomerang, power-up.
  - `src/ui/` — HUD, schermate, controlli touch (DOM sopra il canvas).
- La **logica di gioco è separata dal rendering** (mondo e fisica girano anche in Node) per poterla testare.

### 6.2 Mondo e grafica
- Il gioco si svolge su una **griglia 2D** (x orizzontale, y verticale), un blocco = 1 unità.
- Resa 3D: il piano di gioco ha profondità di 1 blocco, con 2–3 file di blocchi decorativi
  dietro (alberi, rocce, pareti di miniera) e uno sfondo a strati lontani (montagne/dune/pareti) per parallasse.
- Camera prospettica laterale leggermente rialzata e inclinata (~8°), FOV basso, segue il
  giocatore con anticipo nella direzione di marcia e smorzamento verticale.
- Blocchi resi con `InstancedMesh` divisi in "chunk" da 32 colonne; rompere un blocco
  aggiorna solo il suo chunk. Si disegnano solo i chunk visibili.
- **Texture originali 16×16** generate via codice (canvas) con filtro "nearest": erba,
  terra, sabbia, arenaria, pietra, pietra scura, legno, foglie, cassa, minerale-bonus
  (blocco con gemma luminosa pulsante), roccia indistruttibile, lava animata, spuntoni metallici.
  Palette propria (toni caldi, contorni scuri), diversa da quella di Minecraft.
- **Personaggi voxel** costruiti a cubi con animazioni procedurali (camminata, salto,
  colpo, danno, vittoria): minatore con elmetto e lampada frontale; zombie verde-grigio
  con vestiti strappati; mummia con bende chiare e occhi luminosi.
- Luci: emisferica + direzionale all'esterno; in miniera ambiente scuro, nebbia, lampada
  frontale del minatore (1 luce puntiforme) e bagliore della lava (emissivo, senza luci aggiuntive).
- Effetti: particelle di frammenti alla rottura dei blocchi, scintille sui colpi,
  lampeggio durante l'invulnerabilità, alone dorato durante l'invincibilità, leggero
  scuotimento camera quando si subisce danno.

### 6.3 Giocatore
- Velocità di corsa ~6 blocchi/s con accelerazione breve; salto ~3,2 blocchi di altezza,
  ~4 blocchi di distanza in corsa; salto variabile (rilascio anticipato = salto più basso).
- Aiuti al platform: *coyote time* 0,1 s (salto appena dopo il bordo), *jump buffer* 0,12 s.
- Collisioni AABB contro la griglia, separate per asse (niente incastri negli spigoli).
- **Colpisci**: colpo di piccone di 0,3 s nella direzione in cui si guarda. Colpisce la
  colonna davanti dall'altezza dei piedi a sopra la testa (3 blocchi) e i nemici nello stesso raggio.
  In aria, il colpo prende anche il blocco subito sopra la testa.
- **Danno**: −1 cuore, piccola spinta all'indietro, 1,2 s di invulnerabilità lampeggiante.
- Cuori: si parte con 3 a ogni livello; massimo **3** (un cuore raccolto a cuori pieni dà punti).
- **Buca o lava**: −1 cuore e ricomparsa sull'ultimo terreno sicuro (non si perde il livello
  in un colpo). Se era l'ultimo cuore, si ricomincia il livello.
- **Spuntoni**: −1 cuore + spinta verso l'alto.

### 6.4 Blocchi
- **Indistruttibili**: roccia di base, pavimento della miniera di confine.
- **Fragili (1 colpo)**: terra, sabbia, foglie, casse.
- **Duri (2 colpi)**: pietra, arenaria (con crepa visibile dopo il primo colpo).
- **Blocco bonus**: aspetto distinto (gemma pulsante); 1 colpo; rilascia il power-up, che
  salta fuori e resta a terra 8 s prima di sparire lampeggiando.
- Alcuni tratti hanno **muri da scavare** per proseguire (sempre di blocchi rompibili): il piccone serve anche per avanzare, non solo per i bonus.

### 6.5 Power-up
| Power-up | Effetto | Durata |
|---|---|---|
| Cuore | +1 cuore (max 3) | immediato |
| Piccone-boomerang | "Colpisci" lancia il piccone: vola ~7 blocchi, torna indietro; colpisce nemici e rompe blocchi fragili all'andata e al ritorno; un lancio alla volta | 20 s (icona con conto alla rovescia) |
| Invincibilità | immune a nemici, spuntoni e lava; toccare un nemico lo elimina; le buche fanno comunque ricomparire (senza danno) | 5 s |

Probabilità di uscita dai blocchi bonus definita per livello nella ricetta (es. più cuori nei livelli difficili).

### 6.6 Nemici
- **Zombie**: cammina avanti e indietro sulla sua piattaforma, gira ai bordi e ai muri;
  quando il giocatore è entro ~6 blocchi gli va incontro. Resistenza: 1 colpo (liv. 1–5), 2 colpi (liv. 6–10).
- **Mummia**: più lenta; quando il giocatore è entro ~5 blocchi fa una breve carica
  preceduta da un segnale visivo (occhi che si illuminano, 0,5 s). Resistenza: 2 colpi (3 nei livelli 8–10).
- Velocità e reattività crescono con il livello (parametri della ricetta).
- Colpito: arretra e lampeggia; eliminato: si dissolve in particelle.
- I nemici si attivano solo vicino alla camera (niente nemici "fuori schermo" che arrivano all'improvviso).
- Saltare in testa ai nemici **non** li elimina (si viene danneggiati): l'arma è il piccone.

### 6.7 Livelli e generatore guidato
- Ogni livello ha una **ricetta**: ambiente, seme casuale fisso, lunghezza, tempo limite,
  pesi dei "segmenti", densità e tipo di nemici, larghezza massima delle buche, quantità di
  lava e spuntoni, blocchi bonus e tabella dei power-up.
- Il generatore concatena **segmenti** già fattibili per costruzione: piano, gradini su/giù,
  buca, buca con lava, piattaforme sospese, fila di spuntoni, muro da scavare, galleria bassa
  (miniera), gruppo di nemici, nicchia con blocco bonus, spuntoni a scomparsa (liv. 7+).
- Inizio (zona sicura con un blocco bonus tutorial) e fine (portale/uscita della miniera o
  bandiera) sono pezzi fissi disegnati a mano.
- **Validatore**: verifica con le costanti di fisica che ogni salto sia raggiungibile e che
  non esistano passaggi chiusi da blocchi indistruttibili; in caso contrario rigenera il segmento.
  Stesso seme → stesso livello per tutti i tester.
- **Durata**: lunghezza calibrata perché un giocatore medio finisca in ~100–110 s con limite di **120 s**;
  nei livelli finali il margine si riduce (es. limite 120 s, percorso più denso).

| # | Ambiente | Novità introdotte |
|---|---|---|
| 1 | Foresta | tutorial: zombie lenti, buche piccole, primo blocco bonus |
| 2 | Foresta al tramonto | più zombie, piattaforme sospese |
| 3 | Ingresso miniera | buio, gallerie basse, prima lava, muri da scavare |
| 4 | Deserto | mummie, sabbia, buche più larghe |
| 5 | Dune | spuntoni, mix zombie + mummie |
| 6 | Miniera profonda | lava frequente, zombie a 2 colpi |
| 7 | Foresta di notte | spuntoni a scomparsa, gruppi di nemici |
| 8 | Tomba nel deserto (interno) | mummie a 3 colpi, corridoi stretti |
| 9 | Miniera di lava | lava ovunque, piattaforme strette |
| 10 | Abisso | tutto insieme, margine di tempo minimo |

### 6.8 Interfaccia e schermate
- **Controlli touch**: a sinistra ◀ ▶ (cammina), a destra **SALTA** (grande) e **COLPISCI**;
  semitrasparenti, ai bordi in basso, area di tocco ampia (≥ 64 px), multi-touch, feedback visivo
  e vibrazione breve dove supportata. Il tocco può scivolare da ◀ a ▶ senza sollevare il dito.
- **Tastiera (PC/test)**: frecce o A/D, Spazio/W salta, J/K colpisce, P/Esc pausa.
- **HUD**: cuori (alto a sinistra), timer (alto al centro, rosso e pulsante sotto i 15 s),
  power-up attivo con conto alla rovescia, punteggio, pulsante pausa (alto a destra),
  barra di avanzamento del livello.
- **Schermate**: caricamento → titolo ("Tocca per giocare") → selezione livelli (10 riquadri,
  bloccati/sbloccati, miglior tempo) → gioco → pausa (riprendi, ricomincia, livelli, audio on/off)
  → livello completato (tempo, punteggio, record, "Avanti") / tempo scaduto o cuori finiti ("Riprova").
  Introduzione breve all'inizio di ogni livello ("Livello 4 — Deserto").
- **Rotazione**: in verticale compare una schermata "Ruota il telefono" e il gioco va in pausa.
- Pausa automatica quando l'app va in background.

### 6.9 Punteggio e salvataggi
- Punti: blocco rotto, nemico eliminato, power-up, bonus per secondi rimasti a fine livello.
- Salvati sul dispositivo (localStorage, protetto da errori): livelli sbloccati, miglior tempo
  e punteggio per livello, impostazione audio. Senza salvataggio il gioco funziona comunque.

### 6.10 Audio
- Effetti sintetizzati via Web Audio (nessun file): passo, salto, colpo, rottura, danno,
  power-up, nemico eliminato, timer in scadenza, vittoria, sconfitta.
- Musica di sottofondo semplice, generata via codice, diversa per esterni e miniere; disattivabile.
- L'audio parte solo dopo il primo tocco (requisito dei browser mobili).

### 6.11 Pubblicazione
- Sito statico; `manifest.webmanifest` (orientamento landscape, schermo intero, icone generate),
  service worker per il funzionamento offline, meta tag per iOS.
- Pubblicazione prevista su GitHub Pages (va attivata nelle impostazioni del repository).

## 7. Qualità e verifica

- **Test automatici (Node, senza dipendenze)**: generatore deterministico, tutti i 10 livelli
  superano il validatore, fisica (altezza/distanza di salto, collisioni), danni e power-up.
- **Test nel browser (Playwright)**: caricamento senza errori in console su viewport di
  iPhone e Android in orizzontale, avvio livello, simulazione dei tocchi, screenshot di ogni ambiente.
- **Bot di percorrenza**: un giocatore automatico semplice attraversa ogni livello per stimarne
  la durata e confermare che sia completabile entro il limite.
- **Prestazioni**: pixel ratio limitato (max 2), chunk fuori vista non disegnati, nessuna
  ombra dinamica costosa; obiettivo 60 fps su telefono medio.

## 8. Lasciato al costruttore (decisioni proprie, segnalate)

- Valori esatti di fisica e bilanciamento entro i limiti sopra (da rifinire con i test).
- Ricette precise di ogni livello e tabelle dei power-up.
- Disegno dei pezzi di inizio/fine livello, palette, forma dei personaggi.
- Melodie e timbri dei suoni.
- Massimo cuori = 3; buche/lava = −1 cuore e ricomparsa; nessuna uccisione saltando in testa
  (scelte mie, proposte nel documento e modificabili).
