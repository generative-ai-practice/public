declare namespace NodeJS {
  interface ErrnoException extends Error {
    code?: string;
  }
}

declare interface NodeProcess {
  cwd(): string;
  exit(code?: number): never;
  exitCode: number | undefined;
  argv: string[];
  env: Record<string, string | undefined>;
}

declare const process: NodeProcess;

type Buffer = Uint8Array;
type PathLike = string;
type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

declare module 'node:fs/promises' {
  export function access(path: PathLike, mode?: number): Promise<void>;
  export function readFile(
    path: PathLike,
    encoding: BufferEncoding
  ): Promise<string>;
  export function readFile(path: PathLike): Promise<Buffer>;
  export function writeFile(
    path: PathLike,
    data: string | Buffer,
    encoding?: BufferEncoding
  ): Promise<void>;
  export function mkdir(
    path: PathLike,
    options?: { recursive?: boolean; mode?: number }
  ): Promise<void>;
  export function unlink(path: PathLike): Promise<void>;
}

declare module 'node:fs' {
  export const constants: Record<string, number>;
}

declare module 'node:path' {
  const path: {
    join: (...segments: string[]) => string;
    resolve: (...segments: string[]) => string;
    relative: (from: string, to: string) => string;
    dirname: (path: string) => string;
    basename: (path: string) => string;
    extname: (path: string) => string;
    parse: (path: string) => {
      dir: string;
      name: string;
      base: string;
      ext: string;
      root: string;
    };
  };
  export default path;
}

declare module 'node:os' {
  const os: {
    tmpdir: () => string;
  };
  export default os;
}

declare module 'node:crypto' {
  export const createHash: (...args: any[]) => {
    update: (...args: any[]) => any;
    digest: (...args: any[]) => any;
  };
  export const randomUUID: () => string;
}

declare module 'node:child_process' {
  interface ChildProcess {
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: (code: number | null) => void): this;
  }
  export const spawn: (
    command: string,
    args: string[],
    options?: { stdio?: any; env?: Record<string, string | undefined> }
  ) => ChildProcess;
}
