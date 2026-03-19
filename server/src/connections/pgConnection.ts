import { getPGCredentials, getParameter } from "../utils/aws";
import { Pool } from "pg";
import fs from "fs";

// No longer necessary if using AWS secrets manager, but leaving in place for local development.
// const pgURI = process.env.PG_URI;
// if (!pgURI) throw new Error('PG_URI not set in .env');

let pool: Pool;

export async function connectPG() { 
  // + async. get AWS password
  // + create pool with AWS password
  // + export pool to be used in pgModel
  const password = await getPGCredentials();
  const host = await getParameter("/rdsDB/host");
  const port = parseInt(await getParameter("/rdsDB/port"));
  const database = await getParameter("/rdsDB/database");
  const user = await getParameter("/rdsDB/username");

  // pool config
  pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false, ca: fs.readFileSync('/home/ssm-user/global-bundle.pem').toString() }
  });
  
  // Test pool connection with a dummy query.
  const client = await pool.connect();
  console.log('PostgreSQL connected');
  client.release();
}

// This function returns the `pool` instance if initialized, otherwise throws an error.
export function pgPool(): Pool {
  if (!pool) throw new Error("PostgreSQL pool not initialized. Call \`connectPG()\` first.");

  return pool;
}