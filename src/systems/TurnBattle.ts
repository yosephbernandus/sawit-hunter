import type { EventBus } from '../core/EventBus.ts';

type BattleState = 'idle' | 'intro' | 'choosing' | 'animating' | 'won' | 'lost';

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
    responseText: "Not very effective... WOWOWITO's passive: ANTI-DEMO ASHENG!",
  },
  {
    name: 'LEMPAR NAMPAN MBG',
    playerText: 'PEKERJA SAWIT used LEMPAR NAMPAN MBG!',
    responseText: "WOWOWITO caught it! He's used to this...",
  },
  {
    name: 'MOGOK KERJA',
    playerText: 'PEKERJA SAWIT used MOGOK KERJA!',
    responseText: "No effect... WOWOWITO doesn't care!",
  },
  {
    name: 'LAPOR GAPEKA',
    playerText: 'PEKERJA SAWIT used LAPOR GAPEKA!',
    responseText: 'WOWOWITO has IMUNITAS POLITIK!',
  },
  {
    name: 'VIRAL DI MEDSOS',
    playerText: 'PEKERJA SAWIT used VIRAL DI MEDSOS!',
    responseText: 'WOWOWITO used BLOKIR INTERNET!',
  },
  {
    name: 'PANGGIL SERIKAT',
    playerText: 'PEKERJA SAWIT used PANGGIL SERIKAT!',
    responseText: 'WOWOWITO used INTIMIDASI! Serikat bubar...',
  },
  {
    name: 'TULIS SURAT',
    playerText: 'PEKERJA SAWIT used TULIS SURAT!',
    responseText: "WOWOWITO can't read... it's not very effective!",
  },
  {
    name: 'PROTES DI DEPEER',
    playerText: 'PEKERJA SAWIT used PROTES DI DEPEER!',
    responseText: 'DEPEER is sleeping... No one noticed!',
  },
  {
    name: 'BIKIN PETISI',
    playerText: 'PEKERJA SAWIT used BIKIN PETISI!',
    responseText: 'WOWOWITO used TANDA TANGAN PALSU! Petisi dibatalkan!',
  },
  {
    name: 'HUBUNGI OMBUDSBOY',
    playerText: 'PEKERJA SAWIT used HUBUNGI OMBUDSBOY!',
    responseText: 'OMBUDSBOY is on vacation... No answer!',
  },
];

const COUNTERATTACKS = [
  { text: 'WOWOWITO used SURAT PERINGATAN!', baseDamage: 20 },
  { text: 'WOWOWITO used POTONG GAJI!', baseDamage: 25 },
  { text: 'WOWOWITO used MUTASI KE PEDALAMAN!', baseDamage: 30 },
];

export class TurnBattle {
  private eventBus: EventBus;
  private state: BattleState = 'idle';
  private playerHp = PLAYER_MAX_HP;
  private bossHp = BOSS_HP;
  private wrongMoveCount = 0;
  private encounter = 0;
  private praisesNeeded = 1;
  private praisesGiven = 0;

  // Current encounter's randomly picked wrong moves
  private activeWrongMoves: WrongMove[] = [];

  // Typewriter — simplified: single current item, queue is a plain array
  private typeQueue: { text: string; delay: number; onDone?: () => void }[] = [];
  private typeCurrent: { text: string; delay: number; onDone?: () => void } | null = null;
  private typeChars = 0;
  private typeTimer = 0;
  private delayTimer = 0; // pause between dialogue lines

  // DOM refs
  private overlay: HTMLElement;
  private dialogueEl: HTMLElement;
  private playerHpFill: HTMLElement;
  private playerHpText: HTMLElement;
  private bossHpFill: HTMLElement;
  private bossHpText: HTMLElement;
  private moveButtons: HTMLButtonElement[];

  // Track which button index is MEMUJI (randomized each reshuffle)
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

    for (let i = 0; i < 4; i++) {
      const idx = i;
      const handler = () => this.onButtonPressed(idx);
      this.boundMoveHandlers.push(handler);
      this.moveButtons[i]!.addEventListener('click', handler);
    }
  }

  start(encounterNumber: number): void {
    // Guard: clean up if somehow called while active
    if (this.state !== 'idle') {
      this.clearAllGlow();
    }

    this.state = 'intro';
    this.encounter = encounterNumber;
    this.playerHp = PLAYER_MAX_HP;
    this.bossHp = BOSS_HP;
    this.wrongMoveCount = 0;
    this.praisesNeeded = Math.min(encounterNumber + 1, 3);
    this.praisesGiven = 0;

    // Reset typewriter
    this.typeQueue = [];
    this.typeCurrent = null;
    this.typeChars = 0;
    this.typeTimer = 0;
    this.delayTimer = 0;

    this.pickRandomMoves();
    this.updateHpBars();
    this.setMovesEnabled(false);
    this.overlay.classList.remove('hidden');

    this.say('A wild SAWITO WOWOWITO appeared!', () => {
      this.say('What will PEKERJA SAWIT do?', () => {
        this.state = 'choosing';
        this.setMovesEnabled(true);
      }, 1.2);
    });
  }

  isActive(): boolean {
    return this.state !== 'idle';
  }

  update(dt: number): void {
    if (this.state === 'idle') return;

    // Inter-line delay
    if (this.delayTimer > 0) {
      this.delayTimer -= dt;
      if (this.delayTimer <= 0) {
        this.startNextItem();
      }
      return;
    }

    if (!this.typeCurrent) return;

    const text = this.typeCurrent.text;

    // Typewriter reveal
    if (this.typeChars < text.length) {
      this.typeTimer += dt;
      while (this.typeTimer >= CHAR_DELAY && this.typeChars < text.length) {
        this.typeTimer -= CHAR_DELAY;
        this.typeChars++;
      }
      this.dialogueEl.textContent = text.slice(0, this.typeChars);
    }

    // Finished revealing current line
    if (this.typeChars >= text.length) {
      const done = this.typeCurrent.onDone;
      this.typeCurrent = null;

      if (done) {
        // Run callback, which may enqueue more text
        done();
      }

      // If callback enqueued more text, use next item's delay before showing it
      if (this.typeQueue.length > 0 && !this.typeCurrent) {
        this.delayTimer = this.typeQueue[0]!.delay;
      }
    }
  }

  /** Enqueue a dialogue line. delay = seconds to wait before this line starts (default 0.8). */
  private say(text: string, onDone?: () => void, delay = 0.8): void {
    this.typeQueue.push({ text, onDone, delay });

    // If idle (no current text being typed), kick off immediately
    if (!this.typeCurrent && this.delayTimer <= 0) {
      this.startNextItem();
    }
  }

  private startNextItem(): void {
    if (this.typeQueue.length === 0) return;
    this.typeCurrent = this.typeQueue.shift()!;
    this.typeChars = 0;
    this.typeTimer = 0;
    this.dialogueEl.textContent = '';
  }

  private onButtonPressed(btnIndex: number): void {
    // Guard: only allow clicks during choosing state
    if (this.state !== 'choosing') return;

    // Immediately lock out further clicks
    this.state = 'animating';
    this.setMovesEnabled(false);

    if (btnIndex === this.memujiButtonIndex) {
      this.doMemuji();
    } else {
      let wrongIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === this.memujiButtonIndex) continue;
        if (i === btnIndex) break;
        wrongIdx++;
      }
      this.doWrongMove(wrongIdx);
    }
  }

  private pickRandomMoves(): void {
    // Remove glow from ALL buttons before reshuffling
    this.clearAllGlow();

    const shuffled = [...WRONG_MOVE_POOL];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    this.activeWrongMoves = shuffled.slice(0, 3);

    this.memujiButtonIndex = Math.floor(Math.random() * 4);

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

  private get hintThreshold(): number {
    return Math.min(2 + this.encounter, 4);
  }

  private getCounterDamage(baseDamage: number): number {
    return baseDamage + this.encounter * 5;
  }

  private doWrongMove(idx: number): void {
    const move = this.activeWrongMoves[idx]!;
    this.wrongMoveCount++;

    this.say(move.playerText, () => {
      this.say(move.responseText, () => {
        const counter = COUNTERATTACKS[Math.floor(Math.random() * COUNTERATTACKS.length)]!;
        const damage = this.getCounterDamage(counter.baseDamage);
        this.say(counter.text, () => {
          this.playerHp = Math.max(0, this.playerHp - damage);
          this.updateHpBars();

          if (this.playerHp <= 0) {
            this.doPlayerFainted();
          } else {
            this.pickRandomMoves();

            if (this.wrongMoveCount >= this.hintThreshold) {
              this.moveButtons[this.memujiButtonIndex]?.classList.add('hint-glow');
            }

            this.say('What will PEKERJA SAWIT do?', () => {
              this.state = 'choosing';
              this.setMovesEnabled(true);
            }, 1.2);
          }
        }, 1.2);
      }, 1.0);
    });
  }

  private doMemuji(): void {
    this.praisesGiven++;

    this.say('PEKERJA SAWIT used MEMUJI!', () => {
      if (this.praisesGiven >= this.praisesNeeded) {
        this.bossHp = 0;
        this.updateHpBars();
        this.say('SUPER EFFECTIVE! WOWOWITO is flattered! Promoted to KOMISARIS!', () => {
          this.state = 'won';
          this.typeQueue.push({
            text: '',
            delay: 2.0,
            onDone: () => {
              this.hide();
              this.eventBus.emit('BOSS_WON', { bonus: BOSS_WIN_BONUS });
            },
          });
        }, 1.2);
      } else {
        const hpPerPraise = BOSS_HP / this.praisesNeeded;
        this.bossHp = Math.max(0, BOSS_HP - hpPerPraise * this.praisesGiven);
        this.updateHpBars();

        const remaining = this.praisesNeeded - this.praisesGiven;
        this.say(
          `It's somewhat effective... WOWOWITO wants ${remaining} more praise!`,
          () => {
            const counter = COUNTERATTACKS[Math.floor(Math.random() * COUNTERATTACKS.length)]!;
            const damage = this.getCounterDamage(counter.baseDamage);
            this.say(counter.text, () => {
              this.playerHp = Math.max(0, this.playerHp - damage);
              this.updateHpBars();

              if (this.playerHp <= 0) {
                this.doPlayerFainted();
              } else {
                this.say('What will PEKERJA SAWIT do?', () => {
                  this.state = 'choosing';
                  this.setMovesEnabled(true);
                }, 1.2);
              }
            }, 1.2);
          },
          1.0,
        );
      }
    });
  }

  private doPlayerFainted(): void {
    this.say('PEKERJA SAWIT fainted!', () => {
      this.state = 'lost';
      this.typeQueue.push({
        text: '',
        delay: 1.5,
        onDone: () => {
          this.hide();
          this.eventBus.emit('OBSTACLE_HIT', { type: 'boss_battle' });
        },
      });
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

  /** Remove hint-glow from ALL buttons (prevents stale glow on reshuffle) */
  private clearAllGlow(): void {
    for (const btn of this.moveButtons) {
      btn.classList.remove('hint-glow');
    }
  }

  private hide(): void {
    this.state = 'idle';
    this.overlay.classList.add('hidden');
    this.dialogueEl.textContent = '';
    this.clearAllGlow();
    this.typeCurrent = null;
    this.typeQueue = [];
  }

  dispose(): void {
    this.hide();
    for (let i = 0; i < this.moveButtons.length; i++) {
      this.moveButtons[i]?.removeEventListener('click', this.boundMoveHandlers[i]!);
    }
    this.boundMoveHandlers = [];
  }
}
