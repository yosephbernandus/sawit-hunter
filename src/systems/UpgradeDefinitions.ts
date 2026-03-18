export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effectPerLevel: number;
}

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'shieldDuration',
    name: 'Shield Duration',
    description: '+1s shield per level',
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.5,
    effectPerLevel: 1,
  },
  {
    id: 'magnetRange',
    name: 'Magnet Range',
    description: '+20% magnet range per level',
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.5,
    effectPerLevel: 0.2,
  },
  {
    id: 'startingScore',
    name: 'Starting Score',
    description: '+50 starting score per level',
    maxLevel: 3,
    baseCost: 150,
    costMultiplier: 1.8,
    effectPerLevel: 50,
  },
  {
    id: 'coinMultiplier',
    name: 'Coin Multiplier',
    description: '+10% coins per level',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.6,
    effectPerLevel: 0.1,
  },
  {
    id: 'extraLife',
    name: 'Extra Life',
    description: '+1 extra life per level',
    maxLevel: 3,
    baseCost: 300,
    costMultiplier: 2.0,
    effectPerLevel: 1,
  },
];
