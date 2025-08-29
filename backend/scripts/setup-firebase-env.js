#!/usr/bin/env node

/**
 * Firebase Environment Setup Script
 *
 * Creates .env file with Firebase credentials for Google OAuth integration
 * Run this script to configure your Firebase Admin SDK credentials
 */

const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  FIREBASE_PROJECT_ID: 'going-bananas-chrome-extension',
  FIREBASE_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCb9QN3xMA2dBGa\nFgZ2OIcCxe5f+kWeOVZ99Fqd9urZEh0rghSbi6HVbuZ10zUtf64RbNIHt3C1b87t\nqc6PibLMVLnlZCFTF7TbcIZxVBBI0pI8JKeklkNZpGSUPzxWjps4k0DEN3eAz+Uy\n2WObn7Vebh/ZkTkqqnjuQMsYEBJtxLpHwqvg0233wlZzk584heVQIwAzqt/zvMdp\n2c5cW28W0YFPCed2Fh09sU1rTlA0BixIbrOyK9yrY5Xy5tl3Ipt6mG9f3x+vJZ15\nExYtVTgMB7V2RO0+VcZ1wUqYJj4T9QsL9L2Ala140JkpT2ehr6TqItZxNoesd7qY\ntvUcmn63AgMBAAECggEAAi9wCmlFx1HrT/MDVPwcbOyoosDVykLVVEryYqiI2f+M\nNP/RqxqqMNEGDFCz0zEo9JJepoA2TiPQWIVgj7rKFUYSG9zlGEhh5Jy7FM/nDrHO\newmJXAK5vMfe4Xhc0n194fNKRc/GESIM/RSk0vxhmVujllbpSNZyliu05BnV6nQY\nIzppmjlaVbfgVGISp1JdgAtnAoUgHW1LFajMgSTxc9SYgVcpIxV3zLW4WWhvXtbd\nESxJABgGyftqVaigMHJvcN0NQ6KSNKiYhRfL4p+XIV8IMpPnzGOweosyqiau5N0Y\nlm7hhZAElcI7P4im+/aRRTXOl+17vGI9Ic6fzpVQ+QKBgQDR49b8UEjC4NtiOkLd\nIzfuLKA7+XJGGY9Xnbofma8m4j5qGf22coj7E94XOKdo8LCaMyJm4bbkZsqEjKuJ\nHZ7lPO/+bHgiH626VfNFXLN4Ikwn5jJAMJFDKwX93vQRYJssAXli8sGI9SUe3px/\nu/n7PqGuvOB4bxUJpd9kfUdBvwKBgQC+OAAVUNen6hnD/NY3MjpjFgfADglJUtwo\nwxihNIo7fud261e03hP9Ta33ehCOSLr7ATeScHN04D83MKsKtnmeYtM/YQFInMPn\nYVQhFc/NgeihmolAVvx+aWxWPmOrTM3nbxa3rdnUNvUvay2Sj7UKRnQ4vtHAATDZ\nqWDAZiSRCQKBgEbw8m4vmJg9tgj6VjU2PSZEcRg0VLp60yczCYC6yiejWqM0C7wJ\n9GCgs3U30eW3TImh9OO/MLj8QUER5ryehWFH+noNIYGvIWIUwPfVwFc/iGwH8z4c\n7Ew+k3TeUbI569iw2t1l3aIz8YsAhPbriy+vWKid8GTkbsDnDp2Bdn8zAoGAEJ0b\nhMEW1NehgHiozRFaACWAb8nKDdlq2TSRBiNsn12qIbzUYDu1Sz5pn1/N6l931Ux5\n6hRgQSkE3HEnvzvIy4ieIr76OblXcvIRQwKAr9ZU1yiELFZsny3eBHpWgjOnGDuf\npFNO3zYdnBKkXFSo30jgBcTE1RxFg/1DMgq5zuECgYEAjbE355huVpH4qZaRY/uC\nFQR2aGIs5SoEQBgZNk2u/Qm+nWEuzRMGYEEXHeRHiNv3+fb6S7cW3yqf9rdbtagM\nYfQ22r3mjzmQ1QlAq4Zx4dnLaUSOiRZtKDGBrv83J98xXTN5aaCWyPSLWsuPKjt4\n1YszjthQMYY7K4y198fp5r0=\n-----END PRIVATE KEY-----\n`,
  FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk-fbsvc@going-bananas-chrome-extension.iam.gserviceaccount.com',
  FIREBASE_DATABASE_URL: 'https://going-bananas-chrome-extension.firebaseio.com'
};

function createEnvFile() {
  const envPath = path.join(__dirname, '.env');

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists!');
    console.log('Please backup your existing .env file before running this script.');
    console.log('Or delete the existing .env file and run this script again.');
    process.exit(1);
  }

  // Read the existing .env content if it exists
  let envContent = '';

  try {
    envContent = fs.readFileSync(path.join(__dirname, 'env.example'), 'utf8');
  } catch (error) {
    console.log('Creating .env file from scratch...');
    envContent = `# Going Bananas Backend Environment Configuration
NODE_ENV=development
PORT=3000

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
MOCK_GEMINI_API=false

# Database Configuration (choose one)
DATABASE_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/going-bananas

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Firebase Configuration (for Google OAuth)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log
`;
  }

  // Replace Firebase configuration
  envContent = envContent.replace(
    /FIREBASE_PROJECT_ID=.*/,
    `FIREBASE_PROJECT_ID=${firebaseConfig.FIREBASE_PROJECT_ID}`
  );

  envContent = envContent.replace(
    /FIREBASE_PRIVATE_KEY="[\s\S]*?"/,
    `FIREBASE_PRIVATE_KEY="${firebaseConfig.FIREBASE_PRIVATE_KEY}"`
  );

  envContent = envContent.replace(
    /FIREBASE_CLIENT_EMAIL=.*/,
    `FIREBASE_CLIENT_EMAIL=${firebaseConfig.FIREBASE_CLIENT_EMAIL}`
  );

  envContent = envContent.replace(
    /FIREBASE_DATABASE_URL=.*/,
    `FIREBASE_DATABASE_URL=${firebaseConfig.FIREBASE_DATABASE_URL}`
  );

  // Write the .env file
  fs.writeFileSync(envPath, envContent);

  console.log('✅ Firebase environment configuration created successfully!');
  console.log(`📁 Created: ${envPath}`);
  console.log('');
  console.log('🔧 Firebase Configuration:');
  console.log(`   Project ID: ${firebaseConfig.FIREBASE_PROJECT_ID}`);
  console.log(`   Client Email: ${firebaseConfig.FIREBASE_CLIENT_EMAIL}`);
  console.log(`   Database URL: ${firebaseConfig.FIREBASE_DATABASE_URL}`);
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. Start your server: npm start');
  console.log('   2. Test Firebase integration: npm run test-firebase');
  console.log('   3. Test full OAuth flow: npm run test-full-flow');
  console.log('');
  console.log('🔒 IMPORTANT: Keep your .env file secure and never commit it to git!');
}

// Run the setup
if (require.main === module) {
  console.log('🔥 Firebase Environment Setup for Going Bananas');
  console.log('================================================');
  console.log('');

  createEnvFile();
}

