"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = __importDefault(require("../config"));
if (!config_1.default.supabaseUrl || !config_1.default.supabaseServiceRoleKey) {
    throw new Error('Supabase URL or service role key is not defined in the configuration.');
}
exports.supabase = (0, supabase_js_1.createClient)(config_1.default.supabaseUrl, config_1.default.supabaseServiceRoleKey);
