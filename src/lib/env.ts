// Environment configuration utility
// This file helps manage environment variables for different environments

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/luka_categories",
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Public variables (accessible in browser)
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  
  // Derived values
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  
  // Validation helper
  validate: () => {
    const required = ["DATABASE_URL"];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missing.join(", ")}`);
      console.warn("   Using default values for development");
    }
    
    console.log("🔧 Environment Configuration:");
    console.log(`   NODE_ENV: ${env.NODE_ENV}`);
    console.log(`   APP_URL: ${env.NEXT_PUBLIC_APP_URL}`);
    console.log(`   DATABASE_URL: ${env.DATABASE_URL ? "✓ Set" : "✗ Missing"}`);
    
    return missing.length === 0;
  }
};

// Validate environment in development
if (typeof window === "undefined" && env.IS_DEVELOPMENT) {
  env.validate();
}

export default env;
