declare namespace NodeJS {
  interface ErrnoException extends Error {
    code?: string;
  }
}

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

type BinaryLike = string | Buffer;

declare const process: {
  cwd(): string;
  exit(code?: number): never;
  exitCode: number | undefined;
  argv: string[];
  env: Record<string, string | undefined>;
};

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
  export const constants: {
    F_OK: number;
    [key: string]: number;
  };
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
  interface Hash {
    update(data: BinaryLike): Hash;
    digest(): Buffer;
    digest(encoding: BufferEncoding): string;
  }

  export function createHash(algorithm: string): Hash;
  export function randomUUID(): string;
}

declare module 'node:child_process' {
  interface ChildProcess {
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: (code: number | null) => void): this;
  }

  interface SpawnOptions {
    stdio?: unknown;
    env?: Record<string, string | undefined>;
  }

  export function spawn(
    command: string,
    args: string[],
    options?: SpawnOptions
  ): ChildProcess;
}
