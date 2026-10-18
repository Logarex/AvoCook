import { normalizeFood, parseIngredient } from "./kitchen";
import type { Recipe } from "../recipes/types";

// Small curated selection, mainland France only. Do not extrapolate to other countries.
// Santé publique France, Manger Bouger, seasonal calendar, page 13. Reviewed 2026-10-18.
export const SEASONAL_SOURCE =
  "https://www.mangerbouger.fr/content/show/2132/file/DT05-414-24B%20148-5fx210_GUIDE_40P_MANGER_BOUGER_4-11_ANS_bd_v2.pdf";
export const seasonalFoods = [
  {
    id: "apple",
    months: [1, 2, 3, 4, 8, 9, 10, 11, 12],
    names: [
      "pomme",
      "pommes",
      "apple",
      "apples",
      "Apfel",
      "Äpfel",
      "manzana",
      "manzanas",
      "mela",
      "mele",
      "æble",
      "æbler",
    ],
  },
  {
    id: "pear",
    months: [1, 2, 3, 8, 9, 10, 11, 12],
    names: [
      "poire",
      "poires",
      "pear",
      "pears",
      "Birne",
      "Birnen",
      "pera",
      "peras",
      "pere",
      "pære",
      "pærer",
    ],
  },
  {
    id: "leek",
    months: [1, 2, 3, 4, 9, 10, 11, 12],
    names: [
      "poireau",
      "poireaux",
      "leek",
      "leeks",
      "Lauch",
      "Porree",
      "puerro",
      "puerros",
      "porro",
      "porri",
      "porre",
      "porrer",
    ],
  },
  {
    id: "courgette",
    months: [5, 6, 7, 8, 9, 10],
    names: [
      "courgette",
      "courgettes",
      "zucchini",
      "zucchinis",
      "calabacín",
      "calabacines",
      "zucchina",
      "zucchine",
      "squash",
    ],
  },
  {
    id: "tomato",
    months: [6, 7, 8, 9],
    names: [
      "tomate",
      "tomates",
      "tomato",
      "tomatoes",
      "Tomaten",
      "pomodoro",
      "pomodori",
      "tomat",
      "tomater",
    ],
  },
  {
    id: "asparagus",
    months: [4, 5, 6],
    names: [
      "asperge",
      "asperges",
      "asparagus",
      "Spargel",
      "espárrago",
      "espárragos",
      "asparago",
      "asparagi",
      "asparges",
    ],
  },
  {
    id: "strawberry",
    months: [5, 6, 7],
    names: [
      "fraise",
      "fraises",
      "strawberry",
      "strawberries",
      "Erdbeere",
      "Erdbeeren",
      "fresa",
      "fresas",
      "fragola",
      "fragole",
      "jordbær",
    ],
  },
  {
    id: "aubergine",
    months: [6, 7, 8, 9],
    names: [
      "aubergine",
      "aubergines",
      "eggplant",
      "eggplants",
      "berenjena",
      "berenjenas",
      "melanzana",
      "melanzane",
    ],
  },
  {
    id: "beetroot",
    months: [1, 2, 3, 10, 11, 12],
    names: [
      "Betterave",
      "Beetroot",
      "Rote Bete",
      "Remolacha",
      "Barbabietola",
      "Rødbede",
    ],
  },
  {
    id: "carrot",
    months: [1, 2, 3, 9, 10, 11, 12],
    names: ["Carotte", "Carrot", "Karotte", "Zanahoria", "Carota", "Gulerod"],
  },
  {
    id: "celery",
    months: [1, 2, 3, 10, 11, 12],
    names: ["Céleri", "Celery", "Sellerie", "Apio", "Sedano", "Selleri"],
  },
  {
    id: "cauliflower",
    months: [1, 2, 3, 9, 10, 11, 12],
    names: [
      "Chou-fleur",
      "Cauliflower",
      "Blumenkohl",
      "Coliflor",
      "Cavolfiore",
      "Blomkål",
    ],
  },
  {
    id: "cabbage",
    months: [1, 2, 3, 10, 11, 12],
    names: ["Chou", "Cabbage", "Kohl", "Col", "Cavolo", "Kål"],
  },
  {
    id: "onion",
    months: [1, 2, 3, 4, 9, 10, 11, 12],
    names: ["Oignon", "Onion", "Zwiebel", "Cebolla", "Cipolla", "Løg"],
  },
  {
    id: "turnip",
    months: [1, 2, 3, 4, 5, 10, 11, 12],
    names: ["Navet", "Turnip", "Speiserübe", "Nabo", "Rapa", "Majroe"],
  },
  {
    id: "spinach",
    months: [1, 2, 3, 4, 5, 9, 10, 11, 12],
    names: ["Épinard", "Spinach", "Spinat", "Espinaca", "Spinacio", "Spinat"],
  },
  {
    id: "fennel",
    months: [4, 6, 7, 8, 9, 10, 11],
    names: ["Fenouil", "Fennel", "Fenchel", "Hinojo", "Finocchio", "Fennikel"],
  },
  {
    id: "cucumber",
    months: [5, 6, 7, 8, 9, 10],
    names: ["Concombre", "Cucumber", "Gurke", "Pepino", "Cetriolo", "Agurk"],
  },
  {
    id: "pepper",
    months: [6, 7, 8, 9],
    names: [
      "Poivron",
      "Bell pepper",
      "Paprika",
      "Pimiento",
      "Peperone",
      "Peberfrugt",
    ],
  },
  {
    id: "peas",
    months: [5, 6, 7],
    names: ["Petit pois", "Pea", "Erbse", "Guisante", "Pisello", "Ært"],
  },
  {
    id: "greenBeans",
    months: [6, 7, 8, 9, 10],
    names: [
      "Haricot vert",
      "Green bean",
      "Grüne Bohne",
      "Judía verde",
      "Fagiolino",
      "Grøn bønne",
    ],
  },
  {
    id: "apricot",
    months: [6, 7, 9],
    names: [
      "Abricot",
      "Apricot",
      "Aprikose",
      "Albaricoque",
      "Albicocca",
      "Abrikos",
    ],
  },
  {
    id: "cherry",
    months: [6, 7],
    names: ["Cerise", "Cherry", "Kirsche", "Cereza", "Ciliegia", "Kirsebær"],
  },
  {
    id: "peach",
    months: [6, 7, 8, 9],
    names: ["Pêche", "Peach", "Pfirsich", "Melocotón", "Pesca", "Fersken"],
  },
  {
    id: "melon",
    months: [6, 7, 8, 9],
    names: ["Melon", "Melon", "Melone", "Melón", "Melone", "Melon"],
  },
  {
    id: "grape",
    months: [9, 10],
    names: ["Raisin", "Grape", "Weintraube", "Uva", "Uva", "Vindrue"],
  },
  {
    id: "plum",
    months: [7, 8, 9],
    names: ["Prune", "Plum", "Pflaume", "Ciruela", "Prugna", "Blomme"],
  },
  {
    id: "fig",
    months: [7, 8, 9, 10],
    names: ["Figue", "Fig", "Feige", "Higo", "Fico", "Figen"],
  },
  {
    id: "kiwi",
    months: [1, 2, 3, 11, 12],
    names: ["Kiwi", "Kiwi", "Kiwi", "Kiwi", "Kiwi", "Kiwi"],
  },
  {
    id: "orange",
    months: [1, 2, 3],
    names: ["Orange", "Orange", "Orange", "Naranja", "Arancia", "Appelsin"],
  },
  {
    id: "clementine",
    months: [1, 2, 11, 12],
    names: [
      "Clémentine",
      "Clementine",
      "Clementine",
      "Clementina",
      "Clementina",
      "Klementin",
    ],
  },
  {
    id: "squash",
    months: [1, 9, 10, 11, 12],
    names: [
      "Courge",
      "Winter squash",
      "Kürbis",
      "Calabaza",
      "Zucca",
      "Græskar",
    ],
  },
  {
    id: "garlic",
    months: [7, 8, 9, 10, 11, 12],
    names: ["Ail", "Garlic", "Knoblauch", "Ajo", "Aglio", "Hvidløg"],
  },
  {
    id: "radish",
    months: [3, 4, 5, 6],
    names: ["Radis", "Radish", "Radieschen", "Rábano", "Ravanello", "Radise"],
  },
  {
    id: "artichoke",
    months: [5, 6, 7, 8, 9],
    names: [
      "Artichaut",
      "Artichoke",
      "Artischocke",
      "Alcachofa",
      "Carciofo",
      "Artiskok",
    ],
  },
  {
    id: "rhubarb",
    months: [4, 5, 6],
    names: [
      "Rhubarbe",
      "Rhubarb",
      "Rhabarber",
      "Ruibarbo",
      "Rabarbaro",
      "Rabarber",
    ],
  },
  {
    id: "broccoli",
    months: [9, 10, 11],
    names: [
      "Brocoli",
      "Broccoli",
      "Brokkoli",
      "Brócoli",
      "Broccolo",
      "Broccoli",
    ],
  },
  {
    id: "chard",
    months: [6, 7, 8, 9, 10, 11, 12],
    names: ["Blette", "Chard", "Mangold", "Acelga", "Bietola", "Bladbede"],
  },
  {
    id: "lettuce",
    months: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    names: ["Salade", "Lettuce", "Blattsalat", "Lechuga", "Lattuga", "Salat"],
  },
  {
    id: "parsnip",
    months: [1, 2, 3, 10, 11, 12],
    names: [
      "Panais",
      "Parsnip",
      "Pastinake",
      "Chirivía",
      "Pastinaca",
      "Pastinak",
    ],
  },
] as const;
export function foodsInSeason(country: string | undefined, month: number) {
  return country === "FR" &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
    ? seasonalFoods.filter((food) =>
        (food.months as readonly number[]).includes(month),
      )
    : [];
}
export function seasonalRecipes(
  recipes: Recipe[],
  country: string | undefined,
  month: number,
) {
  const foods = foodsInSeason(country, month);
  return recipes
    .map((recipe) => ({
      recipe,
      foods: foods.filter((food) =>
        recipe.recipeIngredient.some((line) => {
          const ingredient = parseIngredient(line).key;
          return food.names.some(
            (name) =>
              parseIngredient(name).key === ingredient ||
              normalizeFood(name) === ingredient,
          );
        }),
      ),
    }))
    .filter((result) => result.foods.length)
    .sort(
      (a, b) =>
        b.foods.length - a.foods.length ||
        a.recipe.name.localeCompare(b.recipe.name),
    );
}
