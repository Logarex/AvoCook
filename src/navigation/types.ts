import type { Recipe } from "../features/recipes/types";

export type SettingsSection =
  | "appearance"
  | "account"
  | "shopping"
  | "backup"
  | "advanced"
  | "assistant"
  | "maintenance"
  | "about";

export type KitchenSection =
  | "today"
  | "planner"
  | "stock"
  | "tonight"
  | "batch"
  | "history"
  | "converter"
  | "seasonal"
  | "substitutions"
  | "book"
  | "profiles"
  | "menus"
  | "backup";

export type RootStackParamList = {
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
  Kitchen:
    | {
        section?: KitchenSection;
        recipeId?: string;
        tabTransition?: "slide_from_left" | "slide_from_right";
      }
    | undefined;
  Cooking: { id: string };
  RecipeJournal: { id: string };
  FridgeRecipe: { ingredients?: string } | undefined;
  RecipeDetail: {
    id: string;
  };
  RecipeEditor: {
    id?: string;
    category?: string;
    draft?: Recipe;
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
  Settings: { section?: SettingsSection } | undefined;
  Privacy: undefined;
};
