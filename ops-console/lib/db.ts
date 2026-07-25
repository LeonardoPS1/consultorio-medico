import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../drizzle/schema'

let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!db) {
    const url = process.env.OPS_DATABASE_URL
    if (!url) {
      throw new Error('OPS_DATABASE_URL no está configurada')
    }
    const client = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    })
    db = drizzle(client, { schema })
  }
  return db
}

export type Db = ReturnType<typeof getDb>
