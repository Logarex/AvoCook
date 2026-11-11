"""Writes seed-<lang>.json (demo kitchen backup) for the screenshot build."""
import base64
import json
import sys
from pathlib import Path

from content import RECIPES, T

HERE = Path(__file__).parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / ".out"
OUT.mkdir(parents=True, exist_ok=True)


def duration(minutes):
    return f"PT{minutes // 60}H{minutes % 60}M0S"


for lang, text in T.items():
    entries, assets, keys = [], {}, {}
    for index, (key, photo, prep, cook, servings) in enumerate(RECIPES):
        name, category, description, ingredients, steps = text["recipes"][key]
        keys[key] = name
        asset = f"asset-{key}"
        assets[asset] = {
            "id": asset,
            "data": base64.b64encode((HERE / "photos" / photo).read_bytes()).decode(),
            "extension": "jpg",
            "mimeType": "image/jpeg",
        }
        entries.append({
            "imageAssetId": asset,
            "recipe": {
                "id": f"demo-{key}",
                "name": name,
                "description": description,
                "sourceName": "",
                "url": "",
                "image": "",
                "imageUrl": "",
                "imagePlaceholderUrl": "",
                "keywords": "",
                "dateCreated": f"2026-10-{20 - index:02d}T18:00:00.000Z",
                "dateModified": f"2026-10-{20 - index:02d}T18:00:00.000Z",
                "prepTime": duration(prep),
                "cookTime": duration(cook) if cook else None,
                "totalTime": duration(prep + cook),
                "recipeYield": servings,
                "recipeCategory": text["categories"][category],
                "tool": [],
                "recipeIngredient": ingredients,
                "recipeInstructions": steps,
                "nutrition": None,
            },
        })
    rid = lambda key: f"demo-{key}"
    simple_title, simple_ingredients = text["simple"]
    meals = [
        {"id": "m1", "day": 0, "slot": "lunch", "recipeId": rid("salmon"), "servings": 2},
        {"id": "m2", "day": 0, "slot": "dinner", "recipeId": rid("pumpkin_soup"), "servings": 4},
        {"id": "m3", "day": 1, "slot": "lunch", "kind": "leftovers", "recipeId": "", "linkedRecipeId": rid("pumpkin_soup"), "title": text["leftovers"], "servings": 2},
        {"id": "m4", "day": 1, "slot": "dinner", "recipeId": rid("shakshuka"), "servings": 2},
        {"id": "m5", "day": 2, "slot": "lunch", "kind": "simple", "recipeId": "", "title": simple_title, "ingredients": simple_ingredients, "servings": 2},
        {"id": "m6", "day": 2, "slot": "dinner", "recipeId": rid("risotto"), "servings": 4},
        {"id": "m7", "day": 3, "slot": "dinner", "recipeId": rid("ratatouille"), "servings": 4},
        {"id": "m8", "day": 4, "slot": "dinner", "recipeId": rid("pasta"), "servings": 2},
        {"id": "m9", "day": 5, "slot": "lunch", "recipeId": rid("pancakes"), "servings": 4},
        {"id": "m10", "day": -1, "slot": "dinner", "recipeId": rid("pasta"), "servings": 2},
    ]
    stock = [
        {"id": f"s{i}", "name": n, "quantity": q, "location": loc, **({"expiresIn": e} if e is not None else {})}
        for i, (n, q, loc, e) in enumerate(text["stock"])
    ]
    journals = {
        rid("pumpkin_soup"): {"rating": 5, "notes": "", "changes": "", "difficulty": "easy", "cost": "", "cooked": ["2026-10-12", "2026-11-02"], "diets": ["vegetarian"]},
        rid("ratatouille"): {"rating": 5, "notes": "", "changes": "", "difficulty": "easy", "cost": "", "cooked": ["2026-09-20"], "diets": ["vegan", "glutenFree"]},
        rid("chocolate_cake"): {"rating": 4, "notes": "", "changes": "", "difficulty": "medium", "cost": "", "cooked": ["2026-10-30"], "diets": ["vegetarian"]},
    }
    kitchen = {
        "version": 1,
        "country": {"fr": "FR", "de": "DE", "es": "ES", "it": "IT", "da": "DK", "en": "GB"}[lang],
        "meals": meals,
        "stock": stock,
        "journals": journals,
        "menus": [{"id": "menu1", "title": text["menu"], "recipeIds": [rid("pumpkin_soup"), rid("risotto"), rid("tiramisu")]}],
    }
    shopping = [{"label": label, "checked": checked} for label, checked in text["shopping"]]
    backup = {
        "app": "AvoCook",
        "schemaVersion": 1,
        "createdAt": "2026-11-01T12:00:00.000Z",
        "source": "local",
        "recipes": entries,
        "customCategories": list(text["categories"].values()),
        "favoriteCategories": list(text["categories"].values()),
        "assets": assets,
        "kitchen": kitchen,
    }
    seed = {"backup": backup, "keys": keys, "kitchen": kitchen, "shopping": shopping}
    (OUT / f"seed-{lang}.json").write_text(json.dumps(seed, ensure_ascii=False))
    print(f"seed-{lang}.json")
