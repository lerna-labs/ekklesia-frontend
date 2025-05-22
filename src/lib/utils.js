import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';

// shadcn helper
export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

// shorten a string to a specified length
export function shortenString(str, maxLength = 20, middle = false) {
	if (!str) return '';
	if (middle) {
		const half = Math.floor(maxLength / 2);
		return str.length > maxLength ? str.slice(0, half) + '...' + str.slice(-half) : str;
	}
	if (str.length <= maxLength) return str;
	return str.slice(0, maxLength) + '...';
}

// convert timestamp to human-readable format
export function convertTimestamp(dateString) {
	return dayjs(dateString).format('MMMM D, YYYY [at] h:mm A');
}

// convert lovelace to ada
export function lovelaceToAda(lovelace) {
	if (!lovelace) return '0 ADA';
	const ada = Number(lovelace / 1e6);
	return (
		ada.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ADA'
	);
}
