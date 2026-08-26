// Demo dataset carried over from the prototype. When the Go API lands these
// arrays are what the fetch layer replaces.

export type MerchantStatus = "Active" | "Pending" | "Suspended";
export type LinkStatus = "Active" | "Limit reached" | "Expired" | "Paused";
export type TxnStatus = "Paid" | "Pending" | "Failed" | "Refunded" | "Expired";

export type Merchant = {
  id: string;
  name: string;
  cat: string;
  branches: number;
  team: number;
  volume: string;
  txns: number;
  status: MerchantStatus;
  joined: string;
  contact: string;
};

export type PayLink = {
  id: string;
  title: string;
  type: "Static" | "Dynamic";
  amount: string;
  cur: string;
  status: LinkStatus;
  scans: number;
  max: number | string;
  paid: string;
  paidCount: number;
  expiry: string;
  created: string;
  slug: string;
  branch: string;
  sales: string;
};

export type Txn = {
  id: string;
  date: string;
  time: string;
  merchant: string;
  title: string;
  link: string;
  customer: string;
  method: "Mastercard" | "Visa";
  last4: string;
  amount: string;
  cur: string;
  status: TxnStatus;
  branch: string;
  sales: string;
};

export type Branch = {
  id: string;
  name: string;
  code: string;
  sales: number;
  links: number;
  volume: string;
  manager: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  branch: string;
  links: number;
  volume: string;
  status: "Active" | "Invited";
};

export const merchants: Merchant[] = [
  { id: "MER-1042", name: "Sheba Trading PLC", cat: "Retail & Trade", branches: 4, team: 12, volume: "$149,250", txns: 1284, status: "Active", joined: "12 Jan 2026", contact: "admin@sheba.et" },
  { id: "MER-1039", name: "Habesha Breweries", cat: "Manufacturing", branches: 6, team: 9, volume: "$88,430", txns: 642, status: "Active", joined: "04 Jan 2026", contact: "finance@habesha.et" },
  { id: "MER-1051", name: "Addis Electronics", cat: "Electronics", branches: 2, team: 5, volume: "$52,900", txns: 410, status: "Active", joined: "22 Feb 2026", contact: "sales@addiselec.et" },
  { id: "MER-1063", name: "Lucy Boutique", cat: "Fashion & Apparel", branches: 1, team: 3, volume: "$14,120", txns: 188, status: "Active", joined: "09 Mar 2026", contact: "hello@lucy.et" },
  { id: "MER-1070", name: "Enat Pharmacy", cat: "Healthcare", branches: 3, team: 6, volume: "$31,540", txns: 520, status: "Suspended", joined: "18 Mar 2026", contact: "care@enat.et" },
  { id: "MER-1088", name: "Ras Hotel Group", cat: "Hospitality", branches: 5, team: 0, volume: "—", txns: 0, status: "Pending", joined: "19 Jul 2026", contact: "it@rashotels.et" },
];

export const links: PayLink[] = [
  { id: "PL-3391", title: "Annual Membership 2026", type: "Static", amount: "$120.00", cur: "USD", status: "Active", scans: 38, max: 100, paid: "$4,560.00", paidCount: 38, expiry: "30 Aug 2026", created: "10 Jul 2026", slug: "3f9Ka2", branch: "Bole", sales: "Meseret A." },
  { id: "PL-3384", title: "Invoice INV-2044", type: "Static", amount: "$1,240.00", cur: "USD", status: "Active", scans: 2, max: 1, paid: "$1,240.00", paidCount: 1, expiry: "—", created: "09 Jul 2026", slug: "Qm71xB", branch: "Kazanchis", sales: "Dawit A." },
  { id: "PL-3377", title: "Donation — Flood Relief", type: "Dynamic", amount: "Customer enters", cur: "ETB", status: "Active", scans: 412, max: "∞", paid: "Br 284,300", paidCount: 391, expiry: "—", created: "02 Jul 2026", slug: "Zn4Lp9", branch: "Bole", sales: "Selam B." },
  { id: "PL-3362", title: "Event Ticket — Gala", type: "Static", amount: "Br 2,500", cur: "ETB", status: "Limit reached", scans: 200, max: 200, paid: "Br 500,000", paidCount: 200, expiry: "—", created: "21 Jun 2026", slug: "Ga88tk", branch: "Megenagna", sales: "Yohannes T." },
  { id: "PL-3350", title: "Deposit — Order #5521", type: "Static", amount: "$300.00", cur: "USD", status: "Expired", scans: 5, max: 20, paid: "$900.00", paidCount: 3, expiry: "30 Jun 2026", created: "15 Jun 2026", slug: "Dp09kk", branch: "Piassa", sales: "Bereket H." },
  { id: "PL-3341", title: "Monthly Retainer", type: "Static", amount: "$800.00", cur: "USD", status: "Paused", scans: 1, max: 12, paid: "$800.00", paidCount: 1, expiry: "—", created: "10 Jun 2026", slug: "Mr55re", branch: "Bole", sales: "Meseret A." },
];

export const allTxns: Txn[] = [
  { id: "TXN-90418", date: "19 Jul 2026", time: "14:22", merchant: "Sheba Trading PLC", title: "Annual Membership 2026", link: "PL-3391", customer: "Abel Getachew", method: "Mastercard", last4: "4412", amount: "$120.00", cur: "USD", status: "Paid", branch: "Bole", sales: "Meseret A." },
  { id: "TXN-90410", date: "19 Jul 2026", time: "12:08", merchant: "Sheba Trading PLC", title: "Invoice INV-2044", link: "PL-3384", customer: "Rahel Mekonnen", method: "Visa", last4: "0091", amount: "$1,240.00", cur: "USD", status: "Paid", branch: "Kazanchis", sales: "Dawit A." },
  { id: "TXN-90402", date: "19 Jul 2026", time: "10:47", merchant: "Habesha Breweries", title: "Donation — Flood Relief", link: "PL-3377", customer: "Anonymous", method: "Mastercard", last4: "7781", amount: "Br 1,000", cur: "ETB", status: "Paid", branch: "Bole", sales: "Selam B." },
  { id: "TXN-90391", date: "18 Jul 2026", time: "19:31", merchant: "Sheba Trading PLC", title: "Event Ticket — Gala", link: "PL-3362", customer: "Nardos Alemu", method: "Mastercard", last4: "3320", amount: "Br 2,500", cur: "ETB", status: "Pending", branch: "Megenagna", sales: "Yohannes T." },
  { id: "TXN-90377", date: "18 Jul 2026", time: "16:03", merchant: "Addis Electronics", title: "Deposit — Order #5521", link: "PL-3350", customer: "Samuel Tesfaye", method: "Visa", last4: "6642", amount: "$300.00", cur: "USD", status: "Failed", branch: "Piassa", sales: "Bereket H." },
  { id: "TXN-90360", date: "18 Jul 2026", time: "11:22", merchant: "Sheba Trading PLC", title: "Annual Membership 2026", link: "PL-3391", customer: "Liya Bekele", method: "Mastercard", last4: "1109", amount: "$120.00", cur: "USD", status: "Paid", branch: "Bole", sales: "Meseret A." },
  { id: "TXN-90344", date: "17 Jul 2026", time: "09:15", merchant: "Lucy Boutique", title: "Monthly Retainer", link: "PL-3341", customer: "Helen Girma", method: "Visa", last4: "8850", amount: "$800.00", cur: "USD", status: "Refunded", branch: "Bole", sales: "Meseret A." },
  { id: "TXN-90331", date: "17 Jul 2026", time: "08:02", merchant: "Habesha Breweries", title: "Donation — Flood Relief", link: "PL-3377", customer: "Anonymous", method: "Mastercard", last4: "2245", amount: "Br 5,000", cur: "ETB", status: "Paid", branch: "Bole", sales: "Selam B." },
  { id: "TXN-90320", date: "16 Jul 2026", time: "22:41", merchant: "Sheba Trading PLC", title: "Invoice INV-2044", link: "PL-3384", customer: "Dawit Haile", method: "Mastercard", last4: "5567", amount: "$1,240.00", cur: "USD", status: "Paid", branch: "Kazanchis", sales: "Dawit A." },
  { id: "TXN-90311", date: "16 Jul 2026", time: "15:29", merchant: "Addis Electronics", title: "Event Ticket — Gala", link: "PL-3362", customer: "Meron Tadesse", method: "Visa", last4: "3390", amount: "Br 2,500", cur: "ETB", status: "Paid", branch: "Megenagna", sales: "Yohannes T." },
  { id: "TXN-90298", date: "15 Jul 2026", time: "13:14", merchant: "Sheba Trading PLC", title: "Annual Membership 2026", link: "PL-3391", customer: "Kalkidan A.", method: "Mastercard", last4: "9982", amount: "$120.00", cur: "USD", status: "Paid", branch: "Bole", sales: "Meseret A." },
  { id: "TXN-90284", date: "15 Jul 2026", time: "10:55", merchant: "Enat Pharmacy", title: "Deposit — Order #5521", link: "PL-3350", customer: "Yonas K.", method: "Visa", last4: "1177", amount: "$300.00", cur: "USD", status: "Expired", branch: "Piassa", sales: "Bereket H." },
];

export const branches: Branch[] = [
  { id: "BR-01", name: "Bole Branch", code: "BOL-001", sales: 4, links: 22, volume: "$61,200", manager: "Yonas Kebede" },
  { id: "BR-02", name: "Kazanchis Branch", code: "KAZ-002", sales: 3, links: 15, volume: "$38,900", manager: "Hana Tesfaye" },
  { id: "BR-03", name: "Piassa Branch", code: "PIA-003", sales: 2, links: 9, volume: "$21,400", manager: "Dawit Alemu" },
  { id: "BR-04", name: "Megenagna Branch", code: "MEG-004", sales: 3, links: 12, volume: "$27,750", manager: "Sara Girma" },
];

export const team: TeamMember[] = [
  { id: "SL-11", name: "Meseret Abebe", email: "meseret.a@sheba.et", branch: "Bole Branch", links: 14, volume: "$18,400", status: "Active" },
  { id: "SL-12", name: "Dawit Alemu", email: "dawit.a@sheba.et", branch: "Kazanchis Branch", links: 11, volume: "$14,120", status: "Active" },
  { id: "SL-13", name: "Selam Bekele", email: "selam.b@sheba.et", branch: "Bole Branch", links: 19, volume: "$22,050", status: "Active" },
  { id: "SL-14", name: "Yohannes Tadesse", email: "yoh.t@sheba.et", branch: "Megenagna Branch", links: 8, volume: "$9,300", status: "Active" },
  { id: "SL-15", name: "Bereket Hailu", email: "bereket.h@sheba.et", branch: "Piassa Branch", links: 6, volume: "$5,900", status: "Invited" },
];
