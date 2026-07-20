// Original roster — invented characters, no copyrighted names or art.
export type Element = "Pyro" | "Hydro" | "Electro" | "Cryo" | "Anemo" | "Geo" | "Dendro";
export type Weapon = "Sword" | "Claymore" | "Polearm" | "Bow" | "Catalyst";
export type Role = "DPS" | "Sub-DPS" | "Support" | "Healer";

export interface Character {
  id: string;
  name: string;
  element: Element;
  weapon: Weapon;
  role: Role;
  rarity: 4 | 5;
  atk: number; // base stat block
  hp: number;
  def: number;
}

export const ELEMENT_COLORS: Record<Element, string> = {
  Pyro: "#EF7938", Hydro: "#4CC2F1", Electro: "#B07CE8", Cryo: "#7FC7DB",
  Anemo: "#74C2A8", Geo: "#D9A93A", Dendro: "#8FBF3B",
};

export const characters: Character[] = [
  { id: "embra", name: "Embra", element: "Pyro", weapon: "Claymore", role: "DPS", rarity: 5, atk: 342, hp: 12900, def: 780 },
  { id: "cindral", name: "Cindral", element: "Pyro", weapon: "Catalyst", role: "Sub-DPS", rarity: 4, atk: 301, hp: 10100, def: 640 },
  { id: "ashwyn", name: "Ashwyn", element: "Pyro", weapon: "Bow", role: "Sub-DPS", rarity: 4, atk: 288, hp: 9800, def: 615 },
  { id: "pyrrha", name: "Pyrrha", element: "Pyro", weapon: "Polearm", role: "DPS", rarity: 5, atk: 356, hp: 12100, def: 730 },
  { id: "brasa", name: "Brasa", element: "Pyro", weapon: "Sword", role: "Support", rarity: 4, atk: 244, hp: 11400, def: 700 },
  { id: "maris", name: "Maris", element: "Hydro", weapon: "Catalyst", role: "Healer", rarity: 5, atk: 249, hp: 14500, def: 690 },
  { id: "torrin", name: "Torrin", element: "Hydro", weapon: "Sword", role: "DPS", rarity: 5, atk: 335, hp: 12600, def: 745 },
  { id: "lagune", name: "Lagune", element: "Hydro", weapon: "Bow", role: "Sub-DPS", rarity: 4, atk: 295, hp: 10300, def: 630 },
  { id: "brooke", name: "Brooke", element: "Hydro", weapon: "Polearm", role: "Support", rarity: 4, atk: 252, hp: 11900, def: 685 },
  { id: "nimbe", name: "Nimbe", element: "Hydro", weapon: "Claymore", role: "Sub-DPS", rarity: 4, atk: 302, hp: 10900, def: 662 },
  { id: "voltara", name: "Voltara", element: "Electro", weapon: "Polearm", role: "DPS", rarity: 5, atk: 349, hp: 12300, def: 735 },
  { id: "joule", name: "Joule", element: "Electro", weapon: "Catalyst", role: "Sub-DPS", rarity: 4, atk: 297, hp: 10000, def: 628 },
  { id: "raiya", name: "Raiya", element: "Electro", weapon: "Sword", role: "Sub-DPS", rarity: 5, atk: 318, hp: 11700, def: 708 },
  { id: "static", name: "Statica", element: "Electro", weapon: "Bow", role: "Support", rarity: 4, atk: 251, hp: 11200, def: 676 },
  { id: "ohmara", name: "Ohmara", element: "Electro", weapon: "Claymore", role: "Healer", rarity: 4, atk: 240, hp: 13600, def: 720 },
  { id: "frostine", name: "Frostine", element: "Cryo", weapon: "Catalyst", role: "DPS", rarity: 5, atk: 338, hp: 12000, def: 725 },
  { id: "glacio", name: "Glacio", element: "Cryo", weapon: "Claymore", role: "DPS", rarity: 4, atk: 312, hp: 11100, def: 668 },
  { id: "shiver", name: "Shiverelle", element: "Cryo", weapon: "Bow", role: "Sub-DPS", rarity: 4, atk: 290, hp: 9900, def: 618 },
  { id: "borea", name: "Borea", element: "Cryo", weapon: "Sword", role: "Support", rarity: 4, atk: 248, hp: 11500, def: 692 },
  { id: "hail", name: "Hailwyn", element: "Cryo", weapon: "Polearm", role: "Healer", rarity: 5, atk: 246, hp: 14100, def: 688 },
  { id: "zephra", name: "Zephra", element: "Anemo", weapon: "Sword", role: "Support", rarity: 5, atk: 262, hp: 12200, def: 710 },
  { id: "galeon", name: "Galeon", element: "Anemo", weapon: "Claymore", role: "DPS", rarity: 4, atk: 308, hp: 10800, def: 655 },
  { id: "sirocco", name: "Sirocco", element: "Anemo", weapon: "Catalyst", role: "Sub-DPS", rarity: 4, atk: 293, hp: 10200, def: 632 },
  { id: "brisa", name: "Brisa", element: "Anemo", weapon: "Bow", role: "Healer", rarity: 4, atk: 238, hp: 13200, def: 705 },
  { id: "terron", name: "Terron", element: "Geo", weapon: "Claymore", role: "DPS", rarity: 5, atk: 345, hp: 12700, def: 800 },
  { id: "quartzia", name: "Quartzia", element: "Geo", weapon: "Polearm", role: "Sub-DPS", rarity: 4, atk: 299, hp: 10600, def: 690 },
  { id: "basalt", name: "Basalt", element: "Geo", weapon: "Sword", role: "Support", rarity: 4, atk: 250, hp: 11800, def: 760 },
  { id: "opaline", name: "Opaline", element: "Geo", weapon: "Catalyst", role: "Support", rarity: 5, atk: 258, hp: 12400, def: 745 },
  { id: "sylvane", name: "Sylvane", element: "Dendro", weapon: "Catalyst", role: "DPS", rarity: 5, atk: 336, hp: 12200, def: 718 },
  { id: "mossara", name: "Mossara", element: "Dendro", weapon: "Bow", role: "Sub-DPS", rarity: 4, atk: 292, hp: 10400, def: 636 },
  { id: "fernick", name: "Fernick", element: "Dendro", weapon: "Sword", role: "Support", rarity: 4, atk: 247, hp: 11600, def: 684 },
  { id: "verdana", name: "Verdana", element: "Dendro", weapon: "Polearm", role: "Healer", rarity: 4, atk: 242, hp: 13800, def: 712 },
];
