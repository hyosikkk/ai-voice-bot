import { createClient } from "@libsql/client";

// Turso DB 클라이언트 싱글톤
let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

// 테이블 생성 및 초기 화이트리스트 데이터 삽입
export async function ensureDb() {
  const db = getDb();

  // 화이트리스트 테이블 생성 (없으면)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS whitelist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 초기 화이트리스트 이메일 삽입 (중복 무시)
  await db.execute({
    sql: "INSERT OR IGNORE INTO whitelist (email) VALUES (?)",
    args: ["kts123@estsoft.com"],
  });
}

// 이메일이 화이트리스트에 있는지 확인
export async function isEmailWhitelisted(email: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT id FROM whitelist WHERE email = ?",
    args: [email],
  });
  return result.rows.length > 0;
}
