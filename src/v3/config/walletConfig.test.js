import { describe, expect, it } from 'vitest';
import {
  V3_NETWORK_NAME,
  V3_TARGET_CHAIN_ID_HEX,
  getV3AddressUrl,
  getV3WalletAddChainParams,
} from './walletConfig';

describe('V3 wallet configuration', () => {
  it('uses the validated local V3 deployment instead of the V2 network selector', () => {
    expect(V3_NETWORK_NAME).toBe('ETour V3 Local');
    expect(V3_TARGET_CHAIN_ID_HEX).toBe('0x64aba');
    expect(getV3WalletAddChainParams()).toEqual({
      chainId: '0x64aba',
      chainName: 'ETour V3 Local',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['http://127.0.0.1:8545/'],
      blockExplorerUrls: undefined,
    });
  });

  it('does not produce an Arbiscan link for a localhost deployment', () => {
    expect(getV3AddressUrl('0x9A676e781A523b5d0C0e43731313A708CB607508')).toBeNull();
  });

  it('uses Arbitrum One wallet and explorer metadata for production artifacts', () => {
    const config = {
      network: 'arbitrum',
      chainId: 42161,
      rpcUrl: 'https://arb1.example/rpc',
    };

    expect(getV3WalletAddChainParams(config)).toEqual({
      chainId: '0xa4b1',
      chainName: 'Arbitrum One',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['https://arb1.example/rpc'],
      blockExplorerUrls: ['https://arbiscan.io'],
    });
    expect(getV3AddressUrl(
      '0x9A676e781A523b5d0C0e43731313A708CB607508',
      config,
    )).toBe(
      'https://arbiscan.io/address/0x9A676e781A523b5d0C0e43731313A708CB607508',
    );
  });
});
