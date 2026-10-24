import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Recipe } from "../features/recipes/types";
import { AppText } from "./AppText";
import { PrimaryButton } from "./PrimaryButton";

export function KitchenRecipeList({
  recipes,
  children,
}: {
  recipes: Recipe[];
  children: (recipe: Recipe) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState(12);
  return (
    <>
      <AppText muted variant="caption">
        {t("kitchen.resultCount", {
          shown: Math.min(limit, recipes.length),
          total: recipes.length,
        })}
      </AppText>
      {recipes.slice(0, limit).map(children)}
      {limit < recipes.length && (
        <PrimaryButton
          compact
          variant="secondary"
          label={t("kitchen.showMore")}
          onPress={() => setLimit((current) => current + 12)}
        />
      )}
    </>
  );
}
