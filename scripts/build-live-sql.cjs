const fs = require('node:fs');
const parts = ['team-access.sql', 'users-directory.sql', 'drishti-sync.sql'];
const body = parts.map(file => {
  const text = fs.readFileSync('supabase/' + file, 'utf8')
    .replace(/^begin;\s*$/gmi, '').replace(/^commit;\s*$/gmi, '')
    .replace(/^notify pgrst, 'reload schema';\s*$/gmi, '');
  return `\n-- ===== ${file} =====\n${text}`;
}).join('\n');
fs.writeFileSync('supabase/LIVE_SETUP.sql', `-- COMPLETE ACTIVE APP SCHEMA. Paste the entire file in Supabase SQL Editor.
-- Includes team access, user directory/profile/roles, and Drishti sync RPCs.
-- Existing data is preserved. All changes commit together or roll back together.
-- Do not run older setup scripts afterwards: they may replace these permissions/functions.
begin;\n${body}\nnotify pgrst, 'reload schema';\ncommit;\n`);
console.log('Generated supabase/LIVE_SETUP.sql');
