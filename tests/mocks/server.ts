/**
 * CodeSync — MSW v2 server for Vitest (Node environment)
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
