import { redirect } from '@sveltejs/kit';

/**
 * The bare ballot-detail page `/ballots/[id]` duplicated content that
 * the proposals list `/ballots/[id]/proposals` carries today (title,
 * details, provenance, status panel, eligibility shield). Nothing in
 * the app links to the detail page directly — every link points at
 * the proposals subroute — so we redirect to it as the canonical
 * "ballot page" instead of maintaining two. 301 so browsers and CDNs
 * can cache the redirect for bookmarked / historical URLs.
 */
export function load({ params, url }) {
  throw redirect(301, '/ballots/' + params.ballotId + '/proposals' + url.search);
}
