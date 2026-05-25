/**
 * Supabase Keep-Alive Script
 * 
 * This script prevents the Supabase free-tier database from being paused
 * due to inactivity. Supabase pauses projects after 7 days of no activity.
 * 
 * Run this script periodically (recommended: every 5-6 days) via:
 * - GitHub Actions (see .github/workflows/keep-alive.yml)
 * - Cron job
 * - Scheduled task
 * 
 * Usage:
 *   npm run keep-alive
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function keepAlive(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`\n🔄 Keep-Alive Ping Started at ${timestamp}`);
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

  try {
    // Method 1: Simple health check query
    console.log('\n1️⃣ Performing health check query...');
    const { data: healthData, error: healthError } = await supabase
      .from('users')
      .select('user_id')
      .limit(1);

    if (healthError) {
      console.warn(`⚠️ Health check query failed: ${healthError.message}`);
    } else {
      console.log('✅ Health check query successful');
    }

    // Method 2: Query products table (commonly used table)
    console.log('\n2️⃣ Querying products table...');
    const { count: productCount, error: productError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productError) {
      console.warn(`⚠️ Products query failed: ${productError.message}`);
    } else {
      console.log(`✅ Products table accessible (${productCount ?? 0} records)`);
    }

    // Method 3: Query order_details table
    console.log('\n3️⃣ Querying order_details table...');
    const { count: orderCount, error: orderError } = await supabase
      .from('order_details')
      .select('order_id', { count: 'exact', head: true });

    if (orderError) {
      console.warn(`⚠️ Order details query failed: ${orderError.message}`);
    } else {
      console.log(`✅ Order details table accessible (${orderCount ?? 0} records)`);
    }

    // Method 4: Query transactions table (blockchain records)
    console.log('\n4️⃣ Querying transactions table...');
    const { count: txCount, error: txError } = await supabase
      .from('transactions')
      .select('transaction_id', { count: 'exact', head: true });

    if (txError) {
      console.warn(`⚠️ Transactions query failed: ${txError.message}`);
    } else {
      console.log(`✅ Transactions table accessible (${txCount ?? 0} records)`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 KEEP-ALIVE SUMMARY');
    console.log('='.repeat(50));
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log(`📦 Products: ${productCount ?? 'N/A'}`);
    console.log(`🛒 Orders: ${orderCount ?? 'N/A'}`);
    console.log(`🔗 Transactions: ${txCount ?? 'N/A'}`);
    console.log('✅ Database is ACTIVE and responding!');
    console.log('='.repeat(50));

    // Log to a keep_alive_logs table if it exists (optional)
    try {
      await supabase.from('keep_alive_logs').insert({
        timestamp: timestamp,
        status: 'success',
        product_count: productCount,
        order_count: orderCount,
        transaction_count: txCount,
        source: 'manual'
      });
      console.log('\n📝 Keep-alive log recorded in database');
    } catch {
      // Table might not exist, which is fine
      console.log('\n💡 Tip: Create keep_alive_logs table to track ping history');
      console.log('   Run: database/KEEP-ALIVE-LOGS-TABLE.sql in Supabase SQL Editor');
    }

  } catch (error) {
    console.error('\n❌ KEEP-ALIVE FAILED!');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the keep-alive function
keepAlive()
  .then(() => {
    console.log('\n🎉 Keep-alive completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Keep-alive script crashed:', error);
    process.exit(1);
  });
