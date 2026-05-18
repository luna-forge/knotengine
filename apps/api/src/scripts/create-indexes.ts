import { connectToDatabase } from "@qodinger/knot-database";
import {
  Invoice,
  WebhookEvent,
  Notification,
  Merchant,
  User,
  ApiKey,
  WebhookEndpoint,
  MerchantMember,
} from "@qodinger/knot-database";
import { config } from "dotenv";

/**
 * 📇 Database Index Migration Script
 *
 * Creates compound indexes for common query patterns to improve performance.
 * Run this script once during deployment to optimize database queries.
 *
 * Prerequisites:
 *   - MongoDB must be running
 *   - DATABASE_URL environment variable should be set
 *
 * Usage:
 *   pnpm tsx src/scripts/create-indexes.ts
 *
 * Docker Setup:
 *   docker-compose up -d  # Starts MongoDB and Redis
 */

export async function createDatabaseIndexes() {
  console.log("📇 Creating database indexes...\n");

  // Load environment variables from .env.development
  config({ path: ".env.development" });

  // Validate environment
  const mongoUri = process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error("❌ DATABASE_URL environment variable is not set");
    console.error(
      "   Please set DATABASE_URL in your .env file or environment",
    );
    console.error("   Example: mongodb://127.0.0.1:27017/knotengine");
    process.exit(1);
  }

  try {
    // Connect to database
    await connectToDatabase(mongoUri);

    // ============================================
    // Invoice Indexes
    // ============================================
    console.log("\n📋 Creating Invoice indexes...");

    // Compound index for invoice lookup by ID and status
    await Invoice.collection.createIndex({ invoiceId: 1, status: 1 });
    console.log("  ✅ { invoiceId: 1, status: 1 }");

    // Compound index for merchant invoice listing with testnet filtering
    await Invoice.collection.createIndex({
      merchantId: 1,
      "metadata.isTestnet": 1,
      createdAt: -1,
    });
    console.log("  ✅ { merchantId: 1, metadata.isTestnet: 1, createdAt: -1 }");

    // Index for payAddress lookup during webhook processing
    await Invoice.collection.createIndex({
      payAddress: 1,
      status: 1,
    });
    console.log("  ✅ { payAddress: 1, status: 1 }");

    // Compound index for expiration job
    await Invoice.collection.createIndex({
      expiresAt: 1,
      status: 1,
    });
    console.log("  ✅ { expiresAt: 1, status: 1 }");

    // Compound index for webhook retry job
    await Invoice.collection.createIndex({
      webhookDelivered: 1,
      webhookAttempts: 1,
      status: 1,
    });
    console.log("  ✅ { webhookDelivered: 1, webhookAttempts: 1, status: 1 }");

    // Index for invoice status lookup (common in dashboard)
    await Invoice.collection.createIndex({
      merchantId: 1,
      status: 1,
      createdAt: -1,
    });
    console.log("  ✅ { merchantId: 1, status: 1, createdAt: -1 }");

    // ============================================
    // WebhookEvent Indexes
    // ============================================
    console.log("\n📡 Creating WebhookEvent indexes...");

    // Compound index for idempotency check
    await WebhookEvent.collection.createIndex({
      txHash: 1,
      invoiceId: 1,
    });
    console.log("  ✅ { txHash: 1, invoiceId: 1 }");

    // Compound index for cumulative amount calculation (if needed)
    await WebhookEvent.collection.createIndex({
      invoiceId: 1,
      processed: 1,
    });
    console.log("  ✅ { invoiceId: 1, processed: 1 }");

    // Index for address-based lookup
    await WebhookEvent.collection.createIndex({
      toAddress: 1,
      processed: 1,
    });
    console.log("  ✅ { toAddress: 1, processed: 1 }");

    // ============================================
    // Notification Indexes
    // ============================================
    console.log("\n🔔 Creating Notification indexes...");

    // Compound index for deduplication check
    await Notification.collection.createIndex({
      merchantId: 1,
      "meta.invoiceId": 1,
      isRead: 1,
    });
    console.log("  ✅ { merchantId: 1, meta.invoiceId: 1, isRead: 1 }");

    // Compound index for notification listing
    await Notification.collection.createIndex({
      merchantId: 1,
      isRead: 1,
      createdAt: -1,
    });
    console.log("  ✅ { merchantId: 1, isRead: 1, createdAt: -1 }");

    // ============================================
    // Merchant Indexes
    // ============================================
    console.log("\n🏪 Creating Merchant indexes...");

    // Compound index for OAuth authentication with soft-delete check
    await Merchant.collection.createIndex({
      oauthId: 1,
      isActive: 1,
      isDeleted: 1,
    });
    console.log("  ✅ { oauthId: 1, isActive: 1, isDeleted: 1 }");

    // Compound index for user lookup with soft-delete check
    await Merchant.collection.createIndex({
      userId: 1,
      isActive: 1,
      isDeleted: 1,
    });
    console.log("  ✅ { userId: 1, isActive: 1, isDeleted: 1 }");

    // Index for merchantId lookup (skip if already exists)
    try {
      await Merchant.collection.createIndex(
        { merchantId: 1 },
        { unique: true },
      );
      console.log("  ✅ { merchantId: 1 }");
    } catch (err: any) {
      if (err.codeName === "IndexKeySpecsConflict" || err.code === 86) {
        console.log("  ℹ️  { merchantId: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Index for soft-deleted merchants (cleanup jobs)
    await Merchant.collection.createIndex({ isDeleted: 1, deletedAt: 1 });
    console.log("  ✅ { isDeleted: 1, deletedAt: 1 }");

    // ============================================
    // ApiKey Indexes
    // ============================================
    console.log("\n🔑 Creating ApiKey indexes...");

    // Index for API key authentication (compound index covers uniqueness via app-layer enforcement)
    // Note: keyHash schema no longer has unique:true to avoid duplicate warnings
    try {
      await ApiKey.collection.createIndex({ keyHash: 1, isActive: 1 });
      console.log("  ✅ { keyHash: 1, isActive: 1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { keyHash: 1, isActive: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Unique index for keyId lookup (enforced at app layer)
    try {
      await ApiKey.collection.createIndex({ keyId: 1 }, { unique: true });
      console.log("  ✅ { keyId: 1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { keyId: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Compound index for listing keys by merchant (skip if already exists)
    try {
      await ApiKey.collection.createIndex({
        merchantId: 1,
        isActive: 1,
        createdAt: -1,
      });
      console.log("  ✅ { merchantId: 1, isActive: 1, createdAt: -1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log(
          "  ℹ️  { merchantId: 1, isActive: 1, createdAt: -1 } - Already exists",
        );
      } else {
        throw err;
      }
    }

    // ============================================
    // WebhookEndpoint Indexes
    // ============================================
    console.log("\n🔔 Creating WebhookEndpoint indexes...");

    // Compound index for active endpoints by merchant
    // Note: endpointId schema no longer has unique:true
    try {
      await WebhookEndpoint.collection.createIndex({
        merchantId: 1,
        isActive: 1,
      });
      console.log("  ✅ { merchantId: 1, isActive: 1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { merchantId: 1, isActive: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Unique index for endpointId lookup (enforced at app layer)
    try {
      await WebhookEndpoint.collection.createIndex(
        { endpointId: 1 },
        { unique: true },
      );
      console.log("  ✅ { endpointId: 1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { endpointId: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Index for disabled endpoints (cleanup/recovery jobs)
    try {
      await WebhookEndpoint.collection.createIndex({
        isActive: 1,
        disabledAt: 1,
      });
      console.log("  ✅ { isActive: 1, disabledAt: 1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { isActive: 1, disabledAt: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // ============================================
    // MerchantMember Indexes
    // ============================================
    console.log("\n👥 Creating MerchantMember indexes...");

    // Compound index for membership lookup (skip if already exists)
    try {
      await MerchantMember.collection.createIndex(
        { merchantId: 1, userId: 1 },
        { unique: true },
      );
      console.log("  ✅ { merchantId: 1, userId: 1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { merchantId: 1, userId: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Index for listing members by merchant (skip if already exists)
    try {
      await MerchantMember.collection.createIndex({ merchantId: 1, role: 1 });
      console.log("  ✅ { merchantId: 1, role: 1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { merchantId: 1, role: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Index for invite token lookup (skip if already exists)
    try {
      await MerchantMember.collection.createIndex({ inviteToken: 1 });
      console.log("  ✅ { inviteToken: 1 }");
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { inviteToken: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Index for expired invite cleanup (TTL index with auto-expiry, skip if already exists)
    try {
      await MerchantMember.collection.createIndex(
        { inviteExpiresAt: 1 },
        { expireAfterSeconds: 0, partialFilterExpression: { accepted: false } },
      );
      console.log(
        "  ✅ { inviteExpiresAt: 1 } (TTL: expireAfterSeconds=0, partial: accepted=false)",
      );
    } catch (err: any) {
      if (
        [86, 85, "IndexKeySpecsConflict", "IndexOptionsConflict"].includes(
          err.codeName,
        ) ||
        [86, 85].includes(err.code)
      ) {
        console.log("  ℹ️  { inviteExpiresAt: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // ============================================
    // User Indexes
    // ============================================
    console.log("\n👤 Creating User indexes...");

    // Index for email lookup (skip if already exists)
    try {
      await User.collection.createIndex({ email: 1 });
      console.log("  ✅ { email: 1 }");
    } catch (err: any) {
      if (err.codeName === "IndexKeySpecsConflict") {
        console.log("  ℹ️  { email: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // Index for OAuth lookup (skip if already exists)
    try {
      await User.collection.createIndex({ oauthId: 1 });
      console.log("  ✅ { oauthId: 1 }");
    } catch (err: any) {
      if (err.codeName === "IndexKeySpecsConflict") {
        console.log("  ℹ️  { oauthId: 1 } - Already exists");
      } else {
        throw err;
      }
    }

    // ============================================
    // Summary
    // ============================================
    console.log("\n" + "=".repeat(50));
    console.log("✅ All database indexes created successfully!");
    console.log("=".repeat(50));

    // List all indexes for verification
    console.log("\n📊 Index Summary:");

    const collections = [
      { name: "invoices", model: Invoice },
      { name: "webhookevents", model: WebhookEvent },
      { name: "notifications", model: Notification },
      { name: "merchants", model: Merchant },
      { name: "users", model: User },
      { name: "apikeys", model: ApiKey },
      { name: "webhookendpoints", model: WebhookEndpoint },
      { name: "merchantmembers", model: MerchantMember },
    ];

    for (const collection of collections) {
      const indexes = await collection.model.collection.indexes();
      console.log(`\n${collection.name}: ${indexes.length} indexes`);
    }
  } catch (error) {
    console.error("\n❌ Error creating indexes:", error);
    console.error("\n💡 Troubleshooting:");
    console.error("   1. Ensure MongoDB is running: docker-compose up -d");
    console.error("   2. Check DATABASE_URL is set correctly");
    console.error(
      "   3. Verify MongoDB connection: mongosh --eval 'db.adminCommand(\"ping\")'",
    );
    throw error;
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDatabaseIndexes();
}
