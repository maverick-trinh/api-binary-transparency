import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const SUI_NETWORK: 'testnet' | 'mainnet' | 'devnet' | 'localnet' = (process.env.SUI_NETWORK as 'testnet' | 'mainnet' | 'devnet' | 'localnet') || 'testnet';
export const WALRUS_NETWORK: 'testnet' | 'mainnet' = (process.env.WALRUS_NETWORK as 'testnet' | 'mainnet') || 'testnet';
export const SUINS_CLIENT_NETWORK: 'testnet' | 'mainnet' = (process.env.SUINS_CLIENT_NETWORK as 'testnet' | 'mainnet') || 'testnet';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
export const PORTAL_DOMAIN_NAME_LENGTH = Number(process.env.PORTAL_DOMAIN_NAME_LENGTH) || 7;
export const AGGREGATOR_URL = process.env.AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
export const SITE_PACKAGE = process.env.SITE_PACKAGE || '0xf99aee9f21493e1590e7e5a9aea6f343a1f381031a04a732724871fc294be799';
export const RPC_URL_LIST = process.env.RPC_URL_LIST || "https://fullnode.testnet.sui.io";