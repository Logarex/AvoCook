export type RootStackParamList = {
  Login: undefined;
  Recipes:
    | {
        tabTransition?: "fromShopping";
      }
    | undefined;
  RecipeDetail: {
    id: string;
  };
  RecipeEditor: {
    id?: string;
    category?: string;
  };
  ImportRecipe: undefined;
  ShoppingList:
    | {
        tabTransition?: "fromRecipes";
      }
    | undefined;
  Settings: undefined;
  Privacy: undefined;
};
