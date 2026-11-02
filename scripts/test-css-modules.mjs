import { registerHooks } from "node:module";

// Node's interaction tests do not render styles. Vite handles real CSS Modules
// in development and production; expose stable class names for these DOM tests.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".module.css")) {
      return {
        format: "module",
        source: "export default new Proxy({}, { get: (_, name) => name });",
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
