const dns = require('dns');
const mongoose = require('mongoose');

try {
  const servers = dns.getServers();
  dns.setServers(['8.8.8.8', '1.1.1.1', ...servers.filter((server) => server !== '8.8.8.8' && server !== '1.1.1.1')]);
} catch (error) {
  console.error('Unable to update DNS servers for MongoDB SRV lookup:', error.message);
}
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const connectDB = async () => {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    console.error('MONGO_URL is missing in .env');
    return;
  }

  const tryConnect = async () => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, family: 4 });
      console.log('MongoDB Atlas Connected');
    } catch (error) {
      console.error('MongoDB Connection Failed:', error.message);
      console.error('Add this PC IP in Atlas → Network Access (or 0.0.0.0/0 for dev). API will retry in 15s.');
      setTimeout(tryConnect, 15000);
    }
  };

  await tryConnect();
};

module.exports = connectDB;
