const axios = require('axios');
const md5 = require('md5');
require('dotenv').config({ path: '.env' });

async function test() {
  // 1. Get token
  const params = new URLSearchParams({
    client_id: process.env.TTLOCK_CLIENT_ID,
    client_secret: process.env.TTLOCK_CLIENT_SECRET,
    grant_type: 'password',
    username: process.env.TTLOCK_ADMIN_EMAIL,
    password: md5(process.env.TTLOCK_ADMIN_PASSWORD)
  });
  
  console.log('Logowanie do TTLock...');
  const tokenRes = await axios.post('https://api.ttlock.com/oauth2/token', params);
  const token = tokenRes.data.access_token;
  console.log('Token OK');
  
  // 2. Get lock list
  const lockParams = new URLSearchParams({
    clientId: process.env.TTLOCK_CLIENT_ID,
    accessToken: token,
    pageNo: 1,
    pageSize: 20,
    date: Date.now()
  });
  const lockRes = await axios.get('https://api.ttlock.com/v3/lock/list?' + lockParams.toString());
  console.log('Zamki:', JSON.stringify(lockRes.data, null, 2));
  
  if (!lockRes.data.list || lockRes.data.list.length === 0) {
    console.log('Brak zamków!');
    return;
  }
  const lockId = lockRes.data.list[0].lockId;
  console.log('LockId:', lockId);
  
  // 3. Get lock records
  const recParams = new URLSearchParams({
    clientId: process.env.TTLOCK_CLIENT_ID,
    accessToken: token,
    lockId: lockId,
    pageNo: 1,
    pageSize: 20,
    startDate: 0,
    endDate: Date.now(),
    date: Date.now()
  });
  const recRes = await axios.get('https://api.ttlock.com/v3/lockRecord/list?' + recParams.toString());
  console.log('Wynik getLockRecords:', JSON.stringify(recRes.data, null, 2));
}

test().catch(e => console.error('BLAD:', e.response ? JSON.stringify(e.response.data) : e.message));
