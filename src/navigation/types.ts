export type RootStackParamList = {
  Login: undefined;
  Recipes: undefined;
  RecipeDetail: {
    id: string;
  };
  RecipeEditor: {
    id?: string;
    category?: string;
  };
  ImportRecipe: undefined;
  Settings: undefined;
  Privacy: undefined;
};
