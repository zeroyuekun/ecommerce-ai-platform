// Empty stub for the `server-only` marker package, used only under
// vitest. The real package throws on import in non-react-server runtimes,
// which would block any unit test that exercises a module annotated with
// `import "server-only"`. See vitest.config.ts for the alias wiring.
export {};
