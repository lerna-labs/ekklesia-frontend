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

export async function getSignerAddress(walletApi, signType) {
	let rewardAddresses = await walletApi.getRewardAddresses();
	let paymentAddresses = await walletApi.getUnusedAddresses();
	let drepKey = await walletApi.cip95.getPubDRepKey();

	if (signType === 'stake' && rewardAddresses.length === 0) {
		logError('No reward addresses found');
		return {
			error: 'No reward addresses found'
		};
	}
	if (signType === 'drep' && !drepKey) {
		logError('No drep key found');
		return {
			error: 'No drep key found'
		};
	}

	if (signType === 'addr' && paymentAddresses.length === 0) {
		logError('No payment key found');
		return {
			error: 'No payment key found'
		};
	}

	switch (signType) {
		case 'stake':
			return rewardAddresses[0];
		case 'drep':
			return drepKey;
		case 'addr':
			return paymentAddresses[0];
		default:
			return {
				error: 'Invalid sign type'
			};
	}
}
