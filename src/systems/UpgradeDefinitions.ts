export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  effectPerLevel: number;
}

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'shieldDuration',
    name: 'Shield Boost',
    description: '+1s shield (next run)',
    maxLevel: 5,
    baseCost: 50,
    effectPerLevel: 1,
  },
  {
    id: 'magnetRange',
    name: 'Magnet Boost',
    description: '+20% magnet range (next run)',
    maxLevel: 5,
    baseCost: 50,
    effectPerLevel: 0.2,
  },
  {
    id: 'startingScore',
    name: 'Head Start',
    description: '+50 starting score (next run)',
    maxLevel: 3,
    baseCost: 80,
    effectPerLevel: 50,
  },
  {
    id: 'coinMultiplier',
    name: 'Coin Boost',
    description: '+10% coins (next run)',
    maxLevel: 5,
    baseCost: 100,
    effectPerLevel: 0.1,
  },
  {
    id: 'extraLife',
    name: 'Extra Life',
    description: '+1 life (next run)',
    maxLevel: 3,
    baseCost: 150,
    effectPerLevel: 1,
  },
];
