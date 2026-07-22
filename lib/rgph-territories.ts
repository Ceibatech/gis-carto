export type RgphSubPrefecture = {
  nom: string;
  communes: string[];
};

export type RgphDistrict = {
  district: string;
  regions: string[];
  department?: string;
  regionLabel?: string;
  subPrefectures?: RgphSubPrefecture[];
};

export const abidjanDistrictName = "District autonome d’Abidjan";
export const abidjanRegionLabel = "Non applicable — District autonome";
export const abidjanDepartment = "Abidjan";
export const abidjanUrbanSubPrefecture = "Non applicable — Abidjan urbain";

export const abidjanUrbanCommunes = [
  "Abobo",
  "Adjamé",
  "Attécoubé",
  "Cocody",
  "Koumassi",
  "Marcory",
  "Plateau",
  "Port-Bouët",
  "Treichville",
  "Yopougon",
];

export const abidjanSubPrefectures: RgphSubPrefecture[] = [
  {
    nom: abidjanUrbanSubPrefecture,
    communes: abidjanUrbanCommunes,
  },
  {
    nom: "Anyama",
    communes: ["Anyama"],
  },
  {
    nom: "Bingerville",
    communes: ["Bingerville"],
  },
  {
    nom: "Brofodoumé",
    communes: ["Non applicable", "Brofodoumé"],
  },
  {
    nom: "Songon",
    communes: ["Songon"],
  },
];

export const rgphDistricts: RgphDistrict[] = [
  {
    district: abidjanDistrictName,
    regions: [],
    regionLabel: abidjanRegionLabel,
    department: abidjanDepartment,
    subPrefectures: abidjanSubPrefectures,
  },
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
