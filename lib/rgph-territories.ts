export type RgphDistrict = {
  district: string;
  regions: string[];
};

export const rgphDistricts: RgphDistrict[] = [
  { district: "Abidjan", regions: ["Abidjan"] },
  { district: "Yamoussoukro", regions: ["Yamoussoukro"] },
  { district: "Bas-Sassandra", regions: ["Gbôklé", "Nawa", "San-Pédro"] },
  { district: "Comoé", regions: ["Indénié-Djuablin", "Sud-Comoé"] },
  { district: "Denguélé", regions: ["Folon", "Kabadougou"] },
  { district: "Gôh-Djiboua", regions: ["Gôh", "Lôh-Djiboua"] },
  { district: "Lacs", regions: ["Bélier", "Iffou", "Moronou"] },
  { district: "Lagunes", regions: ["Agnéby-Tiassa", "Grands-Ponts", "La Mé"] },
  { district: "Montagnes", regions: ["Cavally", "Guémon", "Tonkpi"] },
  { district: "Sassandra-Marahoué", regions: ["Haut-Sassandra", "Marahoué"] },
  { district: "Savanes", regions: ["Bagoué", "Poro", "Tchologo"] },
  { district: "Vallée du Bandama", regions: ["Gbêkê", "Hambol"] },
  { district: "Woroba", regions: ["Bafing", "Béré", "Worodougou"] },
  { district: "Zanzan", regions: ["Bounkani", "Gontougo"] },
];

export const allRgphRegions = rgphDistricts.flatMap((item) => item.regions).sort((left, right) => left.localeCompare(right, "fr"));