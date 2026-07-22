export type RgphSubPrefecture = {
  code?: string;
  nom: string;
  communes: string[];
  localities?: string[];
};

export type RgphDepartment = {
  code: string;
  nom: string;
  subPrefectures: RgphSubPrefecture[];
};

export type RgphRegion = {
  code: string;
  nom: string;
  departments: RgphDepartment[];
};

export type RgphDistrict = {
  code?: string;
  district: string;
  regions: string[];
  regionItems?: RgphRegion[];
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

// Référentiel ANStat / RGPH 2021: districts, régions, départements et sous-préfectures.
export const rgphDistricts: RgphDistrict[] = [
  {
    code: "01",
    district: abidjanDistrictName,
    regions: [],
    regionLabel: abidjanRegionLabel,
    department: abidjanDepartment,
    subPrefectures: abidjanSubPrefectures,
  },
  {
    "code": "02",
    "district": "Yamoussoukro",
    "regions": [
      "Yamoussoukro"
    ],
    "regionItems": [
      {
        "code": "07",
        "nom": "Yamoussoukro",
        "departments": [
          {
            "code": "072",
            "nom": "Attiegouakro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Attiegouakro",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Lolobo",
                "communes": []
              }
            ]
          },
          {
            "code": "049",
            "nom": "Yamoussoukro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Kossou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Yamoussoukro",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "03",
    "district": "Bas-Sassandra",
    "regions": [
      "Gbôklé",
      "Nawa",
      "San-Pédro"
    ],
    "regionItems": [
      {
        "code": "25",
        "nom": "Gbôklé",
        "departments": [
          {
            "code": "077",
            "nom": "Fresco",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dahiri",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Fresco",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Gbagbam",
                "communes": []
              }
            ]
          },
          {
            "code": "038",
            "nom": "Sassandra",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dakpadou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Grihiri",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Lobakuya",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Medon",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Sago",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Sassandra",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "31",
        "nom": "Nawa",
        "departments": [
          {
            "code": "096",
            "nom": "Buyo",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Buyo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Dapeoua",
                "communes": []
              }
            ]
          },
          {
            "code": "078",
            "nom": "Gueyo",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dabouyo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Gueyo",
                "communes": []
              }
            ]
          },
          {
            "code": "104",
            "nom": "Meagui",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Gnamangui",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Meagui",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Oupoyo",
                "communes": []
              }
            ]
          },
          {
            "code": "041",
            "nom": "Soubre",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Grand-Zattry",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Liliyo",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Okrouyo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Soubre",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "09",
        "nom": "San-Pédro",
        "departments": [
          {
            "code": "037",
            "nom": "San-Pedro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Doba",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Dogbo",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Gabiadji",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Grand-Bereby",
                "communes": []
              },
              {
                "code": "05",
                "nom": "San-Pedro",
                "communes": []
              }
            ]
          },
          {
            "code": "042",
            "nom": "Tabou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dapo-Iboke",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Djamandioke",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Djouroutou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Grabo",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Olodio",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Tabou",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "04",
    "district": "Comoé",
    "regions": [
      "Indénié-Djuablin",
      "Sud-Comoé"
    ],
    "regionItems": [
      {
        "code": "05",
        "nom": "Indénié-Djuablin",
        "departments": [
          {
            "code": "001",
            "nom": "Abengourou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Abengourou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Amelekia",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Aniassue",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Ebilassokro",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Niable",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Yakasse-Feyasse",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Zaranou",
                "communes": []
              }
            ]
          },
          {
            "code": "006",
            "nom": "Agnibilekrou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Agnibilekrou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Akoboissue",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Dame",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Duffrebo",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Tanguelan",
                "communes": []
              }
            ]
          },
          {
            "code": "073",
            "nom": "Bettie",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bettie",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Diamarakro",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "13",
        "nom": "Sud-Comoé",
        "departments": [
          {
            "code": "003",
            "nom": "Aboisso",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Aboisso",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Adaou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Adjouan",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Ayame",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Bianouan",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Kouakro",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Mafere",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Yaou",
                "communes": []
              }
            ]
          },
          {
            "code": "051",
            "nom": "Adiake",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Adiake",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Assinie",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Etueboue",
                "communes": []
              }
            ]
          },
          {
            "code": "055",
            "nom": "Grand-Bassam",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bongo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bonoua",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Grand-Bassam",
                "communes": []
              }
            ]
          },
          {
            "code": "092",
            "nom": "Tiapoum",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Noe",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Nouamou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Tiapoum",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "05",
    "district": "Denguélé",
    "regions": [
      "Folon",
      "Kabadougou"
    ],
    "regionItems": [
      {
        "code": "24",
        "nom": "Folon",
        "departments": [
          {
            "code": "081",
            "nom": "Kaniasso",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Goulia",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kaniasso",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Mahandiana-Sokourani",
                "communes": []
              }
            ]
          },
          {
            "code": "068",
            "nom": "Minignan",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Kimbirila-Nord",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Minignan",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Sokoro",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Tienko",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "10",
        "nom": "Kabadougou",
        "departments": [
          {
            "code": "100",
            "nom": "Gbeleban",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Gbeleban",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Samango",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Seydougou",
                "communes": []
              }
            ]
          },
          {
            "code": "067",
            "nom": "Madinani",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Fengolo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Madinani",
                "communes": []
              },
              {
                "code": "03",
                "nom": "N'Goloblasso",
                "communes": []
              }
            ]
          },
          {
            "code": "034",
            "nom": "Odienne",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bako",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bougousso",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Dioulatiedougou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Odienne",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Tieme",
                "communes": []
              }
            ]
          },
          {
            "code": "088",
            "nom": "Samatiguila",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Kimbirila-Sud",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Samatiguila",
                "communes": []
              }
            ]
          },
          {
            "code": "105",
            "nom": "Seguelon",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Gbongaha",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Seguelon",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "06",
    "district": "Gôh-Djiboua",
    "regions": [
      "Gôh",
      "Lôh-Djiboua"
    ],
    "regionItems": [
      {
        "code": "17",
        "nom": "Gôh",
        "departments": [
          {
            "code": "024",
            "nom": "Gagnoa",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bayota",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Dahiepa-Kehi",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Dignago",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Dougroupalegnoa",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Doukouyo",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Gagnoa",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Galebre",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Gnagbodougnoa",
                "communes": []
              },
              {
                "code": "09",
                "nom": "Guiberoua",
                "communes": []
              },
              {
                "code": "10",
                "nom": "Ouragahio",
                "communes": []
              },
              {
                "code": "11",
                "nom": "Serihio",
                "communes": []
              },
              {
                "code": "12",
                "nom": "Yopohue",
                "communes": []
              }
            ]
          },
          {
            "code": "035",
            "nom": "Oume",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Diegonefla",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Guepahouo",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Oume",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Tonla",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "15",
        "nom": "Lôh-Djiboua",
        "departments": [
          {
            "code": "021",
            "nom": "Divo",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Chiepo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Didoko",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Divo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Hire",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Nebo",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Ogoudou",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Zego",
                "communes": []
              }
            ]
          },
          {
            "code": "079",
            "nom": "Guitry",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dairo-Didizo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Guitry",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Lauzoua",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Yocoboue",
                "communes": []
              }
            ]
          },
          {
            "code": "030",
            "nom": "Lakota",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Djidji",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Gagore",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Goudouko",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Lakota",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Niambezaria",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Zikisso",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "08",
    "district": "Lacs",
    "regions": [
      "Bélier",
      "Iffou",
      "Moronou",
      "N’zi"
    ],
    "regionItems": [
      {
        "code": "21",
        "nom": "Bélier",
        "departments": [
          {
            "code": "061",
            "nom": "Didievi",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Boli",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Didievi",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Molonou Ble",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Raviart",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Tie-N'Diekro",
                "communes": []
              }
            ]
          },
          {
            "code": "098",
            "nom": "Djekanou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bonikro",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Djekanou",
                "communes": []
              }
            ]
          },
          {
            "code": "057",
            "nom": "Tiebissou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Lomokankro",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Molonou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Tiebissou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Yakpabo-Sakassou",
                "communes": []
              }
            ]
          },
          {
            "code": "047",
            "nom": "Toumodi",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Angoda",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kokumbo",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kpouebo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Toumodi",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "29",
        "nom": "Iffou",
        "departments": [
          {
            "code": "019",
            "nom": "Daoukro",
            "subPrefectures": [
              {
                "code": "03",
                "nom": "Daoukro",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Ettrokro",
                "communes": []
              },
              {
                "code": "05",
                "nom": "N'Gattakro",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Samanza",
                "communes": []
              }
            ]
          },
          {
            "code": "033",
            "nom": "M'Bahiakro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bonguera",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kondossou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "M'Bahiakro",
                "communes": []
              }
            ]
          },
          {
            "code": "111",
            "nom": "Ouelle",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Akpassanou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Ananda",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Ouelle",
                "communes": []
              }
            ]
          },
          {
            "code": "064",
            "nom": "Prikro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Anianou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Famienkro",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Koffi-Amonkro",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Nafana",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Prikro",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "33",
        "nom": "Moronou",
        "departments": [
          {
            "code": "071",
            "nom": "Arrah",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Arrah",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kotobi",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kregbe",
                "communes": []
              }
            ]
          },
          {
            "code": "011",
            "nom": "Bongouanou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Ande",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Assie-Koumassi",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Bongouanou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "N'Guessankro",
                "communes": []
              }
            ]
          },
          {
            "code": "084",
            "nom": "M'Batto",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Anoumaba",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Assahara",
                "communes": []
              },
              {
                "code": "03",
                "nom": "M'Batto",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Tiemelekro",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "11",
        "nom": "N’zi",
        "departments": [
          {
            "code": "053",
            "nom": "Bocanda",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bengassou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bocanda",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kouadioblekro",
                "communes": []
              },
              {
                "code": "04",
                "nom": "N'Zecrezessou",
                "communes": []
              }
            ]
          },
          {
            "code": "020",
            "nom": "Dimbokro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Abigui",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Dimbokro",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Djangokro",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Nofou",
                "communes": []
              }
            ]
          },
          {
            "code": "102",
            "nom": "Kouassi-Kouassikro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Kouassi-Kouassikro",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Mekro",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "09",
    "district": "Lagunes",
    "regions": [
      "Agnéby-Tiassa",
      "Grands-Ponts",
      "La Mé"
    ],
    "regionItems": [
      {
        "code": "16",
        "nom": "Agnéby-Tiassa",
        "departments": [
          {
            "code": "005",
            "nom": "Agboville",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Aboude",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Agboville",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Ananguie",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Attobrou",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Azaguie",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Cechi",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Grand-Morie",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Guessiguie",
                "communes": []
              },
              {
                "code": "09",
                "nom": "Loviguie",
                "communes": []
              },
              {
                "code": "10",
                "nom": "Oress-Krobou",
                "communes": []
              },
              {
                "code": "11",
                "nom": "Rubino",
                "communes": []
              }
            ]
          },
          {
            "code": "065",
            "nom": "Sikensi",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Gomon",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Sikensi",
                "communes": []
              }
            ]
          },
          {
            "code": "107",
            "nom": "Taabo",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Pacobo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Taabo",
                "communes": []
              }
            ]
          },
          {
            "code": "045",
            "nom": "Tiassale",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Gbolouville",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Morokro",
                "communes": []
              },
              {
                "code": "03",
                "nom": "N'Douci",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Tiassale",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "26",
        "nom": "Grands-Ponts",
        "departments": [
          {
            "code": "054",
            "nom": "Dabou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dabou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Lopou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Toupah",
                "communes": []
              }
            ]
          },
          {
            "code": "025",
            "nom": "Grand-Lahou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Ahouanou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bacanda",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Ebonou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Grand-Lahou",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Toukouzou",
                "communes": []
              }
            ]
          },
          {
            "code": "056",
            "nom": "Jacqueville",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Attoutou A",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Jacqueville",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "30",
        "nom": "La Mé",
        "departments": [
          {
            "code": "004",
            "nom": "Adzope",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Adzope",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Agou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Annepe",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Assikoi",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Becedi-Brignan",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Yakasse-Me",
                "communes": []
              }
            ]
          },
          {
            "code": "060",
            "nom": "Akoupe",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Affery",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Akoupe",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Becouefin",
                "communes": []
              }
            ]
          },
          {
            "code": "052",
            "nom": "Alepe",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Aboisso-Comoe",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Alepe",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Allosso",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Danguira",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Oghlwapo",
                "communes": []
              }
            ]
          },
          {
            "code": "094",
            "nom": "Yakasse-Attobrou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Abongoua",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bieby",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Yakasse-Attobrou",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "10",
    "district": "Montagnes",
    "regions": [
      "Cavally",
      "Guémon",
      "Tonkpi"
    ],
    "regionItems": [
      {
        "code": "18",
        "nom": "Cavally",
        "departments": [
          {
            "code": "059",
            "nom": "Blolequin",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Blolequin",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Diboke",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Doke",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Tinhou",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Zeaglo",
                "communes": []
              }
            ]
          },
          {
            "code": "026",
            "nom": "Guiglo",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bedy-Goazon",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Guiglo",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kaade",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Nizahon",
                "communes": []
              }
            ]
          },
          {
            "code": "108",
            "nom": "Tai",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Tai",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Zagne",
                "communes": []
              }
            ]
          },
          {
            "code": "058",
            "nom": "Toulepleu",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bakoubly",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Meo",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Nezobly",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Pehe",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Tiobly",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Toulepleu",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "27",
        "nom": "Guémon",
        "departments": [
          {
            "code": "007",
            "nom": "Bangolo",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bangolo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Beoue-Zibiao",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Blenimeouin",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Dieouzon",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Gohouo-Zagna",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Guinglo-Tahouake",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Kahin-Zarabaon",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Zeo",
                "communes": []
              },
              {
                "code": "09",
                "nom": "Zou",
                "communes": []
              }
            ]
          },
          {
            "code": "022",
            "nom": "Duekoue",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bagohouo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Duekoue",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Gbapleu",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Guehiebly",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Guezon",
                "communes": []
              }
            ]
          },
          {
            "code": "099",
            "nom": "Facobly",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Facobly",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Guezon",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Koua",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Semien",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Tieny-Siably",
                "communes": []
              }
            ]
          },
          {
            "code": "062",
            "nom": "Kouibly",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Kouibly",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Nidrou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Ouyably-Gnondrou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Totrodrou",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "06",
        "nom": "Tonkpi",
        "departments": [
          {
            "code": "009",
            "nom": "Biankouma",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Biankouma",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Blapleu",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Gbangbegouine",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Gbonne",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Gouine",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Kpata",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Santa",
                "communes": []
              }
            ]
          },
          {
            "code": "018",
            "nom": "Danane",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Daleu",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Danane",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Gbon-Houye",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Kouan-Houle",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Mahapleu",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Seileu",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Zonneu",
                "communes": []
              }
            ]
          },
          {
            "code": "031",
            "nom": "Man",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bogouine",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Fagnampleu",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Gbangbegouine-Yati",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Logouale",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Man",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Podiagouine",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Sandougou-Soba",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Sangouine",
                "communes": []
              },
              {
                "code": "09",
                "nom": "Yapleu",
                "communes": []
              },
              {
                "code": "10",
                "nom": "Zagoue",
                "communes": []
              },
              {
                "code": "11",
                "nom": "Ziogouine",
                "communes": []
              }
            ]
          },
          {
            "code": "106",
            "nom": "Sipilou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Sipilou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Yorodougou",
                "communes": []
              }
            ]
          },
          {
            "code": "066",
            "nom": "Zouan-Hounien",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Banneu",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bin-Houye",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Goulaleu",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Teapleu",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Yelleu",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Zouan-Hounien",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "07",
    "district": "Sassandra-Marahoué",
    "regions": [
      "Haut-Sassandra",
      "Marahoué"
    ],
    "regionItems": [
      {
        "code": "02",
        "nom": "Haut-Sassandra",
        "departments": [
          {
            "code": "017",
            "nom": "Daloa",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bediala",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Daloa",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Gadouan",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Gboguhe",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Gonate",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Zaibo",
                "communes": []
              }
            ]
          },
          {
            "code": "027",
            "nom": "Issia",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Boguedia",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Iboguhe",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Issia",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Nahio",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Namane",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Saioua",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Tapeguia",
                "communes": []
              }
            ]
          },
          {
            "code": "048",
            "nom": "Vavoua",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bazra-Nattis",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Dananon",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Dania",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Ketro Bassam",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Seitifla",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Vavoua",
                "communes": []
              }
            ]
          },
          {
            "code": "095",
            "nom": "Zoukougbeu",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Domangbeu",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Gregbeu",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Guessabo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Zoukougbeu",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "12",
        "nom": "Marahoué",
        "departments": [
          {
            "code": "109",
            "nom": "Bonon",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bonon",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Zaguieta",
                "communes": []
              }
            ]
          },
          {
            "code": "012",
            "nom": "Bouafle",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Begbessou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Bouafle",
                "communes": []
              },
              {
                "code": "04",
                "nom": "N'Douffoukankro",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Pakouabo",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Tibeita",
                "communes": []
              }
            ]
          },
          {
            "code": "110",
            "nom": "Gohitafla",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Gohitafla",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Iriefla",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Maminigui",
                "communes": []
              }
            ]
          },
          {
            "code": "040",
            "nom": "Sinfra",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bazre",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kononfla",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kouetinfla",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Sinfra",
                "communes": []
              }
            ]
          },
          {
            "code": "050",
            "nom": "Zuenoula",
            "subPrefectures": [
              {
                "code": "03",
                "nom": "Kanzra",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Voueboufla",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Zanzra",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Zuenoula",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "11",
    "district": "Savanes",
    "regions": [
      "Bagoué",
      "Poro",
      "Tchologo"
    ],
    "regionItems": [
      {
        "code": "20",
        "nom": "Bagoué",
        "departments": [
          {
            "code": "015",
            "nom": "Boundiali",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Baya",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Boundiali",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Ganaoni",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Kassere",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Siempurgo",
                "communes": []
              }
            ]
          },
          {
            "code": "083",
            "nom": "Kouto",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Blessegue",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Gbon",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kolia",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Kouto",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Sianhala",
                "communes": []
              }
            ]
          },
          {
            "code": "044",
            "nom": "Tengrela",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Debete",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kanakono",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Papara",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Tengrela",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "03",
        "nom": "Poro",
        "departments": [
          {
            "code": "075",
            "nom": "Dikodougou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Boron",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Dikodougou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Guiembe",
                "communes": []
              }
            ]
          },
          {
            "code": "029",
            "nom": "Korhogo",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dassoungboho",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kanoroba",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Karakoro",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Kiemou",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Kombolokoura",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Komborodougou",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Koni",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Korhogo",
                "communes": []
              },
              {
                "code": "09",
                "nom": "Lataha",
                "communes": []
              },
              {
                "code": "12",
                "nom": "N'Ganon",
                "communes": []
              },
              {
                "code": "10",
                "nom": "Nafoun",
                "communes": []
              },
              {
                "code": "11",
                "nom": "Napie",
                "communes": []
              },
              {
                "code": "13",
                "nom": "Niofoin",
                "communes": []
              },
              {
                "code": "14",
                "nom": "Sirasso",
                "communes": []
              },
              {
                "code": "15",
                "nom": "Sohouo",
                "communes": []
              },
              {
                "code": "16",
                "nom": "Tioroniaradougou",
                "communes": []
              }
            ]
          },
          {
            "code": "103",
            "nom": "M'Bengue",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bougou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Katiali",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Katogo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "M'Bengue",
                "communes": []
              }
            ]
          },
          {
            "code": "090",
            "nom": "Sinematiali",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bahouakaha",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kagbolodougou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Sediogo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Sinematiali",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "32",
        "nom": "Tchologo",
        "departments": [
          {
            "code": "023",
            "nom": "Ferkessedougou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Ferkessedougou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Koumbala",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Togoniere",
                "communes": []
              }
            ]
          },
          {
            "code": "101",
            "nom": "Kong",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bilimono",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kong",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Nafana",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Sikolo",
                "communes": []
              }
            ]
          },
          {
            "code": "086",
            "nom": "Ouangolodougou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Diawala",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kaouara",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Nielle",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Ouangolodougou",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Toumoukoro",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "12",
    "district": "Vallée du Bandama",
    "regions": [
      "Gbêkê",
      "Hambol"
    ],
    "regionItems": [
      {
        "code": "04",
        "nom": "Gbêkê",
        "departments": [
          {
            "code": "008",
            "nom": "Beoumi",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Ando-Kekrenou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Beoumi",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Bodokro",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Kondrobo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Lolobo",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Marabadjassa",
                "communes": []
              },
              {
                "code": "06",
                "nom": "N'Guessankro",
                "communes": []
              }
            ]
          },
          {
            "code": "074",
            "nom": "Botro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Botro",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Diabo",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Krofoinsou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Languibonou",
                "communes": []
              }
            ]
          },
          {
            "code": "013",
            "nom": "Bouake",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bouake",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bounda",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Brobo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Djebonoua",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Mamini",
                "communes": []
              }
            ]
          },
          {
            "code": "036",
            "nom": "Sakassou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Ayaou-Sokpa",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Dibri-Asrikro",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Sakassou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Toumodi-Sakassou",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "28",
        "nom": "Hambol",
        "departments": [
          {
            "code": "016",
            "nom": "Dabakala",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bassawa",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bonieredougou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Dabakala",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Foumbolo",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Niemene",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Satama-Sokoro",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Satama-Sokoura",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Sokala-Sobara",
                "communes": []
              },
              {
                "code": "09",
                "nom": "Tiendene-Bambarasso",
                "communes": []
              },
              {
                "code": "10",
                "nom": "Yaossedougou",
                "communes": []
              }
            ]
          },
          {
            "code": "028",
            "nom": "Katiola",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Fronan",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Katiola",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Timbe",
                "communes": []
              }
            ]
          },
          {
            "code": "085",
            "nom": "Niakaramadougou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Arikokaha",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Badikaha",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Niakaramadougou",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Niedekaha",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Tafire",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Tortiya",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "13",
    "district": "Woroba",
    "regions": [
      "Bafing",
      "Béré",
      "Worodougou"
    ],
    "regionItems": [
      {
        "code": "19",
        "nom": "Bafing",
        "departments": [
          {
            "code": "082",
            "nom": "Koro",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Booko",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Borotou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Koro",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Mahandougou",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Niokosso",
                "communes": []
              }
            ]
          },
          {
            "code": "087",
            "nom": "Ouaninou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Gbelo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Gouekan",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Koonan",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Ouaninou",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Saboudougou",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Santa",
                "communes": []
              }
            ]
          },
          {
            "code": "046",
            "nom": "Touba",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dioman",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Foungbesso",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Guinteguela",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Touba",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "22",
        "nom": "Béré",
        "departments": [
          {
            "code": "097",
            "nom": "Dianra",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Dianra",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Dianra Village",
                "communes": []
              }
            ]
          },
          {
            "code": "069",
            "nom": "Kounahiri",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Kongasso",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kounahiri",
                "communes": []
              }
            ]
          },
          {
            "code": "032",
            "nom": "Mankono",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bouandougou",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Mankono",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Marhandallah",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Sarhala",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Tieningboue",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "14",
        "nom": "Worodougou",
        "departments": [
          {
            "code": "080",
            "nom": "Kani",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Djibrosso",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Fadiadougou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kani",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Morondo",
                "communes": []
              }
            ]
          },
          {
            "code": "039",
            "nom": "Seguela",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bobi",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Diarabana",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Dualla",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Kamalo",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Massala",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Seguela",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Sifie",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Worofla",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "code": "14",
    "district": "Zanzan",
    "regions": [
      "Bounkani",
      "Gontougo"
    ],
    "regionItems": [
      {
        "code": "23",
        "nom": "Bounkani",
        "departments": [
          {
            "code": "014",
            "nom": "Bouna",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bouko",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Bouna",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Ondefidouo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Youndouo",
                "communes": []
              }
            ]
          },
          {
            "code": "076",
            "nom": "Doropo",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Danoa",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Doropo",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kalamon",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Niamoue",
                "communes": []
              }
            ]
          },
          {
            "code": "063",
            "nom": "Nassian",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bogofa",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kakpin",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kotouba",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Nassian",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Sominasse",
                "communes": []
              }
            ]
          },
          {
            "code": "091",
            "nom": "Tehini",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Gogo",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Tehini",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Tougbo",
                "communes": []
              }
            ]
          }
        ]
      },
      {
        "code": "08",
        "nom": "Gontougo",
        "departments": [
          {
            "code": "010",
            "nom": "Bondoukou",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Appimandoum",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Bondo",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Bondoukou",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Goumere",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Laoudi Ba",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Pinda-Boroko",
                "communes": []
              },
              {
                "code": "07",
                "nom": "Sapli-Sepingo",
                "communes": []
              },
              {
                "code": "08",
                "nom": "Sorobango",
                "communes": []
              },
              {
                "code": "09",
                "nom": "Tabagne",
                "communes": []
              },
              {
                "code": "10",
                "nom": "Tagadi",
                "communes": []
              },
              {
                "code": "11",
                "nom": "Taoudi",
                "communes": []
              },
              {
                "code": "12",
                "nom": "Yezimala",
                "communes": []
              }
            ]
          },
          {
            "code": "070",
            "nom": "Koun-Fao",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Boahia",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kokomian",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Kouassi-Datekro",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Koun-Fao",
                "communes": []
              },
              {
                "code": "05",
                "nom": "Tankesse",
                "communes": []
              },
              {
                "code": "06",
                "nom": "Tienkoikro",
                "communes": []
              }
            ]
          },
          {
            "code": "089",
            "nom": "Sandegue",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Bandakagni-Tomora",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Dimandougou",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Sandegue",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Yorobodi",
                "communes": []
              }
            ]
          },
          {
            "code": "043",
            "nom": "Tanda",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Amanvi",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Diamba",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Tanda",
                "communes": []
              },
              {
                "code": "04",
                "nom": "Tiedio",
                "communes": []
              }
            ]
          },
          {
            "code": "093",
            "nom": "Transua",
            "subPrefectures": [
              {
                "code": "01",
                "nom": "Assuefry",
                "communes": []
              },
              {
                "code": "02",
                "nom": "Kouassia-Niaguini",
                "communes": []
              },
              {
                "code": "03",
                "nom": "Transua",
                "communes": []
              }
            ]
          }
        ]
      }
    ]
  }
];

export const allRgphRegions = rgphDistricts.flatMap((item) => item.regions).sort((left, right) => left.localeCompare(right, "fr"));
