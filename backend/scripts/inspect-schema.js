#!/usr/bin/env node

/**
 * Database Schema Inspector
 * 
 * This script inspects the remote Supabase database schema to understand
 * the exact structure of tables, relationships, and constraints.
 * 
 * @fileoverview Database schema inspection for Supabase
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function inspectDatabaseSchema() {
  console.log('🔍 Inspecting Supabase database schema...\n');

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    // Get all tables in the public schema
    console.log('📋 Fetching table information...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Error fetching tables:', tablesError.message);
      return;
    }

    console.log('📊 Found tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name} (${table.table_type})`);
    });

    // Get detailed column information for each table
    console.log('\n🔍 Detailed table structures:');
    
    for (const table of tables) {
      if (table.table_type === 'BASE TABLE') {
        console.log(`\n📋 Table: ${table.table_name}`);
        
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
          .eq('table_schema', 'public')
          .eq('table_name', table.table_name)
          .order('ordinal_position');

        if (columnsError) {
          console.log(`  ❌ Error fetching columns: ${columnsError.message}`);
          continue;
        }

        columns.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          console.log(`    - ${col.column_name}: ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
        });

        // Get foreign key relationships
        const { data: foreignKeys, error: fkError } = await supabase
          .from('information_schema.key_column_usage')
          .select('column_name, referenced_table_name, referenced_column_name')
          .eq('table_schema', 'public')
          .eq('table_name', table.table_name)
          .not('referenced_table_name', 'is', null);

        if (!fkError && foreignKeys.length > 0) {
          console.log('    🔗 Foreign Keys:');
          foreignKeys.forEach(fk => {
            console.log(`      - ${fk.column_name} → ${fk.referenced_table_name}.${fk.referenced_column_name}`);
          });
        }
      }
    }

    // Get functions and views
    console.log('\n🔍 Functions and Views:');
    
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .order('routine_name');

    if (!functionsError && functions.length > 0) {
      console.log('📋 Functions:');
      functions.forEach(func => {
        console.log(`  - ${func.routine_name} (${func.routine_type})`);
      });
    }

    // Get views
    const views = tables.filter(t => t.table_type === 'VIEW');
    if (views.length > 0) {
      console.log('\n📋 Views:');
      views.forEach(view => {
        console.log(`  - ${view.table_name}`);
      });
    }

    // Generate a summary report
    const schemaReport = {
      timestamp: new Date().toISOString(),
      tables: tables.filter(t => t.table_type === 'BASE TABLE').map(t => t.table_name),
      views: views.map(v => v.table_name),
      functions: functions ? functions.map(f => f.routine_name) : [],
      summary: {
        totalTables: tables.filter(t => t.table_type === 'BASE TABLE').length,
        totalViews: views.length,
        totalFunctions: functions ? functions.length : 0
      }
    };

    // Save schema report
    const reportPath = path.join(__dirname, '..', 'docs', 'schema-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(schemaReport, null, 2));
    console.log(`\n📄 Schema report saved to: ${reportPath}`);

    console.log('\n🎉 Schema inspection completed!');
    console.log('\n💡 Next steps:');
    console.log('1. Review the generated TypeScript types in types/supabase.ts');
    console.log('2. Update your backend services to use the correct table structures');
    console.log('3. Check the schema report for detailed table information');

  } catch (error) {
    console.error('❌ Schema inspection failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Ensure your Supabase credentials are correct');
    console.error('2. Check that your service key has the necessary permissions');
    console.error('3. Verify your Supabase project is accessible');
    process.exit(1);
  }
}

// Run the inspection
if (require.main === module) {
  inspectDatabaseSchema().catch(error => {
    console.error('Inspection failed:', error);
    process.exit(1);
  });
}

module.exports = { inspectDatabaseSchema };