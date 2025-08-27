// In browser (e.g., Cypress component tests), avoid loading Node-specific modules
if (typeof window !== 'undefined') {
  // Use a globally provided stubbed client if available (set in Cypress support)
  const supabase = (typeof global !== 'undefined' && global.supabase) || (window.supabase) || {
    from: () => ({ select: () => {}, insert: () => {}, update: () => {}, delete: () => {} })
  };
  module.exports = { supabase };
} else {
  require('dotenv').config();
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  module.exports = { supabase };
}
