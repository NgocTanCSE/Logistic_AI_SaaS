import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export class SchemaProvisioner {
  static async getProvisioningSql(dbSchemaName: string): Promise<string[]> {
    // Defensive Programming: Validate schema name to prevent SQL Injection
    if (!dbSchemaName || !/^[a-zA-Z0-9_]+$/.test(dbSchemaName)) {
      throw new Error('Invalid schema name. Only alphanumeric and underscores allowed.');
    }

    // Resolve schema path flexibly depending on run context (dev vs dist)
    let schemaPath = path.join(__dirname, '../../../../../packages/prisma-schemas/prisma/schema.prisma');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(process.cwd(), '../../packages/prisma-schemas/prisma/schema.prisma');
    }
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(process.cwd(), 'packages/prisma-schemas/prisma/schema.prisma');
    }

    try {
      // Generate SQL representing the full static schema
      const { stdout } = await execAsync(`npx prisma migrate diff --from-empty --to-schema-datamodel "${schemaPath}" --script`);
      
      // Filter out only tables belonging to the "tenant" schema, and rename to dynamic schema
      const statements = stdout
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .filter(s => s.includes('"tenant".') || s.includes('schema "tenant"'))
        .map(s => s.replace(/"tenant"\./g, `"${dbSchemaName}".`))
        .map(s => {
          if (s.includes('CREATE TABLE') && s.includes('order_tracking_events')) {
             return s + ' PARTITION BY RANGE ("timestamp")';
          }
          return s;
        });
        
      // Add a couple of initial partitions for order_tracking_events (e.g. for 2026 Q1 and Q2)
      statements.push(`CREATE TABLE IF NOT EXISTS "${dbSchemaName}"."order_tracking_events_2026_q1" PARTITION OF "${dbSchemaName}"."order_tracking_events" FOR VALUES FROM ('2026-01-01') TO ('2026-04-01')`);
      statements.push(`CREATE TABLE IF NOT EXISTS "${dbSchemaName}"."order_tracking_events_2026_q2" PARTITION OF "${dbSchemaName}"."order_tracking_events" FOR VALUES FROM ('2026-04-01') TO ('2026-07-01')`);
      statements.push(`CREATE TABLE IF NOT EXISTS "${dbSchemaName}"."order_tracking_events_2026_q3" PARTITION OF "${dbSchemaName}"."order_tracking_events" FOR VALUES FROM ('2026-07-01') TO ('2026-10-01')`);
      statements.push(`CREATE TABLE IF NOT EXISTS "${dbSchemaName}"."order_tracking_events_2026_q4" PARTITION OF "${dbSchemaName}"."order_tracking_events" FOR VALUES FROM ('2026-10-01') TO ('2027-01-01')`);
        
      return statements;
    } catch (error: any) {
      console.error("Failed to generate SQL script from Prisma:", error);
      throw new Error("Provisioning script generation failed. Ensure Prisma CLI is available.");
    }
  }
}
