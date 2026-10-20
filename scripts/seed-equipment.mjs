/**
 * Seed equipment table from JSON data
 * Run: node scripts/seed-equipment.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zwmqiuemrsyjauvohgtl.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY env var is required. Set it before running this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// First run 01_roi_tables.sql if tables don't exist
async function ensureTables() {
  const { error } = await supabase.from('equipment').select('id').limit(1);
  if (error && error.code === '42P01') {
    console.error('❌ Tabela equipment não existe. Rode o 01_roi_tables.sql primeiro no SQL Editor.');
    process.exit(1);
  }
}

async function main() {
  await ensureTables();

  const dataPath = join(__dirname, '../equipment_data.json');
  const records = JSON.parse(readFileSync(dataPath, 'utf8'));

  console.log(`📦 ${records.length} equipamentos para inserir...`);

  const BATCH = 500;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    const { error, count } = await supabase
      .from('equipment')
      .upsert(chunk, { onConflict: 'serial_number', ignoreDuplicates: true })
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error(`❌ Erro no batch ${i}–${i + BATCH}:`, error.message);
      process.exit(1);
    }

    inserted += chunk.length;
    process.stdout.write(`\r✅ ${inserted}/${records.length} (${Math.round(inserted/records.length*100)}%)`);
  }

  console.log('\n🎉 Concluído!');
}

main().catch(console.error);
