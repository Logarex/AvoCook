export type RootStackParamList = {
  Onboarding: undefined;
  Tour: undefined;
  Update: undefined;
  Login:
    | {
        showNextcloud?: boolean;
      }
    | undefined;
  Recipes:
    | {
        tabTransition?: "slide_from_left" | "slide_from_right";
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
        tabTransition?: "slide_from_left" | "slide_from_right";
      }
    | undefined;
  Community: 
    | {
        tabTransition?: "slide_from_left" | "slide_from_right";
      }
    | undefined;
  CommunityDetail: {
    id: string;
  };
  SubmitCommunityRecipe: undefined;
  Settings: undefined;
  Privacy: undefined;
};
