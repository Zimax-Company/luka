// Environment configuration utility
// This file helps manage environment variables for different environments

// Function to construct DATABASE_URL from individual components
const constructDatabaseUrl = () => {
  // Check if DATABASE_URL is provided directly
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Check if individual database components are provided (Vercel setup)
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbHost = process.env.DB_HOST;
  const dbName = process.env.DB_NAME;
  const dbPort = process.env.DB_PORT || "3306";
  
  if (dbUser && dbPassword && dbHost && dbName) {
    return `mysql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
  }
  
  // Fallback to default for development
  return "mysql://root:password@localhost:3306/luka_categories";
};

export const env = {
  // Database - construct from components or use direct URL
  DATABASE_URL: constructDatabaseUrl(),
  
  // Individual database components (for reference)
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT || "3306",
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Public variables (accessible in browser)
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  
  // Derived values
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  
  // Validation helper
  validate: () => {
    console.log("🔧 Environment Configuration:");
    console.log(`   NODE_ENV: ${env.NODE_ENV}`);
    console.log(`   APP_URL: ${env.NEXT_PUBLIC_APP_URL}`);
    console.log(`   DATABASE_URL: ${env.DATABASE_URL ? "✓ Constructed" : "✗ Missing"}`);
    
    // Check database configuration
    if (process.env.DATABASE_URL) {
      console.log("   Database: Using DATABASE_URL");
      console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}`);
    } else if (env.DB_USER && env.DB_PASSWORD && env.DB_HOST && env.DB_NAME) {
      console.log("   Database: Constructed from individual components");
      console.log(`   DB_HOST: ${env.DB_HOST}`);
      console.log(`   DB_NAME: ${env.DB_NAME}`);
      console.log(`   DB_USER: ${env.DB_USER}`);
      console.log(`   DB_PORT: ${env.DB_PORT}`);
      console.log(`   Constructed URL: ${env.DATABASE_URL}`);
    } else {
      console.log("   Database: Using development defaults");
      console.log(`   Default URL: ${env.DATABASE_URL}`);
    }
    
    // Log all environment variables for debugging
    console.log("🐛 Debug - All Database Environment Variables:");
    console.log(`   process.env.DATABASE_URL: ${process.env.DATABASE_URL || 'undefined'}`);
    console.log(`   process.env.DB_USER: ${process.env.DB_USER || 'undefined'}`);
    console.log(`   process.env.DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'undefined'}`);
    console.log(`   process.env.DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
    console.log(`   process.env.DB_NAME: ${process.env.DB_NAME || 'undefined'}`);
    console.log(`   process.env.DB_PORT: ${process.env.DB_PORT || 'undefined'}`);
    
    return !!env.DATABASE_URL;
  }
};

// Validate environment in development
if (typeof window === "undefined" && env.IS_DEVELOPMENT) {
  env.validate();
}

export default env;
