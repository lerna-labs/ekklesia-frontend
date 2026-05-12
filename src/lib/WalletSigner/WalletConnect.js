import { log, logError } from './logger.js';

export function getWallets() {
	if (!window.cardano) {
		logError('No window.cardano found');
		return {
			error: 'No window.cardano found'
		};
	} else {
		// get wallets from window.cardano
		let wallets = Object.keys(window.cardano);
		if (wallets.length === 0) {
			logError('No wallets found');
			return {
				error: 'No wallets found'
			};
		}
		log('Wallets found:', wallets);
		return wallets;
	}
}

export async function enableWallet(wallet, expectedNetwork) {
	log('Enabling wallet:', wallet);
	if (!window.cardano) {
		logError('No window.cardano found');
		return {
			error: 'No window.cardano found'
		};
	} else if (!window.cardano[wallet]) {
		logError('Wallet not found');
		return {
			error: 'Wallet not found'
		};
	} else {
		let walletApi;
		try {
			walletApi = await window.cardano[wallet].enable({
				extensions: [{ cip: 95 }]
			});
		} catch (error) {
			console.error('Error enabling wallet:', error);
			return {
				error: 'Error enabling wallet: ' + error.info
			};
		}

		// check if wallet supports CIP-95
		if (!walletApi.cip95) {
			logError('Wallet does not support CIP-95');
			return {
				error: 'Wallet does not support CIP-95'
			};
		}
		// check if wallet is on the right network
		const network = await checkNetwork(walletApi, expectedNetwork);
		if (!network) {
			logError('Wallet is not on the right network', expectedNetwork);
			return {
				error: 'Wallet is not on the right network'
			};
		}

		log('Wallet enabled:', walletApi);
		return walletApi;
	}
}

export async function checkNetwork(walletApi, expectedNetwork) {
	let selectedNetwork = await walletApi.getNetworkId();
	if (selectedNetwork != expectedNetwork) return false;
	else return true;
}

// Resolve the identity address / key matching `signType` on a connected wallet.
// Only calls the CIP-30 / CIP-95 methods relevant to the requested type so we
// don't fail a `drep` flow on a wallet that lacks reward addresses, etc.
// `pool` is handled upstream by asking the user for their pool ID — this helper
// intentionally returns an error if called with `signType: 'pool'`.
export async function getSignerAddress(walletApi, signType) {
	if (signType === 'stake') {
		try {
			const rewardAddresses = await walletApi.getRewardAddresses();
			if (!rewardAddresses || rewardAddresses.length === 0) {
				logError('No reward addresses found');
				return { error: 'No reward addresses found' };
			}
			return rewardAddresses[0];
		} catch (error) {
			logError('Error getting reward addresses:', error);
			return { error: 'Error getting reward addresses: ' + (error?.info || error?.message) };
		}
	}

	if (signType === 'drep') {
		try {
			const drepKey = await walletApi.cip95.getPubDRepKey();
			if (!drepKey) {
				logError('No drep key found');
				return { error: 'No drep key found' };
			}
			return drepKey;
		} catch (error) {
			logError('Error getting drep key:', error);
			return { error: 'Error getting drep key: ' + (error?.info || error?.message) };
		}
	}

	if (signType === 'addr') {
		try {
			const paymentAddresses = await walletApi.getUnusedAddresses();
			if (!paymentAddresses || paymentAddresses.length === 0) {
				logError('No payment address found');
				return { error: 'No payment address found' };
			}
			return paymentAddresses[0];
		} catch (error) {
			logError('Error getting payment addresses:', error);
			return { error: 'Error getting payment addresses: ' + (error?.info || error?.message) };
		}
	}

	return { error: 'Invalid sign type' };
}
