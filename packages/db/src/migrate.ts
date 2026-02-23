import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Client } from 'pg';
import { loadEnv } from './load-env';

const migrationsDir = join(__dirname, '..', 'migrations');

async function main(): Promise<void> {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const skip = await alreadyApplied(client, file);
      if (skip) {
        process.stdout.write(`Skipping migration ${file} (already applied)\n`);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      process.stdout.write(`Applying migration ${file}\n`);
      await client.query(sql);
    }

    process.stdout.write('Migrations applied successfully\n');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});

async function alreadyApplied(client: Client, filename: string): Promise<boolean> {
  if (filename.startsWith('001_')) {
    const check = await client.query(
      `SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'Team'
       LIMIT 1`
    );
    return Boolean(check.rowCount);
  }

  if (filename.startsWith('002_')) {
    const check = await client.query(
      `SELECT 1
       FROM pg_proc
       WHERE proname = 'app_user_id'
       LIMIT 1`
    );
    return Boolean(check.rowCount);
  }

  if (filename.startsWith('003_')) {
    const check = await client.query(
      `SELECT 1
       FROM pg_trigger
       WHERE tgname = 'trg_lead_updated_at'
       LIMIT 1`
    );
    return Boolean(check.rowCount);
  }

  return false;
}
