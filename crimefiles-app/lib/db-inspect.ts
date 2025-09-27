import Database from "better-sqlite3";
import fs from "fs";

// Initialize database connection (same as in db.ts)
const DB_PATH = process.env.CRIMEFILES_DB_PATH || ".data/crimefiles.db";
const db = new Database(DB_PATH);

// Enable foreign keys for proper relationships
db.pragma("foreign_keys = ON");

console.log("🔍 Inspecting CrimeFiles Database");
console.log("=================================");
console.log(`Database path: ${DB_PATH}`);
console.log("");

try {
    // Get table info
    console.log("📋 Database Schema:");
    console.log("-------------------");

    const tables = db.prepare(`
        SELECT name, sql
        FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();

    tables.forEach((table: unknown) => {
        const t = table as { name: string; sql: string };
        console.log(`\n${t.name}:`);
        console.log(t.sql);
    });

    console.log("\n📊 Data Contents:");
    console.log("-----------------");

    // Query threads
    console.log("\n🧵 Threads Table:");
    const threads = db.prepare("SELECT * FROM threads ORDER BY created_at DESC").all();
    if (threads.length === 0) {
        console.log("  (empty)");
    } else {
        console.log(`  Found ${threads.length} thread(s):`);
        threads.forEach((thread: unknown, i: number) => {
            const t = thread as { id: string; case_id: string; suspect_id: string; user_address: string; status: string; created_at: string };
            console.log(`    ${i + 1}. ${t.id} - ${t.case_id} - ${t.suspect_id} - ${t.user_address} - ${t.status} (${new Date(t.created_at).toLocaleString()})`);
        });
    }

    // Query messages
    console.log("\n💬 Messages Table:");
    const messages = db.prepare("SELECT * FROM messages ORDER BY created_at DESC").all();
    if (messages.length === 0) {
        console.log("  (empty)");
    } else {
        console.log(`  Found ${messages.length} message(s):`);
        messages.forEach((msg: unknown, i: number) => {
            const m = msg as { id: string; thread_id: string; role: string; content: string; created_at: string };
            console.log(`    ${i + 1}. ${m.id} - Thread: ${m.thread_id} - ${m.role} - ${m.content.substring(0, 50)}${m.content.length > 50 ? '...' : ''} (${new Date(m.created_at).toLocaleString()})`);
        });
    }

    // Database stats
    console.log("\n📈 Database Statistics:");
    console.log("-----------------------");
    const threadCount = db.prepare("SELECT COUNT(*) as count FROM threads").get() as { count: number };
    const messageCount = db.prepare("SELECT COUNT(*) as count FROM messages").get() as { count: number };
    const dbSize = fs.statSync(DB_PATH).size;

    console.log(`  Total threads: ${threadCount.count}`);
    console.log(`  Total messages: ${messageCount.count}`);
    console.log(`  Database file size: ${(dbSize / 1024).toFixed(2)} KB`);

    // Show unique users
    console.log("\n👥 Unique Users:");
    const users = db.prepare("SELECT DISTINCT user_address FROM threads").all();
    if (users.length === 0) {
        console.log("  (none)");
    } else {
        console.log(`  Found ${users.length} user(s):`);
        users.forEach((user: unknown, i: number) => {
            const u = user as { user_address: string };
            const userThreads = db.prepare("SELECT COUNT(*) as count FROM threads WHERE user_address = ?").get(u.user_address) as { count: number };
            console.log(`    ${i + 1}. ${u.user_address} (${userThreads.count} thread(s))`);
        });
    }

} catch (error) {
    console.error("❌ Error inspecting database:", error);
} finally {
    db.close();
    console.log("\n✨ Database inspection complete!");
}
