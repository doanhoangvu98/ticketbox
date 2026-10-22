import { RULES } from '@/lib/rules';
import type {
  BankTransaction,
  EventCategory,
  EventDetail,
  EventStatus,
  EventSummary,
  Order,
  PromoCode,
  Role,
  Seat,
  SeatingType,
  Ticket,
  TicketType,
  User,
  Venue,
} from '@/lib/types';

/**
 * In-browser "database" for MSW. Persisted to localStorage so a page reload keeps holds, orders
 * and tickets (like a real server would). Use resetDb() (dev panel) to start over.
 *
 * Rules implemented here mirror docs/DOMAIN.md; the Spring Boot backend must behave the same.
 */

export interface DbUser extends User {
  password: string;
}

export interface DbTicketType {
  id: number;
  name: string;
  price: number;
  color: string;
  quota: number;
  maxPerOrder: number;
  rowFrom?: string;
  rowTo?: string;
  seedSold: number; // GA only: tickets sold before the demo started
}

export interface DbEvent {
  id: number;
  name: string;
  category: EventCategory;
  description: string;
  venueId: number;
  organizerId: number;
  startsAt: string;
  endsAt: string;
  saleStartsAt: string;
  saleEndsAt: string;
  seatingType: SeatingType;
  status: EventStatus;
  rejectReason?: string;
  createdAt: string;
  ticketTypes: DbTicketType[];
}

export interface DbSeat extends Seat {
  orderCode?: string;
}

interface DbState {
  seq: number;
  users: DbUser[];
  venues: Venue[];
  events: DbEvent[];
  seats: Record<number, DbSeat[]>;
  orders: Order[];
  bankTransactions: BankTransaction[];
  promoCodes: PromoCode[];
  staffAssignments: Record<number, number[]>; // staffId -> eventIds
}

const STORAGE_KEY = 'tb.mockdb.v1';
const DAY = 86_400_000;

/* ------------------------------------------------------------------------------------------ */
/* Seed                                                                                         */
/* ------------------------------------------------------------------------------------------ */

const rowLetter = (i: number) => String.fromCharCode(64 + i); // 1 -> A

function seed(): DbState {
  const now = Date.now();
  const at = (days: number, hour = 20) => {
    const d = new Date(now + days * DAY);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const users: DbUser[] = [
    { id: 1, fullName: 'Nguyễn Văn An', email: 'customer@ticketbox.vn', phone: '0901234567', role: 'CUSTOMER', status: 'ACTIVE', password: '123456', createdAt: at(-120) },
    { id: 2, fullName: 'Trần Thu Hà', email: 'organizer@ticketbox.vn', phone: '0912345678', role: 'ORGANIZER', organizerName: 'Saigon Live Entertainment', status: 'ACTIVE', password: '123456', createdAt: at(-300) },
    { id: 3, fullName: 'Lê Minh Khoa', email: 'staff@ticketbox.vn', phone: '0923456789', role: 'STAFF', status: 'ACTIVE', password: '123456', createdAt: at(-200) },
    { id: 4, fullName: 'Phạm Quốc Bảo', email: 'admin@ticketbox.vn', phone: '0934567890', role: 'ADMIN', status: 'ACTIVE', password: '123456', createdAt: at(-400) },
    { id: 5, fullName: 'Võ Hoàng Yến', email: 'yen.vo@gmail.com', role: 'CUSTOMER', status: 'ACTIVE', password: '123456', createdAt: at(-40) },
    { id: 6, fullName: 'Hanoi Arts Agency', email: 'hanoi.arts@ticketbox.vn', role: 'ORGANIZER', organizerName: 'Hanoi Arts Agency', status: 'ACTIVE', password: '123456', createdAt: at(-250) },
    { id: 7, fullName: 'Đặng Gia Huy', email: 'huy.dang@gmail.com', role: 'CUSTOMER', status: 'LOCKED', password: '123456', createdAt: at(-90) },
  ];

  const venues: Venue[] = [
    { id: 1, name: 'Nhà hát Thành phố', address: '07 Công Trường Lam Sơn, Quận 1', city: 'Hồ Chí Minh', totalRows: 10, seatsPerRow: 14, capacity: 140 },
    { id: 2, name: 'Nhà hát Hòa Bình', address: '240 Đường 3/2, Quận 10', city: 'Hồ Chí Minh', totalRows: 12, seatsPerRow: 18, capacity: 216 },
    { id: 3, name: 'Cung Văn hóa Hữu nghị', address: '91 Trần Hưng Đạo, Hoàn Kiếm', city: 'Hà Nội', totalRows: 11, seatsPerRow: 16, capacity: 176 },
    { id: 4, name: 'GEM Center', address: '08 Nguyễn Bỉnh Khiêm, Quận 1', city: 'Hồ Chí Minh', totalRows: 0, seatsPerRow: 0, capacity: 800 },
    { id: 5, name: 'Bãi biển Mỹ Khê', address: 'Võ Nguyên Giáp, Sơn Trà', city: 'Đà Nẵng', totalRows: 0, seatsPerRow: 0, capacity: 3000 },
  ];

  let ttId = 1;
  const reserved = (venueRows: number, tiers: [string, number, string, number][]) => {
    // tiers: [name, price, color, rowCount]; rows are assigned front to back.
    let row = 1;
    return tiers.map(([name, price, color, rows]) => {
      const t: DbTicketType = {
        id: ttId++, name, price, color, quota: 0, maxPerOrder: 6, seedSold: 0,
        rowFrom: rowLetter(row), rowTo: rowLetter(Math.min(venueRows, row + rows - 1)),
      };
      row += rows;
      return t;
    });
  };
  const ga = (tiers: [string, number, string, number, number][]) =>
    tiers.map(([name, price, color, quota, sold]) => ({ id: ttId++, name, price, color, quota, maxPerOrder: 8, seedSold: sold }) as DbTicketType);

  const base = { description: '', createdAt: at(-30), saleStartsAt: at(-20, 10) };
  const events: DbEvent[] = [
    { ...base, id: 1, name: 'Noah Live Concert 2026', category: 'MUSIC', venueId: 2, organizerId: 2, startsAt: at(12), endsAt: at(12, 23), saleEndsAt: at(12, 18), seatingType: 'RESERVED', status: 'PUBLISHED',
      description: 'Đêm nhạc live với ban nhạc đầy đủ, khách mời đặc biệt và hệ thống âm thanh ánh sáng chuẩn concert. Cửa mở lúc 18:30.',
      ticketTypes: reserved(12, [['SVIP', 2_500_000, '#f59e0b', 2], ['VIP', 1_500_000, '#8b5cf6', 3], ['Standard', 800_000, '#0ea5e9', 7]]) },
    { ...base, id: 2, name: 'Đêm nhạc Trịnh Công Sơn: Một cõi đi về', category: 'MUSIC', venueId: 1, organizerId: 2, startsAt: at(5), endsAt: at(5, 22), saleEndsAt: at(5, 17), seatingType: 'RESERVED', status: 'PUBLISHED',
      description: 'Những tình khúc Trịnh qua giọng hát của các ca sĩ khách mời, phối khí acoustic cùng dàn dây.',
      ticketTypes: reserved(10, [['VIP', 1_200_000, '#8b5cf6', 3], ['Standard', 600_000, '#0ea5e9', 7]]) },
    { ...base, id: 3, name: 'Vở kịch: Hồn Trương Ba, da hàng thịt', category: 'THEATER', venueId: 3, organizerId: 6, startsAt: at(9, 19), endsAt: at(9, 21), saleEndsAt: at(9, 16), seatingType: 'RESERVED', status: 'PUBLISHED',
      description: 'Vở kịch kinh điển của Lưu Quang Vũ, dàn dựng mới với sân khấu xoay và âm nhạc dân gian đương đại.',
      ticketTypes: reserved(11, [['Hạng A', 450_000, '#10b981', 4], ['Hạng B', 300_000, '#0ea5e9', 7]]) },
    { ...base, id: 4, name: 'Spring Boot Vietnam Meetup #12', category: 'CONFERENCE', venueId: 4, organizerId: 2, startsAt: at(16, 9), endsAt: at(16, 17), saleEndsAt: at(15, 23), seatingType: 'GENERAL_ADMISSION', status: 'PUBLISHED',
      description: 'Chủ đề: Concurrency trong hệ thống đặt vé, Virtual Threads với Java 21, Observability cho Spring Boot. Có tea-break và networking.',
      ticketTypes: ga([['Early Bird', 150_000, '#10b981', 100, 100], ['Regular', 250_000, '#0ea5e9', 300, 87], ['Workshop + Talk', 600_000, '#8b5cf6', 40, 12]]) },
    { ...base, id: 5, name: 'Jazz Night Saigon', category: 'MUSIC', venueId: 1, organizerId: 2, startsAt: at(3, 21), endsAt: at(3, 23), saleEndsAt: at(3, 19), seatingType: 'RESERVED', status: 'PUBLISHED',
      description: 'Một đêm jazz ấm cúng với các nghệ sĩ trong nước và quốc tế. Dress code: smart casual.',
      ticketTypes: reserved(10, [['Front Row', 900_000, '#f59e0b', 2], ['Standard', 500_000, '#0ea5e9', 8]]) },
    { ...base, id: 6, name: 'Lễ hội Âm nhạc Biển Mỹ Khê', category: 'MUSIC', venueId: 5, organizerId: 6, startsAt: at(30, 16), endsAt: at(30, 23), saleEndsAt: at(30, 12), seatingType: 'GENERAL_ADMISSION', status: 'PUBLISHED',
      description: 'Lễ hội ngoài trời 2 sân khấu, 15 nghệ sĩ, khu ẩm thực và trò chơi bãi biển.',
      ticketTypes: ga([['GA', 450_000, '#0ea5e9', 2500, 1630], ['VIP Lounge', 1_800_000, '#f59e0b', 300, 211]]) },
    { ...base, id: 7, name: 'Stand-up Comedy: Cười Xuyên Việt Live', category: 'COMEDY', venueId: 2, organizerId: 2, startsAt: at(8), endsAt: at(8, 22), saleEndsAt: at(8, 18), seatingType: 'RESERVED', status: 'PUBLISHED',
      description: 'Đêm diễn hài độc thoại với 6 diễn viên. Không phù hợp cho khán giả dưới 16 tuổi.',
      ticketTypes: reserved(12, [['VIP', 700_000, '#8b5cf6', 4], ['Standard', 400_000, '#0ea5e9', 8]]) },
    { ...base, id: 8, name: 'Giải Bóng rổ VBA: Saigon Heat vs Hanoi Buffaloes', category: 'SPORTS', venueId: 4, organizerId: 6, startsAt: at(20, 19), endsAt: at(20, 21), saleEndsAt: at(20, 17), seatingType: 'GENERAL_ADMISSION', status: 'PUBLISHED',
      description: 'Trận cầu đinh mùa giải VBA. Vé có hiệu lực vào cổng trước 30 phút.',
      ticketTypes: ga([['Khán đài A', 200_000, '#0ea5e9', 500, 498], ['Courtside', 1_000_000, '#f59e0b', 40, 40]]) },
    { ...base, id: 9, name: 'Hòa nhạc Giao hưởng Mùa Xuân', category: 'MUSIC', venueId: 3, organizerId: 6, startsAt: at(45, 20), endsAt: at(45, 22), saleStartsAt: at(4, 10), saleEndsAt: at(45, 17), seatingType: 'RESERVED', status: 'PUBLISHED',
      description: 'Dàn nhạc giao hưởng trình diễn Vivaldi, Dvořák và các tác phẩm Việt Nam. Mở bán sau ít ngày nữa.',
      ticketTypes: reserved(11, [['Hạng 1', 1_000_000, '#f59e0b', 3], ['Hạng 2', 600_000, '#8b5cf6', 4], ['Hạng 3', 350_000, '#0ea5e9', 4]]) },
    { ...base, id: 10, name: 'Tech Summit Hanoi 2026', category: 'CONFERENCE', venueId: 3, organizerId: 2, startsAt: at(60, 8), endsAt: at(60, 17), saleEndsAt: at(59, 23), seatingType: 'RESERVED', status: 'PENDING_REVIEW',
      description: 'Hội nghị công nghệ thường niên: AI, Cloud, Fintech.',
      ticketTypes: reserved(11, [['VIP', 1_500_000, '#8b5cf6', 3], ['Standard', 700_000, '#0ea5e9', 8]]) },
    { ...base, id: 11, name: 'Acoustic Under The Stars', category: 'MUSIC', venueId: 4, organizerId: 2, startsAt: at(25, 20), endsAt: at(25, 22), saleEndsAt: at(25, 18), seatingType: 'GENERAL_ADMISSION', status: 'DRAFT',
      description: 'Bản nháp: đang chờ chốt line-up.',
      ticketTypes: ga([['GA', 350_000, '#0ea5e9', 500, 0]]) },
    { ...base, id: 12, name: 'Ballet: Hồ Thiên Nga', category: 'THEATER', venueId: 1, organizerId: 2, startsAt: at(-10, 20), endsAt: at(-10, 22), saleStartsAt: at(-60), saleEndsAt: at(-10, 17), seatingType: 'RESERVED', status: 'COMPLETED',
      description: 'Vở ballet kinh điển của Tchaikovsky.',
      ticketTypes: reserved(10, [['VIP', 1_200_000, '#8b5cf6', 3], ['Standard', 700_000, '#0ea5e9', 7]]) },
  ];

  // Seat maps: deterministic pseudo-random "already sold" seats so maps look realistic.
  const seats: Record<number, DbSeat[]> = {};
  for (const e of events.filter((x) => x.seatingType === 'RESERVED')) {
    const v = venues.find((x) => x.id === e.venueId)!;
    const list: DbSeat[] = [];
    for (let r = 1; r <= v.totalRows; r++) {
      const row = rowLetter(r);
      const tt = e.ticketTypes.find((t) => t.rowFrom! <= row && row <= t.rowTo!) ?? e.ticketTypes[e.ticketTypes.length - 1]!;
      for (let n = 1; n <= v.seatsPerRow; n++) {
        const roll = (e.id * 31 + r * 17 + n * 13) % 100;
        const sold = e.status === 'COMPLETED' ? roll < 85 : e.status === 'PUBLISHED' && e.id !== 9 ? roll < (e.id === 5 ? 55 : 28) : false;
        list.push({ code: `${row}${n}`, row, number: n, ticketTypeId: tt.id, status: sold ? 'SOLD' : 'AVAILABLE', orderCode: sold ? 'SEED' : undefined });
      }
    }
    // A couple of seats blocked for technical/production reasons (camera, sound desk).
    if (e.id === 1) list.filter((s) => s.row === 'L' && s.number >= 8 && s.number <= 11).forEach((s) => (s.status = 'BLOCKED'));
    seats[e.id] = list;
    e.ticketTypes.forEach((t) => (t.quota = list.filter((s) => s.ticketTypeId === t.id).length));
  }

  const state: DbState = {
    seq: 1000, users, venues, events, seats, orders: [], bankTransactions: [],
    promoCodes: [
      { id: 1, eventId: 1, code: 'NOAH10', percentOff: 10, maxUses: 100, used: 23, validUntil: at(10) },
      { id: 2, eventId: 4, code: 'DEVVN', percentOff: 20, maxUses: 50, used: 50, validUntil: at(14) },
    ],
    staffAssignments: { 3: [1, 2, 4, 5, 7, 12] },
  };

  // Demo history for the customer: one past paid & checked-in order, one upcoming paid order.
  const pastSeat = seats[12]!.find((s) => s.status === 'AVAILABLE')!;
  pastSeat.status = 'SOLD';
  pastSeat.orderCode = 'TBXPAST01';
  pushPaidOrder(state, 'TBXPAST01', 1, 12, [pastSeat.code], at(-20, 9));
  const pastTicket = state.orders[0]!.tickets[0]!;
  pastTicket.status = 'CHECKED_IN';
  pastTicket.checkedInAt = at(-10, 19);

  const upcoming = seats[2]!.filter((s) => s.status === 'AVAILABLE' && s.row === 'B').slice(0, 2);
  upcoming.forEach((s) => ((s.status = 'SOLD'), (s.orderCode = 'TBXDEMO02')));
  pushPaidOrder(state, 'TBXDEMO02', 1, 2, upcoming.map((s) => s.code), at(-3, 14));

  // A paid order with a pending refund request (admin can approve) from another customer.
  const r = seats[7]!.filter((s) => s.status === 'AVAILABLE' && s.row === 'F').slice(0, 2);
  r.forEach((s) => ((s.status = 'SOLD'), (s.orderCode = 'TBXREFUND')));
  pushPaidOrder(state, 'TBXREFUND', 5, 7, r.map((s) => s.code), at(-6, 11));
  state.orders[2]!.status = 'REFUND_REQUESTED';
  state.orders[2]!.refundReason = 'Bận công tác đột xuất, không thể tham dự.';
  state.orders[2]!.refundAmount = Math.round((state.orders[2]!.subtotal * RULES.refundPercent) / 100);
  state.orders[2]!.tickets.forEach((t) => (t.status = 'CANCELLED')); // frozen while under review

  // Bank transfers that could not be matched automatically (wrong content / late payment).
  state.bankTransactions.push(
    { id: 1, transactionId: 'FT26101234567', amount: 1_610_000, content: 'CHUYEN TIEN VE CONCERT', transferredAt: at(-1, 15), status: 'UNMATCHED', note: 'Không tìm thấy mã đơn trong nội dung' },
    { id: 2, transactionId: 'FT26101299881', amount: 805_000, content: 'TBXZZ9K2Q thanh toan', transferredAt: at(-2, 10), status: 'UNMATCHED', note: 'Đơn đã hết hạn giữ chỗ trước khi nhận tiền' },
  );
  return state;
}

function pushPaidOrder(state: DbState, code: string, userId: number, eventId: number, seatCodes: string[], paidAt: string) {
  const e = state.events.find((x) => x.id === eventId)!;
  const v = state.venues.find((x) => x.id === e.venueId)!;
  const u = state.users.find((x) => x.id === userId)!;
  const items = seatCodes.map((c) => {
    const s = state.seats[eventId]!.find((x) => x.code === c)!;
    const t = e.ticketTypes.find((x) => x.id === s.ticketTypeId)!;
    return { ticketTypeId: t.id, ticketTypeName: t.name, seatCode: c, price: t.price };
  });
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const fee = items.length * RULES.serviceFeePerTicket;
  const order: Order = {
    code, userId, eventId, eventName: e.name, eventStartsAt: e.startsAt, venueName: v.name, status: 'PAID', items,
    subtotal, discount: 0, serviceFee: fee, total: subtotal + fee,
    buyer: { fullName: u.fullName, email: u.email, phone: u.phone ?? '' },
    expiresAt: paidAt, paidAt, createdAt: paidAt, tickets: [],
  };
  order.tickets = issueTickets(order);
  state.orders.push(order);
}

/* ------------------------------------------------------------------------------------------ */
/* State + persistence                                                                          */
/* ------------------------------------------------------------------------------------------ */

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DbState;
  } catch {
    /* corrupted -> reseed */
  }
  return seed();
}

export let db: DbState = load();

export function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDb() {
  db = seed();
  save();
}

export const nextId = () => ++db.seq;

/* ------------------------------------------------------------------------------------------ */
/* Helpers                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I: easy to type on a bank app

export function randomCode(len: number) {
  return Array.from({ length: len }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

export function issueTickets(order: Order): Ticket[] {
  const holder = order.buyer?.fullName ?? '';
  return order.items.map((item, i) => {
    const code = `${order.code}-${String(i + 1).padStart(2, '0')}`;
    return {
      code,
      // Real backend: HMAC-SHA256(ticketCode, secret). Here a fake signature is enough.
      qrToken: `TBX1.${code}.${btoa(code).replace(/=/g, '').slice(-10)}`,
      orderCode: order.code,
      eventId: order.eventId,
      eventName: order.eventName,
      eventStartsAt: order.eventStartsAt,
      venueName: order.venueName,
      ticketTypeName: item.ticketTypeName,
      seatCode: item.seatCode,
      holderName: holder,
      status: 'VALID',
    };
  });
}

export const findEvent = (id: number) => db.events.find((e) => e.id === id);
export const findVenue = (id: number) => db.venues.find((v) => v.id === id)!;
export const findUser = (id: number) => db.users.find((u) => u.id === id);
export const publicUser = ({ password: _password, ...u }: DbUser): User => u;

/**
 * Lazy expiry: PENDING orders past their deadline become EXPIRED and release their seats/quota.
 * The real backend does this with a @Scheduled job + the same check inside each request.
 */
export function sweepExpired(now = Date.now()) {
  let changed = false;
  for (const o of db.orders) {
    if (o.status === 'PENDING' && new Date(o.expiresAt).getTime() <= now) {
      o.status = 'EXPIRED';
      releaseSeats(o.eventId, o.code);
      changed = true;
    }
  }
  if (changed) save();
}

export function releaseSeats(eventId: number, orderCode: string) {
  (db.seats[eventId] ?? [])
    .filter((s) => s.orderCode === orderCode)
    .forEach((s) => {
      s.status = 'AVAILABLE';
      s.orderCode = undefined;
    });
}

const ACTIVE: Order['status'][] = ['PENDING', 'PAID', 'REFUND_REQUESTED'];

/** Sold + held counts per ticket type, derived from seats (RESERVED) or orders (GA). */
export function ticketTypeView(e: DbEvent): TicketType[] {
  return e.ticketTypes.map((t) => {
    let sold: number;
    let held: number;
    if (e.seatingType === 'RESERVED') {
      const s = (db.seats[e.id] ?? []).filter((x) => x.ticketTypeId === t.id);
      sold = s.filter((x) => x.status === 'SOLD').length;
      held = s.filter((x) => x.status === 'HELD' || x.status === 'BLOCKED').length;
    } else {
      const items = db.orders.filter((o) => o.eventId === e.id).flatMap((o) => o.items.filter((i) => i.ticketTypeId === t.id).map(() => o.status));
      sold = t.seedSold + items.filter((s) => s === 'PAID' || s === 'REFUND_REQUESTED').length;
      held = items.filter((s) => s === 'PENDING').length;
    }
    return {
      id: t.id, name: t.name, price: t.price, color: t.color, quota: t.quota, sold,
      available: Math.max(0, t.quota - sold - held), maxPerOrder: t.maxPerOrder, rowFrom: t.rowFrom, rowTo: t.rowTo,
    };
  });
}

export function toSummary(e: DbEvent): EventSummary {
  const v = findVenue(e.venueId);
  const tts = ticketTypeView(e);
  return {
    id: e.id, name: e.name, category: e.category, city: v.city, venueName: v.name, startsAt: e.startsAt,
    minPrice: Math.min(...e.ticketTypes.map((t) => t.price)), status: e.status, seatingType: e.seatingType,
    soldOut: tts.every((t) => t.available === 0),
  };
}

export function toDetail(e: DbEvent): EventDetail {
  const organizer = findUser(e.organizerId);
  return {
    ...toSummary(e),
    description: e.description, endsAt: e.endsAt, saleStartsAt: e.saleStartsAt, saleEndsAt: e.saleEndsAt,
    organizer: { id: e.organizerId, name: organizer?.organizerName ?? organizer?.fullName ?? '' },
    venue: findVenue(e.venueId), ticketTypes: ticketTypeView(e), rejectReason: e.rejectReason, createdAt: e.createdAt,
  };
}

export function activeOrdersOf(eventId: number) {
  return db.orders.filter((o) => o.eventId === eventId && ACTIVE.includes(o.status));
}

export function allTickets(): Ticket[] {
  return db.orders.flatMap((o) => o.tickets);
}

export type { Role };
