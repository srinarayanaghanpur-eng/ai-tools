/**
 * ESM-safe dynamic import that works in every runtime we use:
 * - vitest (vite-node) and tsx: plain `import()` is transformed/handled natively.
 * - compiled dist (CommonJS): TS downlevels `import()` to `require()`, which
 *   throws ERR_REQUIRE_ESM for ESM-only packages (file-type, pdfjs-dist).
 *   In that case we retry via eval, which the compiler leaves untouched, so
 *   Node executes a true dynamic import.
 */
export async function dynamicImport(specifier: string): Promise<any> {
  try {
    return await import(specifier);
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (e?.code === 'ERR_REQUIRE_ESM' || /require\(\) cannot be used/i.test(msg)) {
      // eslint-disable-next-line no-eval
      return await eval('import(specifier)');
    }
    throw e;
  }
}
