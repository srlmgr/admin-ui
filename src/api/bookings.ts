import { getBookingsClient } from "@/api/grpcClients";
import type {
	GetBookingEntriesRequest,
	GetBookingEntriesResponse,
} from "@buf/srlmgr_api.bufbuild_es/backend/query/v1/bookings_pb";

export type BookingEntriesScope = Exclude<
	GetBookingEntriesRequest["scope"],
	{ case: undefined; value?: undefined }
>;

export async function getBookingEntries(
	scope: BookingEntriesScope,
): Promise<GetBookingEntriesResponse> {
	return getBookingsClient().getBookingEntries({ scope });
}
