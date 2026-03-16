export interface GameScene {
  enter(): void;
  update(dt: number): void;
  exit(): void;
}

export class SceneManager {
  private scenes = new Map<string, GameScene>();
  private activeScene: GameScene | null = null;
  private activeSceneName: string | null = null;

  register(name: string, scene: GameScene): void {
    this.scenes.set(name, scene);
  }

  switch(name: string): void {
    const next = this.scenes.get(name);
    if (!next) {
      console.error(`Scene "${name}" not registered`);
      return;
    }

    this.activeScene?.exit();
    this.activeScene = next;
    this.activeSceneName = name;
    this.activeScene.enter();
  }

  update(dt: number): void {
    this.activeScene?.update(dt);
  }

  getActiveSceneName(): string | null {
    return this.activeSceneName;
  }
}
