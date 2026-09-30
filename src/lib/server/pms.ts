import sql from '$lib/server/db';

/**
 * Recalculates and updates the status of given Purchase Request IDs.
 * - 'PROCESSED': All lines are 100% fulfilled (ordered qty >= requested qty).
 * - 'PARTIAL': At least one line has ordered qty > 0, but not all lines/quantities are complete.
 * - 'APPROVED' or 'OPEN': No line has been ordered yet.
 */
export async function refreshPRStatuses(prIds: number[]) {
	if (!prIds || prIds.length === 0) return;
	const uniquePrIds = Array.from(new Set(prIds.filter((id) => typeof id === 'number' && !isNaN(id) && id > 0)));
	if (uniquePrIds.length === 0) return;

	const prs = await sql`
		SELECT 
			pr.id,
			pr.status as current_status,
			COUNT(prl.id) as line_count,
			COALESCE(SUM(prl.qty_requested), 0) as total_requested,
			COALESCE(SUM(pol_agg.qty_ordered), 0) as total_ordered,
			COUNT(CASE WHEN COALESCE(pol_agg.qty_ordered, 0) >= prl.qty_requested THEN 1 END) as completed_lines
		FROM procurement.purchase_request pr
		LEFT JOIN procurement.purchase_request_line prl ON prl.pr_id = pr.id
		LEFT JOIN (
			SELECT pr_line_id, SUM(qty_ordered) as qty_ordered
			FROM procurement.purchase_order_line
			WHERE pr_line_id IS NOT NULL
			GROUP BY pr_line_id
		) pol_agg ON pol_agg.pr_line_id = prl.id
		WHERE pr.id IN ${sql(uniquePrIds)}
		  AND pr.status NOT IN ('REJECTED', 'CANCELLED')
		GROUP BY pr.id, pr.status
	`;

	for (const pr of prs) {
		const lineCount = parseInt(pr.line_count || '0');
		const completedLines = parseInt(pr.completed_lines || '0');
		const totalReq = parseFloat(pr.total_requested || '0');
		const totalOrd = parseFloat(pr.total_ordered || '0');

		let newStatus = pr.current_status;
		if (lineCount > 0) {
			if (completedLines === lineCount && totalOrd >= totalReq) {
				newStatus = 'PROCESSED';
			} else if (totalOrd > 0) {
				newStatus = 'PARTIAL';
			} else {
				newStatus = pr.current_status === 'PROCESSED' || pr.current_status === 'PARTIAL' ? 'APPROVED' : pr.current_status;
			}
		}

		if (newStatus !== pr.current_status) {
			await sql`UPDATE procurement.purchase_request SET status = ${newStatus}, updated_at = NOW() WHERE id = ${pr.id}`;
		}
	}
}
