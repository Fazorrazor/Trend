process.env.NODE_ENV = 'production';
import './src/config.js';
import { query } from './src/db/index.js';
import { hashPassword } from './src/utils/auth.js';

async function createAdmin() {
    const email = 'admin@gmail.com';
    const password = 'P@55word1243';
    const fullName = 'System Administrator';

    console.log(`🚀 Creating admin user: ${email}...`);

    try {
        // Check if user already exists
        const existing = await query('SELECT id FROM user_profiles WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.log('⚠️  User already exists. Updating password instead...');
            const passwordHash = await hashPassword(password);
            await query('UPDATE user_profiles SET password_hash = $1 WHERE email = $2', [passwordHash, email]);
            console.log('✅ Password updated successfully!');
            process.exit(0);
        }

        const passwordHash = await hashPassword(password);
        await query(
            `INSERT INTO user_profiles (email, password_hash, full_name, display_name) 
             VALUES ($1, $2, $3, $4)`,
            [email, passwordHash, fullName, 'Admin']
        );

        console.log('✅ Admin user created successfully!');
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        process.exit(0);
    }
}

createAdmin();
