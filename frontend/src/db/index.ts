import Dexie, { type Table } from 'dexie';

export interface SSHConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKey: string;
  password?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface CommandHistoryItem {
  id: string;
  configId: string;
  command: string;
  executedAt: Date;
}

class SSHDatabase extends Dexie {
  configs!: Table<SSHConfig, string>;
  history!: Table<CommandHistoryItem, string>;

  constructor() {
    super('WebSSH');
    this.version(1).stores({
      configs: 'id, name, host, createdAt, lastUsedAt',
      history: 'id, configId, command, executedAt'
    });
  }
}

export const db = new SSHDatabase();
