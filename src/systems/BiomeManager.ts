import type * as THREE from 'three';
import { BIOMES } from '../rendering/BiomeConfigs.ts';
import type { BiomeConfig } from '../rendering/BiomeConfigs.ts';
import { BIOME_TRANSITION_DISTANCE, BIOME_TRANSITION_DURATION } from '../core/Constants.ts';
import { snapshotColors, lerpColors, type LerpableMaterialKey } from '../rendering/MaterialLibrary.ts';
import { lerpEnvironment } from '../rendering/SceneSetup.ts';
import type { EventBus } from '../core/EventBus.ts';
import type { WorldGenerator } from './WorldGenerator.ts';

const LERP_KEYS: LerpableMaterialKey[] = ['ground', 'path', 'leaf', 'bark'];

export class BiomeManager {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  private world: WorldGenerator;

  private currentIndex = 0;
  private lastTransitionDistance = 0;

  // Transition state
  private transitioning = false;
  private transitionTimer = 0;
  private fromColors: Record<LerpableMaterialKey, THREE.Color> | null = null;
  private fromSky = 0;
  private fromFog = 0;
  private targetBiome: BiomeConfig | null = null;

  // Cached target color map (avoid allocation per frame)
  private targetColorMap: Partial<Record<LerpableMaterialKey, number>> | null = null;

  constructor(scene: THREE.Scene, eventBus: EventBus, world: WorldGenerator) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.world = world;
  }

  get currentBiome(): BiomeConfig {
    return BIOMES[this.currentIndex]!;
  }

  update(dt: number, distance: number): void {
    if (!this.transitioning && distance - this.lastTransitionDistance >= BIOME_TRANSITION_DISTANCE) {
      this.startTransition();
    }

    if (this.transitioning) {
      this.transitionTimer += dt;
      const alpha = Math.min(this.transitionTimer / BIOME_TRANSITION_DURATION, 1);

      lerpColors(this.fromColors!, this.targetColorMap!, alpha);

      lerpEnvironment(
        this.scene,
        this.fromSky, this.fromFog,
        this.targetBiome!.skyColor, this.targetBiome!.fogColor,
        alpha,
      );

      if (alpha >= 1) {
        this.transitioning = false;
        this.fromColors = null;
        this.targetBiome = null;
        this.targetColorMap = null;
        this.eventBus.emit('BIOME_ENTERED', {
          biome: this.currentBiome.name,
          index: this.currentIndex,
        });
      }
    }
  }

  private startTransition(): void {
    const prevBiome = BIOMES[this.currentIndex]!;
    this.currentIndex = (this.currentIndex + 1) % BIOMES.length;
    this.targetBiome = BIOMES[this.currentIndex]!;
    this.lastTransitionDistance += BIOME_TRANSITION_DISTANCE;

    this.fromColors = snapshotColors(LERP_KEYS);
    this.fromSky = prevBiome.skyColor;
    this.fromFog = prevBiome.fogColor;
    this.transitionTimer = 0;
    this.transitioning = true;

    // Cache target color map once per transition
    this.targetColorMap = {
      ground: this.targetBiome.groundColor,
      path: this.targetBiome.pathColor,
      leaf: this.targetBiome.leafColor,
      bark: this.targetBiome.barkColor,
    };

    this.world.setTreeFactory(this.targetBiome.treeFactory);
  }
}
