# Contributing

Thanks for taking the time to contribute to AvoCook.

This is a solo project, but pull requests, bug reports, and suggestions are genuinely welcome.

---

## Before opening a PR

- Check that there isn't already an open issue or PR covering the same thing.
- For any significant change, open an issue first to discuss it. This avoids wasted effort if the direction doesn't fit the project.
- Keep changes focused. One PR = one thing.

## Development setup

See the [README](../README.md) for the full setup instructions.

```bash
npm install
npm run ios      # iOS simulator
npm run android  # Android emulator
```

## Checks to run before submitting

```bash
npm run typecheck
npm test
npm run lint
```

All three must pass. The CI will fail otherwise.

## Code style

- TypeScript everywhere — no implicit `any`.
- Components in `src/components`, screens in `src/screens`, business logic in `src/features`.
- If you add a user-visible string, add translations for all 5 languages (`src/i18n/locales/`).
- If you add a network or storage feature, update `PRIVACY.md` and all its translations (`docs/*/PRIVACY.md`).

## Opening a PR

Use the pull request template (`.github/PULL_REQUEST_TEMPLATE.md`). Fill in all sections — even briefly.

## Reporting a bug

Open a [GitHub issue](https://github.com/Logarex/AvoCook/issues) with:
- the app version (visible in Settings);
- the platform (iOS / Android) and OS version;
- steps to reproduce;
- what you expected vs. what happened.

## Contact

For anything else: [avocook@nephoos.com](mailto:avocook@nephoos.com)
