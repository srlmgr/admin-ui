import { Breadcrumb } from "antd";
import { Link } from "react-router-dom";

type SeasonEntityBreadcrumbsProps = {
	seriesId?: number | null;
	seriesName?: string | null;
	seasonId?: number | null;
	seasonName?: string | null;
	eventId?: number | null;
	eventName?: string | null;
	raceId?: number | null;
	raceName?: string | null;
	gridId?: number | null;
	gridName?: string | null;
};

type Crumb = {
	label: string;
	to?: string;
};

function toLabel(
	prefix: string,
	id?: number | null,
	name?: string | null,
): string {
	const trimmedName = name?.trim();
	if (trimmedName) {
		return trimmedName;
	}
	if (id && id > 0) {
		return `${prefix} #${id}`;
	}
	return prefix;
}

export function SeasonEntityBreadcrumbs({
	seriesId,
	seriesName,
	seasonId,
	seasonName,
	eventId,
	eventName,
	raceId,
	raceName,
	gridId,
	gridName,
}: SeasonEntityBreadcrumbsProps) {
	const crumbs: Crumb[] = [];

	if (seriesId || seriesName) {
		crumbs.push({
			label: toLabel("Series", seriesId, seriesName),
			to: "/series",
		});
	}

	if (seasonId || seasonName) {
		crumbs.push({
			label: toLabel("Season", seasonId, seasonName),
			to: seasonId ? `/seasons/${seasonId}/manage` : undefined,
		});
	}

	if (eventId || eventName) {
		crumbs.push({
			label: toLabel("Event", eventId, eventName),
			to:
				seasonId && eventId
					? `/seasons/${seasonId}/events/${eventId}`
					: undefined,
		});
	}

	if (raceId || raceName) {
		crumbs.push({
			label: toLabel("Race", raceId, raceName),
			to:
				seasonId && eventId && raceId
					? `/seasons/${seasonId}/events/${eventId}/races/${raceId}`
					: undefined,
		});
	}

	if (gridId || gridName) {
		crumbs.push({
			label: toLabel("Grid", gridId, gridName),
			to:
				seasonId && eventId && raceId && gridId
					? `/seasons/${seasonId}/events/${eventId}/races/${raceId}/grids/${gridId}`
					: undefined,
		});
	}

	if (crumbs.length === 0) {
		return null;
	}

	return (
		<Breadcrumb
			items={crumbs.map((crumb, index) => ({
				title:
					crumb.to && index < crumbs.length - 1 ? (
						<Link to={crumb.to}>{crumb.label}</Link>
					) : (
						crumb.label
					),
			}))}
		/>
	);
}
