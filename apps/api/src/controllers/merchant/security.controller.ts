import { FastifyReply } from "fastify";
import { Merchant } from "@qodinger/knot-database";
import { BIP32Factory } from "bip32";
import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import * as crypto from "crypto";
import { ethers } from "ethers";
import * as ecc from "tiny-secp256k1";
import { AuditLogger } from "../../core/audit-logger.js";
import { WebhookDispatcher } from "../../infra/webhook-dispatcher.js";

const bip32 = BIP32Factory(ecc);

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split("/");
  const bitCount = parseInt(bits, 10);
  const mask = bitCount === 0 ? 0 : (0xffffffff << (32 - bitCount)) >>> 0;

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

export const MerchantSecurityController = {
  testWebhook: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    try {
      await WebhookDispatcher.dispatchTest(merchant._id.toString());
      return {
        success: true,
        message: "Test webhook dispatched successfully",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to send webhook: ${message}`);
      return reply.code(400).send({ error: message });
    }
  },
  generateKey: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    if (merchant.apiKeyHash) {
      return reply
        .code(400)
        .send({ error: "API key already exists. Use rotate instead." });
    }

    const newApiKey = `knot_sk_${crypto.randomBytes(24).toString("hex")}`;
    const newApiKeyHash = crypto
      .createHash("sha256")
      .update(newApiKey)
      .digest("hex");

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: { apiKeyHash: newApiKeyHash },
    });

    console.info(`🔑 API Key generated for merchant: ${merchant._id}`);

    return reply.code(201).send({
      message: "API Key generated successfully.",
      apiKey: newApiKey,
    });
  },
  rotateKey: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    // Generate new key
    const newApiKey = `knot_sk_${crypto.randomBytes(24).toString("hex")}`;
    const newApiKeyHash = crypto
      .createHash("sha256")
      .update(newApiKey)
      .digest("hex");

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: { apiKeyHash: newApiKeyHash },
    });

    console.warn(`⚠️ API Key rotated for merchant: ${merchant._id}`);

    // Audit log key rotation
    await AuditLogger.security(
      merchant.userId?.toString() || merchant._id.toString(),
      "api_key_generated", // We use generated as the action for rotation too
      request,
    );

    return reply.code(200).send({
      message: "API Key rotated successfully. Old key is now invalid.",
      apiKey: newApiKey,
    });
  },
  rotateWebhookSecret: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    // Generate new secret
    const newWebhookSecret = `knot_wh_${crypto
      .randomBytes(24)
      .toString("hex")}`;

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: { webhookSecret: newWebhookSecret },
    });

    console.warn(`⚠️ Webhook Secret rotated for merchant: ${merchant._id}`);

    return reply.code(200).send({
      message: "Webhook Secret rotated successfully.",
      webhookSecret: newWebhookSecret,
    });
  },
  generateTestnetWallet: async (request: any, _reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return _reply.code(401).send({ error: "Unauthorized" });

    // 1. Generate Mnemonic
    const mnemonic = bip39.generateMnemonic();
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // 2. Derive BTC Testnet xPub (SegWit native - m/84'/1'/0')
    // Network: bitcoin.networks.testnet
    const root = bip32.fromSeed(seed, bitcoin.networks.testnet);
    const btcNode = root.derivePath("m/84'/1'/0'");
    const btcXpubTestnet = btcNode.neutered().toBase58();

    // 3. Derive ETH Address (m/44'/60'/0'/0/0)
    // Ethers handles this easily
    const ethWallet = ethers.Wallet.fromPhrase(mnemonic);
    const ethAddressTestnet = ethWallet.address;

    // 4. Update Merchant
    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: {
        btcXpubTestnet,
        ethAddressTestnet,
      },
    });

    console.info(`Testnet wallet generated for merchant: ${merchant._id}`);

    return {
      message: "Testnet wallet generated successfully.",
      mnemonic,
      btcXpubTestnet,
      ethAddressTestnet,
    };
  },
  getIpAllowlist: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    return {
      enabled: merchant.ipAllowlistEnabled,
      allowedIps: merchant.allowedIpAddresses || [],
    };
  },
  updateIpAllowlist: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    const { enabled, allowedIps } = request.body;

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: {
        ipAllowlistEnabled: enabled,
        allowedIpAddresses: allowedIps || [],
      },
    });

    // Audit log
    await AuditLogger.security(
      merchant.userId?.toString() || merchant._id.toString(),
      "ip_allowlist_updated",
      request,
      { enabled, allowedIps },
    );

    return {
      success: true,
      enabled,
      allowedIps: allowedIps || [],
    };
  },
  validateIp: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    const { ip } = request.body;

    if (!merchant.ipAllowlistEnabled || !merchant.allowedIpAddresses?.length) {
      return { valid: true, message: "IP allowlisting not enabled" };
    }

    const isValid = merchant.allowedIpAddresses.some((allowedIp: string) => {
      if (allowedIp === ip) return true;
      if (allowedIp.includes("/")) {
        return ipInCidr(ip, allowedIp);
      }
      if (allowedIp.includes("*")) {
        const pattern = allowedIp.replace(/\*/g, ".*");
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(ip);
      }
      return false;
    });

    return {
      valid: isValid,
      message: isValid ? "IP is allowed" : "IP is not in allowlist",
    };
  },
};
