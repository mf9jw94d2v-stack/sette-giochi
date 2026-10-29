/**
 * Entry point bundled into supabase/functions/_shared/backend.js by
 * `npm run functions:build`. Everything here is plain TypeScript with
 * standard Request/Response, tested in Node and run in Deno.
 */
export { handleSubmitDaily } from "./submitDaily";
export { handleDeleteAccount, DELETE_CONFIRMATION } from "./deleteAccount";
export { generatorVersion } from "@/games/replay";
