import type { EventBus } from '../core/EventBus.ts';

type BattleState = 'idle' | 'intro' | 'choosing' | 'animating' | 'won' | 'lost';

interface TextQueueItem {
  text: string;
  onDone?: () => void;
}

interface WrongMove {
  name: string;
  playerText: string;
  responseText: string;
}

const CHAR_DELAY = 0.04; // 40ms per character
const PLAYER_MAX_HP = 100;
const BOSS_HP = 999;
const BOSS_WIN_BONUS = 500;

// Full pool of wrong moves — 3 are randomly picked each encounter
const WRONG_MOVE_POOL: WrongMove[] = [
  {
    name: 'DEMO',
    playerText: 'PEKERJA SAWIT used DEMO!',
    responseText: "Not very effective... WOWOWIT's passive: ANTI-DEMO ASHENG!",
  },
  {
    name: 'LEMPAR NAMPAN MBG',
    playerText: 'PEKERJA SAWIT used LEMPAR NAMPAN MBG!',
    responseText: "WOWOWIT caught it! He's used to this...",
  },
  {
    name: 'MOGOK KERJA',
    playerText: 'PEKERJA SAWIT used MOGOK KERJA!',
    responseText: "No effect... WOWOWIT doesn't care!",
  },
  {
    name: 'LAPOR GAPEKA',
    playerText: 'PEKERJA SAWIT used LAPOR GAPEKA!',
    responseText: 'WOWOWIT has IMUNITAS POLITIK!',
  },
  {
    name: 'VIRAL DI MEDSOS',
    playerText: 'PEKERJA SAWIT used VIRAL DI MEDSOS!',
    responseText: 'WOWOWIT used BLOKIR INTERNET!',
  },
  {
    name: 'PANGGIL SERIKAT',
    playerText: 'PEKERJA SAWIT used PANGGIL SERIKAT!',
    responseText: 'WOWOWIT used INTIMIDASI! Serikat bubar...',
  },
  {
    name: 'TULIS SURAT',
    playerText: 'PEKERJA SAWIT used TULIS SURAT!',
    responseText: "WOWOWIT can't read... it's not very effective!",
  },
  {
    name: 'PROTES DI DEPEER',
    playerText: 'PEKERJA SAWIT used PROTES DI DEPEER!',
    responseText: 'DEPEER is sleeping... No one noticed!',
  },
  {
    name: 'BIKIN PETISI',
    playerText: 'PEKERJA SAWIT used BIKIN PETISI!',
    responseText: 'WOWOWIT used TANDA TANGAN PALSU! Petisi dibatalkan!',
  },
  {
    name: 'HUBUNGI OMBUDSBOY',
    playerText: 'PEKERJA SAWIT used HUBUNGI OMBUDSBOY!',
    responseText: 'OMBUDSBOY is on vacation... No answer!',
  },
];

const COUNTERATTACKS = [
  { text: 'WOWOWIT used SURAT PERINGATAN!', baseDamage: 20 },
  { text: 'WOWOWIT used POTONG GAJI!', baseDamage: 25 },
  { text: 'WOWOWIT used MUTASI KE PEDALAMAN!', baseDamage: 30 },
];

export class TurnBattle {
  private eventBus: EventBus;
  private state: BattleState = 'idle';
  private playerHp = PLAYER_MAX_HP;
  private bossHp = BOSS_HP;
  private wrongMoveCount = 0;
  private encounter = 0; // which boss encounter (0-indexed)
  private praisesNeeded = 1;
  private praisesGiven = 0;

  // Current encounter's randomly picked wrong moves
  private activeWrongMoves: WrongMove[] = [];

  // Typewriter
  private textQueue: TextQueueItem[] = [];
  private currentText = '';
  private displayedChars = 0;
  private charTimer = 0;

  // Pause timer for delays between steps
  private pauseTimer = 0;
  private _pendingCallback: (() => void) | null = null;

  // DOM refs
  private overlay: HTMLElement;
  private dialogueEl: HTMLElement;
  private playerHpFill: HTMLElement;
  private playerHpText: HTMLElement;
  private bossHpFill: HTMLElement;
  private bossHpText: HTMLElement;
  private moveButtons: HTMLButtonElement[];

  // Track which button index is MEMUJI (randomized each encounter)
  private memujiButtonIndex = 3;

  // Click handlers for cleanup
  private boundMoveHandlers: (() => void)[] = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.overlay = document.getElementById('turnBattleOverlay')!;
    this.dialogueEl = document.getElementById('tbDialogue')!;
    this.playerHpFill = document.getElementById('tbPlayerHpFill')!;
    this.playerHpText = document.getElementById('tbPlayerHpText')!;
    this.bossHpFill = document.getElementById('tbBossHpFill')!;
    this.bossHpText = document.getElementById('tbBossHpText')!;

    this.moveButtons = [0, 1, 2, 3].map((i) =>
      document.getElementById(`tbMove${i}`) as HTMLButtonElement,
    );

    // Each button handler checks dynamically whether it's MEMUJI or a wrong move
    for (let i = 0; i < 4; i++) {
      const idx = i;
      const handler = () => this.onButtonPressed(idx);
      this.boundMoveHandlers.push(handler);
      this.moveButtons[i]!.addEventListener('click', handler);
    }
  }

  start(encounterNumber: number): void {
    this.state = 'intro';
    this.encounter = encounterNumber;
    this.playerHp = PLAYER_MAX_HP;
    this.bossHp = BOSS_HP;
    this.wrongMoveCount = 0;
    this.praisesNeeded = Math.min(encounterNumber + 1, 3); // boss 1: 1, boss 2: 2, boss 3+: 3
    this.praisesGiven = 0;
    this.textQueue = [];
    this.currentText = '';
    this.displayedChars = 0;
    this.charTimer = 0;
    this.pauseTimer = 0;
    this._pendingCallback = null;

    // Pick 3 random wrong moves for this encounter
    this.pickRandomMoves();

    this.updateHpBars();
    this.setMovesEnabled(false);
    this.overlay.classList.remove('hidden');

    // Remove hint glow from previous runs
    this.moveButtons[this.memujiButtonIndex]?.classList.remove('hint-glow');

    this.enqueueText('A wild SAWITO WOWOWIT appeared!', () => {
      this.enqueueText('What will PEKERJA SAWIT do?', () => {
        this.state = 'choosing';
        this.setMovesEnabled(true);
      });
    });
  }

  isActive(): boolean {
    return this.state !== 'idle';
  }

  update(dt: number): void {
    if (this.state === 'idle') return;

    // Handle pause timer
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.advanceQueue();
      }
      return;
    }

    // Typewriter effect
    if (this.currentText && this.displayedChars < this.currentText.length) {
      this.charTimer += dt;
      while (this.charTimer >= CHAR_DELAY && this.displayedChars < this.currentText.length) {
        this.charTimer -= CHAR_DELAY;
        this.displayedChars++;
        this.dialogueEl.textContent = this.currentText.slice(0, this.displayedChars);
      }

      // Text finished revealing
      if (this.displayedChars >= this.currentText.length) {
        const item = this.textQueue[0];
        this.textQueue.shift();
        if (item?.onDone) {
          this.pauseTimer = 0.6;
          this._pendingCallback = item.onDone;
        } else if (this.textQueue.length > 0) {
          this.pauseTimer = 0.6;
        }
      }
    }
  }

  private advanceQueue(): void {
    if (this._pendingCallback) {
      const cb = this._pendingCallback;
      this._pendingCallback = null;
      cb();
      return;
    }

    if (this.textQueue.length > 0) {
      const next = this.textQueue[0]!;
      this.currentText = next.text;
      this.displayedChars = 0;
      this.charTimer = 0;
      this.dialogueEl.textContent = '';
    }
  }

  private enqueueText(text: string, onDone?: () => void): void {
    const wasEmpty = this.textQueue.length === 0 && !this.currentText;
    this.textQueue.push({ text, onDone });

    if (wasEmpty || (this.displayedChars >= this.currentText.length && !this._pendingCallback)) {
      const item = this.textQueue[0]!;
      this.currentText = item.text;
      this.displayedChars = 0;
      this.charTimer = 0;
      this.dialogueEl.textContent = '';
    }
  }

  private onButtonPressed(btnIndex: number): void {
    if (btnIndex === this.memujiButtonIndex) {
      this.onMemujiSelected();
    } else {
      // Map button index to wrong move index (skip the MEMUJI slot)
      let wrongIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === this.memujiButtonIndex) continue;
        if (i === btnIndex) break;
        wrongIdx++;
      }
      this.onWrongMoveSelected(wrongIdx);
    }
  }

  private pickRandomMoves(): void {
    // Shuffle wrong moves and pick 3
    const shuffled = [...WRONG_MOVE_POOL];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    this.activeWrongMoves = shuffled.slice(0, 3);

    // Randomize which button slot gets MEMUJI
    this.memujiButtonIndex = Math.floor(Math.random() * 4);

    // Assign labels: wrong moves fill non-MEMUJI slots
    let wrongIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === this.memujiButtonIndex) {
        this.moveButtons[i]!.textContent = 'MEMUJI';
      } else {
        this.moveButtons[i]!.textContent = this.activeWrongMoves[wrongIdx]!.name;
        wrongIdx++;
      }
    }
  }

  /** Hint glow threshold scales with encounter: boss 1 → after 2, boss 2 → after 3, boss 3+ → after 4 */
  private get hintThreshold(): number {
    return Math.min(2 + this.encounter, 4);
  }

  /** Counterattack damage scales: +5 per encounter */
  private getCounterDamage(baseDamage: number): number {
    return baseDamage + this.encounter * 5;
  }

  private onWrongMoveSelected(idx: number): void {
    if (this.state !== 'choosing') return;
    this.state = 'animating';
    this.setMovesEnabled(false);

    const move = this.activeWrongMoves[idx]!;
    this.wrongMoveCount++;

    this.enqueueText(move.playerText, () => {
      this.enqueueText(move.responseText, () => {
        // Counterattack
        const counter = COUNTERATTACKS[Math.floor(Math.random() * COUNTERATTACKS.length)]!;
        const damage = this.getCounterDamage(counter.baseDamage);
        this.enqueueText(counter.text, () => {
          this.playerHp = Math.max(0, this.playerHp - damage);
          this.updateHpBars();

          if (this.playerHp <= 0) {
            this.enqueueText('PEKERJA SAWIT fainted!', () => {
              this.state = 'lost';
              this.pauseTimer = 1.0;
              this._pendingCallback = () => {
                this.hide();
                this.eventBus.emit('OBSTACLE_HIT', { type: 'boss_battle' });
              };
            });
          } else {
            if (this.wrongMoveCount >= this.hintThreshold) {
              this.moveButtons[this.memujiButtonIndex]?.classList.add('hint-glow');
            }

            // Reshuffle wrong moves for variety
            this.pickRandomMoves();

            this.enqueueText('What will PEKERJA SAWIT do?', () => {
              this.state = 'choosing';
              this.setMovesEnabled(true);
            });
          }
        });
      });
    });
  }

  private onMemujiSelected(): void {
    if (this.state !== 'choosing') return;
    this.state = 'animating';
    this.setMovesEnabled(false);

    this.praisesGiven++;

    this.enqueueText('PEKERJA SAWIT used MEMUJI!', () => {
      if (this.praisesGiven >= this.praisesNeeded) {
        // Final praise — win!
        this.bossHp = 0;
        this.updateHpBars();
        this.enqueueText('SUPER EFFECTIVE! WOWOWIT is flattered! Promoted to KOMISARIS!', () => {
          this.state = 'won';
          this.pauseTimer = 1.5;
          this._pendingCallback = () => {
            this.hide();
            this.eventBus.emit('BOSS_WON', { bonus: BOSS_WIN_BONUS });
          };
        });
      } else {
        // Partial praise — boss HP drops visually, but not dead yet
        const hpPerPraise = BOSS_HP / this.praisesNeeded;
        this.bossHp = Math.max(0, BOSS_HP - hpPerPraise * this.praisesGiven);
        this.updateHpBars();

        const remaining = this.praisesNeeded - this.praisesGiven;
        this.enqueueText(
          `It's somewhat effective... WOWOWIT wants ${remaining} more praise!`,
          () => {
            // Boss counterattacks even after partial praise
            const counter = COUNTERATTACKS[Math.floor(Math.random() * COUNTERATTACKS.length)]!;
            const damage = this.getCounterDamage(counter.baseDamage);
            this.enqueueText(counter.text, () => {
              this.playerHp = Math.max(0, this.playerHp - damage);
              this.updateHpBars();

              if (this.playerHp <= 0) {
                this.enqueueText('PEKERJA SAWIT fainted!', () => {
                  this.state = 'lost';
                  this.pauseTimer = 1.0;
                  this._pendingCallback = () => {
                    this.hide();
                    this.eventBus.emit('OBSTACLE_HIT', { type: 'boss_battle' });
                  };
                });
              } else {
                this.enqueueText('What will PEKERJA SAWIT do?', () => {
                  this.state = 'choosing';
                  this.setMovesEnabled(true);
                });
              }
            });
          },
        );
      }
    });
  }

  private setMovesEnabled(enabled: boolean): void {
    for (const btn of this.moveButtons) {
      btn.disabled = !enabled;
    }
  }

  private updateHpBars(): void {
    const playerPct = Math.max(0, (this.playerHp / PLAYER_MAX_HP) * 100);
    const bossPct = Math.max(0, (this.bossHp / BOSS_HP) * 100);
    this.playerHpFill.style.width = `${playerPct}%`;
    this.playerHpText.textContent = `${this.playerHp}/${PLAYER_MAX_HP}`;
    this.bossHpFill.style.width = `${bossPct}%`;
    this.bossHpText.textContent = `${this.bossHp}/${BOSS_HP}`;
  }

  private hide(): void {
    this.state = 'idle';
    this.overlay.classList.add('hidden');
    this.dialogueEl.textContent = '';
    this.moveButtons[this.memujiButtonIndex]?.classList.remove('hint-glow');
  }

  dispose(): void {
    this.hide();
    for (let i = 0; i < this.moveButtons.length; i++) {
      this.moveButtons[i]?.removeEventListener('click', this.boundMoveHandlers[i]!);
    }
    this.boundMoveHandlers = [];
  }
}
