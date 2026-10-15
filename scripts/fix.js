const fs = require('fs');
let code = fs.readFileSync('packages/prisma-schemas/prisma/seed-lite.ts', 'utf-8');
code = code.replace(/createMany\(\{ data: ([a-zA-Z0-9_]+) \}\);/g, 'createMany({ data: $1 }).catch(() => {});');
code = code.replace(/productId: allProducts\.length > 0 \? faker\.helpers\.arrayElement\(allProducts\)\.id : null/g, 'productId: faker.helpers.arrayElement(allProducts).id');
fs.writeFileSync('packages/prisma-schemas/prisma/seed-lite.ts', code);
