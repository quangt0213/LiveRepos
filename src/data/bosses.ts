import type { Element } from "./characters";

export interface Boss {
  id: string;
  name: string;
  element: Element;
  hp: number;
  /** damage multiplier taken per element (1 = neutral, <1 resistant, >1 weak) */
  res: Record<Element, number>;
  gimmick: string;
}

const base: Record<Element, number> = {
  Pyro: 1, Hydro: 1, Electro: 1, Cryo: 1, Anemo: 1, Geo: 1, Dendro: 1,
};

export const bosses: Boss[] = [
  { id: "magmaw", name: "Magmaw the Kilnheart", element: "Pyro", hp: 48000, res: { ...base, Pyro: 0.3, Cryo: 1.4, Hydro: 1.5 }, gimmick: "Enrages below 30% HP — attacks hit harder." },
  { id: "tidereaver", name: "Tidereaver Nix", element: "Hydro", hp: 52000, res: { ...base, Hydro: 0.3, Electro: 1.5, Dendro: 1.3 }, gimmick: "Heals itself slightly every other round." },
  { id: "voltking", name: "Volt King Kilofang", element: "Electro", hp: 46000, res: { ...base, Electro: 0.3, Cryo: 1.3, Anemo: 1.2 }, gimmick: "Paralyzes a random hero for one round." },
  { id: "permafrost", name: "Permafrost Wyrm", element: "Cryo", hp: 55000, res: { ...base, Cryo: 0.3, Pyro: 1.6 }, gimmick: "Party attacks 10% weaker unless a Pyro hero is present." },
  { id: "galevoid", name: "Galevoid Harpy", element: "Anemo", hp: 42000, res: { ...base, Anemo: 0.3, Geo: 1.3 }, gimmick: "Dodges the first attack each round." },
  { id: "monolith", name: "Monolith Golem", element: "Geo", hp: 60000, res: { ...base, Geo: 0.3, Pyro: 1.1, Hydro: 1.1, Electro: 1.1, Cryo: 1.1, Dendro: 1.1, Anemo: 0.8 }, gimmick: "Massive HP, but takes bonus damage once its armor cracks (below 50%)." },
  { id: "bramble", name: "Bramblemaw Tyrant", element: "Dendro", hp: 50000, res: { ...base, Dendro: 0.3, Pyro: 1.6, Cryo: 0.9 }, gimmick: "Roots the party — no dodging boss attacks this fight." },
  { id: "prismhex", name: "Prismhex Chimera", element: "Electro", hp: 47000, res: { ...base, Pyro: 0.8, Hydro: 0.8, Electro: 0.8, Cryo: 0.8, Anemo: 0.8, Geo: 0.8, Dendro: 0.8 }, gimmick: "Resistant to everything — reactions are the way through." },
];
