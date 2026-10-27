// Cloudflare Pages Functions entry: every /api/* request goes to the host-independent handler.
import { handle, type Env } from '../../src/server/api';

export const onRequest: PagesFunction<Env> = ({ request, env }) => handle(request, env);
