"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = __importDefault(require("../config"));
const client_1 = require("../supabase/client");
/**
 * Sets up the Supabase database by providing instructions to execute the database schema SQL file.
 * This script verifies configuration and provides clear instructions for setting up all necessary
 * tables, indexes, RLS policies, and triggers.
 */
const setupSupabase = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('🚀 Starting Supabase database setup...\n');
        // Verify configuration
        if (!config_1.default.supabaseUrl || !config_1.default.supabaseServiceRoleKey) {
            throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
        }
        console.log('✅ Supabase configuration found');
        console.log(`   URL: ${config_1.default.supabaseUrl}\n`);
        // Read the SQL schema file
        const schemaPath = (0, path_1.join)(__dirname, '../../database-schema.sql');
        const sql = (0, fs_1.readFileSync)(schemaPath, 'utf-8');
        console.log('📝 SQL schema file loaded\n');
        // Since Supabase JS client doesn't support executing arbitrary DDL statements directly,
        // we'll provide clear instructions and verify the connection
        console.log('📋 IMPORTANT: Supabase JS client cannot execute DDL statements directly.');
        console.log('Please execute the SQL schema using one of these methods:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Method 1: Supabase Dashboard (Recommended)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  1. Go to your Supabase project dashboard:');
        console.log(`     ${config_1.default.supabaseUrl.replace('/rest/v1', '')}`);
        console.log('  2. Navigate to SQL Editor (in the left sidebar)');
        console.log('  3. Click "New query"');
        console.log('  4. Copy and paste the contents of: api/database-schema.sql');
        console.log('  5. Click "Run" to execute\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Method 2: Using psql (PostgreSQL client)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const projectRef = (_a = config_1.default.supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)) === null || _a === void 0 ? void 0 : _a[1];
        if (projectRef) {
            console.log(`  psql "postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f api/database-schema.sql\n`);
            console.log('  Or get the connection string from:');
            console.log(`  ${config_1.default.supabaseUrl.replace('/rest/v1', '')}/project/_/settings/database\n`);
        }
        else {
            console.log('  psql -h <your-project-ref>.supabase.co -U postgres -d postgres -f api/database-schema.sql\n');
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Method 3: Using Supabase CLI');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  # If using local development:');
        console.log('  supabase db reset');
        console.log('');
        console.log('  # Or to push migrations:');
        console.log('  supabase db push\n');
        // Verify connection
        console.log('🔍 Verifying Supabase connection...');
        try {
            const { error } = yield client_1.supabase.from('users').select('count').limit(1);
            if (error && error.code === '42P01') {
                // Table doesn't exist - this is expected before setup
                console.log('✅ Supabase connection verified!');
                console.log('   (Tables don\'t exist yet - this is expected before running the schema)\n');
            }
            else if (error) {
                console.log('⚠️  Connection test returned an error:');
                console.log(`   ${error.message}\n`);
            }
            else {
                console.log('✅ Supabase connection verified!');
                console.log('   (Tables already exist - you may want to check if setup is needed)\n');
            }
        }
        catch (error) {
            console.log('⚠️  Could not verify connection (this is okay if tables don\'t exist yet)');
            if (error instanceof Error) {
                console.log(`   ${error.message}\n`);
            }
        }
        console.log('✨ Next steps:');
        console.log('   1. Execute the SQL schema using one of the methods above');
        console.log('   2. Run this script again to verify the setup');
        console.log('   3. Start using your database!\n');
    }
    catch (error) {
        console.error('\n❌ An error occurred during Supabase setup:');
        if (error instanceof Error) {
            console.error('   Error:', error.message);
            if (error.stack) {
                console.error('   Stack:', error.stack);
            }
        }
        else {
            console.error('   Unknown error:', error);
        }
        process.exit(1);
    }
});
// Run the setup
if (require.main === module) {
    setupSupabase()
        .then(() => {
        console.log('✅ Setup script completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Setup script failed:', error);
        process.exit(1);
    });
}
exports.default = setupSupabase;
