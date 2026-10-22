/**
 * API contract shared by the UI and the MSW mock.
 * Field names match the backend DTOs (docs/API.md). When the Spring Boot side implements an
 * endpoint, it must return exactly these shapes, then switch VITE_USE_MOCK=false.
 */

/* ----------------------------- Users & auth ----------------------------- */
export type Role = 'CUSTOMER' | 'ORGANIZER' | 'STAFF' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  organizerName?: string; // ORGANIZER only: brand shown on events
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/* --------------------------------- Events -------------------------------- */
export type EventStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type SeatingType = 'RESERVED' | 'GENERAL_ADMISSION';
export type EventCategory = 'MUSIC' | 'THEATER' | 'CONFERENCE' | 'SPORTS' | 'COMEDY';

/** A price tier ("zone"). RESERVED events map rows to tiers; GA events only have a quota. */
export interface TicketType {
  id: number;
  name: string;
  price: number;
  color: string; // hex, used on the seat map
  quota: number;
  sold: number;
  available: number;
  maxPerOrder: number;
  rowFrom?: string; // RESERVED only, e.g. "A"
  rowTo?: string; // RESERVED only, e.g. "B"
  description?: string;
}

export interface EventSummary {
  id: number;
  name: string;
  category: EventCategory;
  city: string;
  venueName: string;
  startsAt: string;
  minPrice: number;
  status: EventStatus;
  seatingType: SeatingType;
  soldOut: boolean;
}

export interface EventDetail extends EventSummary {
  description: string;
  endsAt: string;
  saleStartsAt: string;
  saleEndsAt: string;
  organizer: { id: number; name: string };
  venue: Venue;
  ticketTypes: TicketType[];
  rejectReason?: string;
  createdAt: string;
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  city: string;
  totalRows: number;
  seatsPerRow: number;
  capacity: number;
}

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';

export interface Seat {
  code: string;
  row: string;
  number: number;
  ticketTypeId: number;
  status: SeatStatus;
}

export interface EventSearchParams {
  keyword?: string;
  category?: EventCategory;
  city?: string;
  page?: number;
  size?: number;
}

export interface UpsertEventRequest {
  name: string;
  category: EventCategory;
  description: string;
  venueId: number;
  startsAt: string;
  endsAt: string;
  saleStartsAt: string;
  saleEndsAt: string;
  seatingType: SeatingType;
  ticketTypes: Pick<TicketType, 'name' | 'price' | 'color' | 'quota' | 'maxPerOrder' | 'rowFrom' | 'rowTo'>[];
}

/* --------------------------------- Orders -------------------------------- */
export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUND_REQUESTED' | 'REFUNDED';

export interface OrderItem {
  ticketTypeId: number;
  ticketTypeName: string;
  seatCode?: string;
  price: number;
}

export interface Buyer {
  fullName: string;
  email: string;
  phone: string;
}

export interface Order {
  code: string; // also the bank transfer content, e.g. TBX7K2Q9M
  userId: number;
  eventId: number;
  eventName: string;
  eventStartsAt: string;
  venueName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  promoCode?: string;
  buyer?: Buyer;
  expiresAt: string;
  paidAt?: string;
  refundReason?: string;
  refundAmount?: number;
  createdAt: string;
  tickets: Ticket[];
}

/** Either seat codes (RESERVED) or quantities per tier (GA). */
export interface CreateOrderRequest {
  eventId: number;
  seatCodes?: string[];
  items?: { ticketTypeId: number; quantity: number }[];
}

export interface PaymentInstruction {
  orderCode: string;
  amount: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  transferContent: string;
  qrImageUrl: string;
  expiresAt: string;
}

/* -------------------------------- Tickets -------------------------------- */
export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'CANCELLED' | 'REFUNDED';

export interface Ticket {
  code: string;
  qrToken: string; // opaque, signed by the backend; the QR encodes this value
  orderCode: string;
  eventId: number;
  eventName: string;
  eventStartsAt: string;
  venueName: string;
  ticketTypeName: string;
  seatCode?: string;
  holderName: string;
  status: TicketStatus;
  checkedInAt?: string;
}

/* -------------------------------- Check-in ------------------------------- */
export type CheckInResultCode = 'OK' | 'ALREADY_CHECKED_IN' | 'INVALID' | 'WRONG_EVENT' | 'NOT_VALID';

export interface CheckInResult {
  result: CheckInResultCode;
  ticket?: Ticket;
  checkedInAt?: string;
}

export interface CheckInStats {
  eventId: number;
  total: number;
  checkedIn: number;
  recent: { ticketCode: string; holderName: string; ticketTypeName: string; seatCode?: string; checkedInAt: string }[];
}

/* ------------------------------- Reporting ------------------------------- */
export interface DailySales {
  date: string; // yyyy-MM-dd
  tickets: number;
  revenue: number;
}

export interface EventStats {
  eventId: number;
  capacity: number;
  sold: number;
  revenue: number;
  checkedIn: number;
  byTicketType: { name: string; color: string; quota: number; sold: number; revenue: number }[];
  salesByDay: DailySales[];
}

export interface OrganizerDashboard {
  totalEvents: number;
  publishedEvents: number;
  revenue30d: number;
  ticketsSold30d: number;
  salesByDay: DailySales[];
  upcoming: EventSummary[];
}

export interface AdminDashboard {
  users: number;
  organizers: number;
  pendingEvents: number;
  gmv30d: number;
  serviceFee30d: number;
  refundRequests: number;
  unmatchedPayments: number;
  ordersByStatus: Record<OrderStatus, number>;
  salesByDay: DailySales[];
}

export type BankTransactionStatus = 'MATCHED' | 'UNMATCHED' | 'REFUNDED';

/** A row received from the bank webhook (SePay/Casso style). */
export interface BankTransaction {
  id: number;
  transactionId: string;
  amount: number;
  content: string;
  transferredAt: string;
  status: BankTransactionStatus;
  orderCode?: string;
  note?: string;
}

export interface PromoCode {
  id: number;
  eventId: number;
  code: string;
  percentOff: number;
  maxUses: number;
  used: number;
  validUntil: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}
