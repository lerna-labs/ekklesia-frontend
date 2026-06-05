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

// Cheap voter-credential classifier from a bech32 userId prefix.
// Matches the backend's type-level eligibility categories:
// drep / pool / stake / addr. Returns null for unrecognized prefixes.
export function voterCredentialFromId(userId) {
	const id = String(userId || '').toLowerCase();
	if (id.startsWith('drep')) return 'drep';
	if (id.startsWith('pool')) return 'pool';
	if (id.startsWith('stake')) return 'stake';
	if (id.startsWith('addr')) return 'addr';
	return null;
}

// Canonical display labels for the credential kinds.
const CREDENTIAL_LABELS = {
	drep: 'DRep',
	pool: 'SPO',
	stake: 'Stakeholder',
	addr: 'Payment address'
};

export function credentialLabel(kind) {
	const k = String(kind || '').toLowerCase();
	return CREDENTIAL_LABELS[k] ?? (k ? k.charAt(0).toUpperCase() + k.slice(1) : '');
}

// Friendly display name for a voter — the backend's resolved `name`
// (DRep registered name for `drep…` ids, Cardano $handle for `stake…` ids)
// when present, else null. Treat empty/whitespace as unresolved so callers
// can cleanly fall back to the bech32 id.
export function voterDisplayName(voter) {
	if (!voter) return null;
	const raw = typeof voter.name === 'string' ? voter.name.trim() : '';
	return raw.length > 0 ? raw : null;
}

// Resolve the list of credential kinds a ballot accepts, preferring a
// top-level `acceptedCredentials` field (the ideal future shape) and
// falling back to the Hydra ballot definition's nested value if that's
// all that's available. Returns null when nothing is known — the caller
// should then skip the type-level gate and defer to snapshot validation.
export function acceptedCredentialsOf(ballot) {
	if (!ballot) return null;
	if (Array.isArray(ballot.acceptedCredentials) && ballot.acceptedCredentials.length > 0) {
		return ballot.acceptedCredentials.map((c) => String(c).toLowerCase());
	}
	const nested = ballot?.hydra?.ballot?.ekklesia?.acceptedCredentials;
	if (Array.isArray(nested) && nested.length > 0) {
		return nested.map((c) => String(c).toLowerCase());
	}
	return null;
}

// v1 ballots expose `id`; legacy consumers read `_id`. Alias so downstream
// components that reference `_id` keep working against v1 responses.
//
// Also normalizes `resultsCalculationMode` so downstream consumers can treat
// the field as always-defined. Unknown values fall back to 'standard' to
// keep a typo in admin data from accidentally altering the results UI;
// 'standard' is the documented default and matches the current behavior on
// every existing ballot.
const KNOWN_RESULTS_MODES = new Set(['standard', 'participation']);
export function normalizeBallot(ballot) {
	if (!ballot) return ballot;
	if (ballot._id == null && ballot.id != null) ballot._id = ballot.id;
	const mode = String(ballot.resultsCalculationMode ?? '').toLowerCase();
	ballot.resultsCalculationMode = KNOWN_RESULTS_MODES.has(mode) ? mode : 'standard';
	return ballot;
}

export function normalizeBallots(list) {
	if (!Array.isArray(list)) return list;
	for (const b of list) normalizeBallot(b);
	return list;
}

// Convert lovelace to a display string, scaling precision to the value so
// sub-ADA amounts don't silently round to "0 ADA" on scaffolded/low-balance
// data. Cardano convention: 1 ADA = 1_000_000 lovelace.
export function lovelaceToAda(lovelace) {
	if (!lovelace) return '0 ADA';
	const n = Number(lovelace);
	if (!Number.isFinite(n)) return '0 ADA';

	// Anything under a millilovelace we render as raw lovelace so the
	// non-zero value is visible at all.
	if (Math.abs(n) < 1000) {
		return n.toLocaleString() + ' lovelace';
	}

	const ada = n / 1e6;
	let fractionDigits;
	if (Math.abs(ada) >= 100) fractionDigits = 0;
	else if (Math.abs(ada) >= 1) fractionDigits = 2;
	else fractionDigits = 6;

	return (
		ada.toLocaleString(undefined, {
			minimumFractionDigits: fractionDigits,
			maximumFractionDigits: fractionDigits
		}) + ' ADA'
	);
}

// Abbreviated ADA formatter for narrow contexts — "2.4B ADA" / "12.5M ADA" /
// "340K ADA" / "5 ADA". Sub-ADA values defer to `lovelaceToAda` so precision
// isn't lost for tiny amounts. Use when horizontal space is scarce (legends,
// chart axis ticks, dense cards).
export function lovelaceToAdaCompact(lovelace) {
	const n = Number(lovelace);
	if (!Number.isFinite(n) || n === 0) return '0 ADA';
	const ada = n / 1e6;
	if (Math.abs(ada) < 1) return lovelaceToAda(lovelace);
	const abs = Math.abs(ada);
	if (abs >= 1e9) return (ada / 1e9).toFixed(1).replace(/\.0$/, '') + 'B ADA';
	if (abs >= 1e6) return (ada / 1e6).toFixed(1).replace(/\.0$/, '') + 'M ADA';
	if (abs >= 1e3) return (ada / 1e3).toFixed(1).replace(/\.0$/, '') + 'K ADA';
	return Math.round(ada) + ' ADA';
}

// Compact formatter for an amount ALREADY denominated in ADA — e.g.
// proposal facet values like "Total Budget", which the proposals module
// supplies as a plain ADA figure (NOT lovelace). Distinct from
// `lovelaceToAdaCompact`, which divides a lovelace integer by 1e6 first;
// running a facet value through that scales a 65-million-ADA budget down
// to "65.41 ADA". Two-decimal abbreviation: 65_405_000 → "65.41M ADA".
export function adaCompact(ada) {
	const n = Number(ada);
	if (!Number.isFinite(n) || n === 0) return '0 ADA';
	const abs = Math.abs(n);
	// Drop a trailing ".00" entirely and a lone trailing zero ("65.40" →
	// "65.4") so round figures don't carry dead precision.
	const trim = (s) => s.replace(/\.?0+$/, '');
	if (abs >= 1e9) return trim((n / 1e9).toFixed(2)) + 'B ADA';
	if (abs >= 1e6) return trim((n / 1e6).toFixed(2)) + 'M ADA';
	if (abs >= 1e3) return trim((n / 1e3).toFixed(2)) + 'K ADA';
	return n.toLocaleString() + ' ADA';
}

// Format a percentage where tiny-but-nonzero values shouldn't look like 0.
// Returns a string including the `%` suffix.
export function formatPercent(value, decimals = 2) {
	const n = Number(value);
	if (!Number.isFinite(n) || n === 0) return (0).toFixed(decimals) + '%';
	const floor = Math.pow(10, -decimals);
	if (Math.abs(n) < floor) return (n < 0 ? '>-' : '<') + floor.toFixed(decimals) + '%';
	return n.toFixed(decimals) + '%';
}
