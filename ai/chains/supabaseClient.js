import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;   // Supabase 프로젝트 URL
const supabaseKey = process.env.SUPABASE_KEY;   // 서비스 역할 키 (Service Role Key)

export const supabase = createClient(supabaseUrl, supabaseKey);
