declare module 'swagger-ui-express' {
  const x: any;
  export default x;
}
declare module 'node-cron' {
  const x: any;
  export default x;
}
declare module 'pdf-parse' {
  const x: any;
  export default x;
}
declare module 'ffprobe-static' {
  const x: any;
  export default x;
}
declare module '@imgly/background-removal-node' {
  export function removeBackground(blob: Blob, config?: any): Promise<Blob>;
}
declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(opts?: any);
    send(cmd: any): Promise<any>;
  }
  export class PutObjectCommand {
    constructor(input: any);
  }
  export class GetObjectCommand {
    constructor(input: any);
  }
  export class HeadObjectCommand {
    constructor(input: any);
  }
  export class DeleteObjectCommand {
    constructor(input: any);
  }
}
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path?: string);
    exec(sql: string): void;
    prepare(sql: string): {
      get(...params: any[]): any;
      all(...params: any[]): any[];
      run(...params: any[]): { changes: number | bigint };
    };
    close(): void;
  }
}
