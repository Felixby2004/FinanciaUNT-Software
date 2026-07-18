
import bcrypt from 'bcryptjs';

// Script to hash passwords for Supabase
// Use this to generate hashed passwords for your users

const passwordToHash = 'admin123'; // Change this to your password
const saltRounds = 10;

const hashPassword = async (password) => {
  try {
    const hashed = await bcrypt.hash(password, saltRounds);
    console.log(`Password: ${password}`);
    console.log(`Hashed: ${hashed}`);
    console.log('\nCopy the hashed password and update the access_token_plaid column in your usuarios table in Supabase!');
  } catch (error) {
    console.error('Error hashing password:', error);
  }
};

hashPassword(passwordToHash);

