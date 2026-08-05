export type RootStackParamList = {
  Onboarding: undefined;
  Tour: undefined;
  Update: undefined;
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
  ImportRecipe:
    | {
        url?: string;
        fileUri?: string;
      }
    | undefined;
  ShoppingList:
    | {
        tabTransition?: "fromRecipes";
      }
    | undefined;
  Settings: undefined;
  Privacy: undefined;
};
