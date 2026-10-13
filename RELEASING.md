# Versioning and releasing

The package name is `q-schema-form`; the current source version is `0.1.1` (the initial version was `0.1.0`). Pushing code or a Git tag to GitHub does not publish a package to the npm registry. The GitHub install command in the README works independently of npm publication.

## First npm publication

1. Confirm your npm account and recheck that `q-schema-form` is available. Name availability can change. If a different name is needed, update package metadata, examples, imports, and docs together before tagging that version.
2. Review the MIT license and the current version's changelog.
3. From a clean checkout of the version you intend to publish, run:

   ```sh
   pnpm install --frozen-lockfile
   pnpm check
   npm pack --dry-run
   npm pack
   ```

4. Install the generated `.tgz` into a separate Vue + Quasar app and test the integrations you intend to use. The consumer fixtures in `tests/consumer` can also check installed imports and SSR.
5. When you are ready to publish, sign in to your own npm account and publish explicitly:

   ```sh
   npm login
   npm whoami
   npm publish --access public
   ```

6. Verify `npm view q-schema-form version`, try a registry install in a separate app, and update the README's npm status and installation section in a follow-up commit.

No CI workflow publishes automatically, and no npm token is stored in this repository.

## Later versions

- Use patch versions such as `0.1.1` for compatible fixes.
- Use minor versions such as `0.2.0` for new features or breaking API changes while the library is below `1.0.0`; describe breaking changes clearly in the changelog.
- After `1.0.0`, use major versions for breaking API changes.

Update and commit the changelog and documentation first. Then:

```sh
npm version patch
pnpm check
npm pack --dry-run
git push origin main --follow-tags
```

Use `npm version minor` or `npm version major` when appropriate. The version hook updates the exported `version` in `src/index.ts`; npm commits the version change and creates an annotated `vX.Y.Z` tag. Update the README version badge/text for the new release as part of preparing its documentation. The package check rejects a mismatch between the built runtime version and `package.json`.

Only publish after the checks and installed-consumer test pass. To publish an already verified tarball without rebuilding it, use `npm publish ./q-schema-form-X.Y.Z.tgz --access public`. npm versions are immutable once published: use a new version for subsequent changes.
