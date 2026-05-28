/**
 * Ambient module declarations for Deno-only specifiers used by the edge
 * functions (`npm:` and `https://esm.sh/`). These are resolved by the Deno
 * runtime at deploy time; the stubs exist so the TS checker in this Node
 * project doesn't flag the imports as unresolved modules.
 */
declare module 'npm:basic-ftp@5.0.5' {
  import type { Readable, Writable } from 'node:stream';

  export class Client {
    constructor(timeoutMs?: number);
    ftp: { verbose: boolean };
    access(options: {
      host: string;
      user: string;
      password: string;
      secure?: boolean;
    }): Promise<unknown>;
    downloadTo(destination: Writable, remotePath: string): Promise<unknown>;
    uploadFrom(source: Readable, remotePath: string): Promise<unknown>;
    rename(from: string, to: string): Promise<unknown>;
    remove(remotePath: string): Promise<unknown>;
    close(): void;
  }

  const ftp: { Client: typeof Client };
  export default ftp;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.1' {
  export * from '@supabase/supabase-js';
}
