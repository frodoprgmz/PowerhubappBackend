const axios = require('axios');
const md5 = require('md5');

const BASE_URL = 'https://api.ttlock.com';

class TTLockService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.defaultLockId = null;
  }

  async getToken() {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const params = new URLSearchParams({
      client_id: process.env.TTLOCK_CLIENT_ID,
      client_secret: process.env.TTLOCK_CLIENT_SECRET,
      grant_type: 'password',
      username: process.env.TTLOCK_ADMIN_EMAIL,
      password: md5(process.env.TTLOCK_ADMIN_PASSWORD)
    });

    try {
      const response = await axios.post(`${BASE_URL}/oauth2/token`, params);
      this.accessToken = response.data.access_token;
      // expire 5 mins before actual expiry
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('Error getting TTLock token', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async getDefaultLockId() {
    if (this.defaultLockId) return this.defaultLockId;
    const list = await this.getLockList();
    if (list && list.list && list.list.length > 0) {
      this.defaultLockId = list.list[0].lockId;
      return this.defaultLockId;
    }
    throw new Error('No lock found on this TTLock account');
  }

  async getLockList() {
    const token = await this.getToken();
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: token,
      pageNo: 1,
      pageSize: 20,
      date: Date.now()
    });

    const response = await axios.get(`${BASE_URL}/v3/lock/list?${params.toString()}`);
    return response.data;
  }

  async getLockRecords(startDate = 0, endDate = 0, lockId = null) {
    const targetLockId = lockId || await this.getDefaultLockId();
    const token = await this.getToken();
    let allRecords = [];
    let pageNo = 1;
    const MAX_PAGES = 3; // Fetch max 3 pages (60 records) to avoid timeout
    
    while (pageNo <= MAX_PAGES) {
      const params = new URLSearchParams({
        clientId: process.env.TTLOCK_CLIENT_ID,
        accessToken: token,
        lockId: targetLockId,
        pageNo: pageNo,
        pageSize: 20,
        startDate: startDate,
        endDate: endDate || Date.now(),
        date: Date.now()
      });
      const response = await axios.get(`${BASE_URL}/v3/lockRecord/list?${params.toString()}`);
      if (response.data.errcode !== 0) break;
      const list = response.data.list || [];
      if (list.length === 0) break;
      allRecords = allRecords.concat(list);
      if (response.data.pages <= pageNo) break;
      pageNo++;
    }
    return allRecords;
  }

  async unlock(lockId) {
    const targetLockId = lockId || await this.getDefaultLockId();
    const token = await this.getToken();
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: token,
      lockId: targetLockId,
      date: Date.now()
    });

    const response = await axios.post(`${BASE_URL}/v3/lock/unlock`, params);
    return response.data;
  }

  async sendEKey(receiverUsername, startDate, endDate, lockId = null) {
    const targetLockId = lockId || await this.getDefaultLockId();
    const token = await this.getToken();
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: token,
      lockId: targetLockId,
      receiverUsername: receiverUsername,
      startDate: startDate,
      endDate: endDate,
      date: Date.now()
    });

    const response = await axios.post(`${BASE_URL}/v3/key/send`, params);
    return response.data;
  }

  async getOfflinePasscode(startDate, endDate, lockId = null) {
    const targetLockId = lockId || await this.getDefaultLockId();
    const token = await this.getToken();
    const params = new URLSearchParams({
      clientId: process.env.TTLOCK_CLIENT_ID,
      accessToken: token,
      lockId: targetLockId,
      keyboardPwdType: 2, // 2 = limited-time passcode (needs startDate and endDate)
      startDate: startDate,
      endDate: endDate,
      date: Date.now()
    });

    const response = await axios.post(`${BASE_URL}/v3/keyboardPwd/get`, params);
    return response.data;
  }
}

module.exports = new TTLockService();
