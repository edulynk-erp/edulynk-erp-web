import { z } from 'zod';

// Zod's JIT probes `new Function` when a schema is created, which the production CSP (no 'unsafe-eval') reports as a
// violation in the browser. Import `z` from this module so the probe is disabled before any schema exists.
z.config({ jitless: true });

export { z };
