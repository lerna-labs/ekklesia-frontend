// Shared identity + color vocabulary used by every per-voter-group result
// renderer. Keeps the DRep/SPO/Stakeholder visual language consistent across
// the different vote-type cards (discrete / scale / ranked / etc.) so the
// overall results page reads as one system regardless of how each proposal
// tabulates.

import { Landmark, Crown, UserCircle, Users } from 'lucide-svelte';

export const GROUP_ACCENTS = {
	indigo: {
		bar: 'bg-indigo-500',
		chip: 'bg-indigo-50 ring-indigo-200',
		icon: 'text-indigo-600',
		stroke: '#6366f1'
	},
	amber: {
		bar: 'bg-amber-500',
		chip: 'bg-amber-50 ring-amber-200',
		icon: 'text-amber-600',
		stroke: '#f59e0b'
	},
	slate: {
		bar: 'bg-slate-500',
		chip: 'bg-slate-50 ring-slate-200',
		icon: 'text-slate-600',
		stroke: '#64748b'
	},
	neutral: {
		bar: 'bg-neutral-500',
		chip: 'bg-neutral-50 ring-neutral-200',
		icon: 'text-neutral-600',
		stroke: '#737373'
	}
};

/**
 * Resolve a voter-group key (as emitted by `result.resultsByGroup`) into the
 * icon, accent color palette, and human-friendly role label used across the
 * card family.
 */
export function groupIdentity(key, fallbackLabel) {
	const k = String(key || '').toLowerCase();
	if (k === 'drep') return { Icon: Landmark, accent: 'indigo', role: 'Delegated Representative' };
	if (k === 'pool' || k === 'spo')
		return { Icon: Crown, accent: 'amber', role: 'Stake Pool Operator' };
	if (k === 'stake' || k === 'stakeholder')
		return { Icon: UserCircle, accent: 'slate', role: 'Individual Stakeholder' };
	return { Icon: Users, accent: 'neutral', role: fallbackLabel || 'Other' };
}

// Saturated, mid-weight colors that hold up on white at small donut sizes.
// Curated so adjacent hues don't blur into each other even without a border.
const OTHER_OPTION_COLORS = [
	'#ea580c', // orange-600
	'#4f46e5', // indigo-600
	'#0891b2', // cyan-600
	'#c026d3', // fuchsia-600
	'#ca8a04', // yellow-600
	'#0d9488', // teal-600
	'#9333ea', // violet-600
	'#e11d48' // rose-600
];

/**
 * Deterministic color for a per-option result row. Reserves Yes / No / Abstain
 * for their canonical readings; everything else cycles through the curated
 * distinct-hue palette so ballots with 4+ options remain scannable.
 */
export function optionColor(label, i) {
	const l = String(label || '').toLowerCase();
	if (l === 'yes') return '#059669'; // emerald-600
	if (l === 'no') return '#dc2626'; // red-600
	if (l === 'abstain') return '#475569'; // slate-600
	return OTHER_OPTION_COLORS[i % OTHER_OPTION_COLORS.length];
}
