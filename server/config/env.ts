const port = Number(process.env.PORT || 3001);
const taxRate = Number(process.env.TAX_RATE || 0);
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");

if (!Number.isInteger(port) || port < 1 || port > 65535)
     throw new Error("PORT must be a valid TCP port.");

if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) 
    throw new Error("TAX_RATE must be between 0 and 100.");

if (process.env.NODE_ENV === "production" && !corsOrigin) 
    throw new Error("CORS_ORIGIN is required in production.");

export const env = { 
    port, 
    taxRate,
     jwtSecret: process.env.JWT_SECRET || "",
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
       mongoUri: process.env.MONGODB_URI || "",
        corsOrigin 
    };
