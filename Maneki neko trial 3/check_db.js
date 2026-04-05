require('dotenv').config();
const https = require('https');

const supaUrl = process.env.SUPABASE_URL;
const supaKey = process.env.SUPABASE_ANON_KEY;

if (!supaUrl || !supaKey) {
    console.log('FAIL: SUPABASE_URL or SUPABASE_ANON_KEY missing from .env');
    process.exit(1);
}

const endpoint = supaUrl + '/rest/v1/menu_items?select=count&limit=1';

const req = https.get(endpoint, {
    headers: {
        'apikey': supaKey,
        'Authorization': 'Bearer ' + supaKey
    }
}, (res) => {
    let d = '';
    res.on('data', x => d += x);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('OK: Supabase connected successfully');
            process.exit(0);
        } else {
            console.log('FAIL: Supabase returned HTTP ' + res.statusCode);
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.log('FAIL: Cannot reach Supabase - ' + e.message);
    process.exit(1);
});

req.setTimeout(8000, () => {
    console.log('FAIL: Supabase connection timed out');
    req.destroy();
    process.exit(1);
});
