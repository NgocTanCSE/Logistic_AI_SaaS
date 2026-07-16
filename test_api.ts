import jwt from 'jsonwebtoken';
import axios from 'axios';

const token = jwt.sign(
  { sub: 'test-user', tenant_id: 'tenant-demo', permissions: ['orders:read'] },
  process.env.JWT_SECRET || 'super-secret'
);

async function main() {
  try {
    const res = await axios.get('http://127.0.0.1:3003/api/v1/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("SUCCESS:", res.data);
  } catch (e: any) {
    console.error("ERROR:", e.response?.status, e.response?.data);
  }
}

main();
