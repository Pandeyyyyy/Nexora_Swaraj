import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRemoteTables() {
  console.log('Checking bookings table...');
  const { data: bData, error: bErr } = await supabase.from('bookings').select('id').limit(1);
  console.log('Bookings check:', bErr ? bErr.message : 'Accessible (count: ' + (bData?.length || 0) + ')');

  console.log('Checking negotiation_offers table...');
  const { data: nData, error: nErr } = await supabase.from('negotiation_offers').select('id').limit(1);
  console.log('Negotiation offers check:', nErr ? nErr.message : 'Accessible (count: ' + (nData?.length || 0) + ')');

  console.log('Checking booking_events table...');
  const { data: eData, error: eErr } = await supabase.from('booking_events').select('id').limit(1);
  console.log('Booking events check:', eErr ? eErr.message : 'Accessible (count: ' + (eData?.length || 0) + ')');
}

checkRemoteTables();
