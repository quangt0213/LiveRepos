// Mock OPTCG-style card database. Names and "art" are original inventions —
// no real card scans or copyrighted characters. Prices are simulated.
export type CardColor = "Red" | "Green" | "Blue" | "Purple" | "Black" | "Yellow";
export type CardType = "Leader" | "Character" | "Event" | "Stage";
export type Rarity = "C" | "UC" | "R" | "SR" | "SEC" | "L";

export interface OptcgCard {
  id: string;
  name: string;
  color: CardColor;
  type: CardType;
  cost: number;
  power: number;
  rarity: Rarity;
  set: string;
  basePrice: number; // USD, seeds the simulated market data
}

/** Deterministic hash for stable per-card randomness (art + price history). */
export function cardHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 30-day simulated price history, deterministic per card. */
export function priceHistory(card: OptcgCard): number[] {
  let h = cardHash(card.id);
  const next = () => {
    h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
  const out: number[] = [];
  let p = card.basePrice * (0.85 + next() * 0.3);
  for (let i = 0; i < 30; i++) {
    p = Math.max(0.25, p * (0.96 + next() * 0.09));
    out.push(Number(p.toFixed(2)));
  }
  return out;
}

const C = (id: string, name: string, color: CardColor, type: CardType, cost: number, power: number, rarity: Rarity, basePrice: number): OptcgCard =>
  ({ id, name, color, type, cost, power, rarity, set: id.split("-")[0], basePrice });

export const optcgCards: OptcgCard[] = [
  C("OP01-001", "Captain Marlow", "Red", "Leader", 0, 5000, "L", 12.5),
  C("OP01-004", "Ember Corsair", "Red", "Character", 2, 3000, "C", 0.35),
  C("OP01-007", "Bosun Ashpike", "Red", "Character", 3, 4000, "UC", 0.6),
  C("OP01-013", "Salvo the Red", "Red", "Character", 5, 6000, "R", 2.1),
  C("OP01-016", "Blazing Broadside", "Red", "Event", 2, 0, "UC", 0.5),
  C("OP01-021", "Verdant Quartermaster", "Green", "Character", 3, 4000, "C", 0.3),
  C("OP01-025", "Vinewhip Lookout", "Green", "Character", 1, 2000, "C", 0.25),
  C("OP01-029", "Kelpbeard Duelist", "Green", "Character", 4, 5000, "R", 1.8),
  C("OP01-031", "Tanglehook Trap", "Green", "Event", 1, 0, "C", 0.3),
  C("OP01-035", "Admiral Coralline", "Blue", "Leader", 0, 5000, "L", 9.75),
  C("OP01-040", "Tidecaller Navigator", "Blue", "Character", 2, 3000, "UC", 0.55),
  C("OP01-043", "Undertow Saboteur", "Blue", "Character", 4, 5000, "R", 2.4),
  C("OP01-047", "Whirlpool Gambit", "Blue", "Event", 3, 0, "UC", 0.65),
  C("OP01-052", "Duchess Nyx", "Purple", "Character", 6, 7000, "SR", 8.9),
  C("OP01-055", "Voidlight Cartographer", "Purple", "Character", 3, 4000, "C", 0.4),
  C("OP01-060", "Eclipse Bargain", "Purple", "Event", 2, 0, "R", 1.5),
  C("OP01-064", "Ironjaw Warden", "Black", "Character", 5, 6000, "R", 2.2),
  C("OP01-068", "Gravekeeper's Ledger", "Black", "Event", 1, 0, "C", 0.3),
  C("OP01-071", "Sunburst Herald", "Yellow", "Character", 2, 3000, "UC", 0.6),
  C("OP01-075", "Judgment of Dawn", "Yellow", "Event", 4, 0, "R", 1.9),
  C("OP01-078", "Marlow, Storm Sovereign", "Red", "Character", 9, 10000, "SEC", 68.0),
  C("OP01-081", "The Drifting Citadel", "Blue", "Stage", 2, 0, "UC", 0.7),
  C("OP02-001", "Warlord Grimtide", "Black", "Leader", 0, 5000, "L", 11.25),
  C("OP02-005", "Cannoneer Pip", "Red", "Character", 1, 2000, "C", 0.25),
  C("OP02-009", "Scarlet Skirmisher", "Red", "Character", 3, 4000, "UC", 0.55),
  C("OP02-014", "Forge-Saint Halberd", "Red", "Character", 7, 8000, "SR", 7.4),
  C("OP02-018", "Mangrove Bruiser", "Green", "Character", 4, 5000, "C", 0.35),
  C("OP02-022", "Sprigatoo the Nimble", "Green", "Character", 2, 3000, "UC", 0.6),
  C("OP02-026", "Overgrowth Surge", "Green", "Event", 3, 0, "R", 1.6),
  C("OP02-030", "Green Warden Ivyrose", "Green", "Leader", 0, 5000, "L", 8.5),
  C("OP02-034", "Frostwake Corsair", "Blue", "Character", 3, 4000, "C", 0.3),
  C("OP02-038", "Charting the Abyss", "Blue", "Event", 2, 0, "UC", 0.5),
  C("OP02-042", "Leviathan's Pact", "Blue", "Event", 5, 0, "SR", 6.8),
  C("OP02-046", "Hexlight Smuggler", "Purple", "Character", 4, 5000, "UC", 0.7),
  C("OP02-050", "Nether Toll", "Purple", "Event", 3, 0, "R", 2.0),
  C("OP02-054", "Bonechime Piper", "Black", "Character", 2, 3000, "C", 0.3),
  C("OP02-058", "Mausoleum March", "Black", "Event", 4, 0, "R", 1.7),
  C("OP02-062", "Grimtide, Unchained", "Black", "Character", 10, 12000, "SEC", 84.0),
  C("OP02-066", "Beacon Cleric", "Yellow", "Character", 3, 4000, "UC", 0.6),
  C("OP02-070", "Radiant Verdict", "Yellow", "Event", 2, 0, "C", 0.35),
  C("OP03-001", "Sky-Empress Zerelda", "Yellow", "Leader", 0, 5000, "L", 13.0),
  C("OP03-005", "Cinderfleet Ensign", "Red", "Character", 2, 3000, "C", 0.3),
  C("OP03-009", "Rocket Gale Ravenna", "Red", "Character", 6, 7000, "SR", 9.2),
  C("OP03-013", "Thornlash Privateer", "Green", "Character", 3, 4000, "UC", 0.55),
  C("OP03-017", "Canopy Ambush", "Green", "Event", 2, 0, "C", 0.3),
  C("OP03-021", "Silverfin Oracle", "Blue", "Character", 4, 5000, "R", 2.6),
  C("OP03-025", "Canal-Maze Chase", "Blue", "Event", 1, 0, "C", 0.25),
  C("OP03-029", "Duskmarket Broker", "Purple", "Character", 3, 4000, "C", 0.4),
  C("OP03-033", "Nightglass Duelist", "Purple", "Character", 5, 6000, "R", 2.8),
  C("OP03-037", "Pactbreaker Vessa", "Purple", "Character", 8, 9000, "SEC", 55.0),
  C("OP03-041", "Cryptbloom Witch", "Black", "Character", 4, 5000, "UC", 0.65),
  C("OP03-045", "Tolling of the Deep", "Black", "Event", 3, 0, "R", 1.8),
  C("OP03-049", "Zenith Lancer", "Yellow", "Character", 5, 6000, "R", 2.3),
  C("OP03-053", "Halo Bastion", "Yellow", "Stage", 2, 0, "UC", 0.6),
  C("OP04-001", "Depthlord Mordecai", "Purple", "Leader", 0, 5000, "L", 10.5),
  C("OP04-006", "Powderkeg Prankster", "Red", "Character", 1, 2000, "C", 0.25),
  C("OP04-011", "Ashen Armada Rally", "Red", "Event", 4, 0, "SR", 5.9),
  C("OP04-016", "Loamheart Colossus", "Green", "Character", 7, 8000, "SR", 7.1),
  C("OP04-021", "Mistveil Corsair", "Blue", "Character", 2, 3000, "C", 0.3),
  C("OP04-026", "Abyssal Toll-Keeper", "Purple", "Character", 6, 7000, "SR", 8.3),
  C("OP04-031", "Reaper's Rebate", "Black", "Event", 2, 0, "UC", 0.55),
  C("OP04-036", "Aurora Vanguard", "Yellow", "Character", 4, 5000, "R", 2.0),
  C("ST01-001", "Rookie Captain Finn", "Red", "Leader", 0, 5000, "L", 3.5),
  C("ST01-004", "Deckhand Duo", "Red", "Character", 2, 3000, "C", 0.2),
  C("ST01-008", "First Voyage", "Red", "Event", 1, 0, "C", 0.2),
];
