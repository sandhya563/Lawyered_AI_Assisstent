import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

async function seed() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'willmaker',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Run init.sql
    const initSql = fs.readFileSync(
      path.join(__dirname, 'init.sql'),
      'utf-8',
    );
    await client.query(initSql);
    console.log('Schema created');

    // Generate proper bcrypt hash for demo user
    const demoPassword = 'Demo@123';
    const hash = await bcrypt.hash(demoPassword, 10);

    // Insert demo user with proper hash
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'demo@willmaker.com', hash, 'Rajesh Kumar'],
    );
    console.log('Demo user created (email: demo@willmaker.com, password: Demo@123)');

    // Run the rest of seed.sql (skip the user insert since we handled it)
    const seedSql = fs.readFileSync(
      path.join(__dirname, 'seed.sql'),
      'utf-8',
    );
    // Remove the user insert from seed.sql content and run the rest
    const seedWithoutUser = seedSql.replace(
      /INSERT INTO users[\s\S]*?;/,
      '-- user already inserted with proper hash',
    );
    await client.query(seedWithoutUser);
    console.log('Seed data inserted');

    console.log('\n✅ Database setup complete!');
    console.log('Demo credentials: demo@willmaker.com / Demo@123');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
