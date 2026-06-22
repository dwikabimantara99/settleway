export type ReputationStatus = 'successful' | 'failed';
export type ReputationRole = 'buyer' | 'seller';
export type ReputationStatusFilter = 'all' | ReputationStatus;
export type ReputationRoleFilter = 'all' | ReputationRole;

export interface ReputationRecord {
  id: string;
  role: ReputationRole;
  status: ReputationStatus;
  commodity: string;
  volume: string;
  counterparty: string;
  value: string;
  date: string;
  txHash: string;
  failureReason?: string;
}

export const reputationRecords: ReputationRecord[] = [
  {
    id: 'record-chili',
    role: 'buyer',
    status: 'successful',
    commodity: "Red Chili (Bird's Eye Chili)",
    volume: '700 kg',
    counterparty: 'Probolinggo Farmer Group',
    value: 'Rp 19.950.000',
    date: '18 Jun 2026',
    txHash: '889ae826fcb97b51ce165161987247dca6ab6e48acfb1b013de45874d3bda058',
  },
  {
    id: 'record-coffee',
    role: 'seller',
    status: 'successful',
    commodity: 'Arabica Green Beans',
    volume: '2.000 kg',
    counterparty: 'Java Roastery Supply Co.',
    value: 'Rp 190.000.000',
    date: '04 Jun 2026',
    txHash: '776c40338ef075a28049956f2f1a972586082f78ec48e454144534984757b095',
  },
  {
    id: 'record-rice',
    role: 'buyer',
    status: 'failed',
    commodity: 'White Rice (Premium Milling)',
    volume: '5.000 kg',
    counterparty: 'Bandung Retail Foods',
    value: 'Rp 69.000.000',
    date: '28 May 2026',
    failureReason: 'Missed funding deadline',
    txHash: '4579db52fe3009f6044cf28caa326b54e56742f39e8aed80d1bbce057bf7088c',
  },
  {
    id: 'record-refund',
    role: 'seller',
    status: 'successful',
    commodity: 'Red Chili Supply',
    volume: '500 kg',
    counterparty: 'Surabaya Spice Co.',
    value: 'Rp 14.000.000',
    date: '17 May 2026',
    txHash: '9b9f68e9c0726d507037898dd1fb6fce86159df4b67679c079829a96b28bcea4',
  },
];

export function filterReputationRecords(input: {
  records: ReputationRecord[];
  statusFilter: ReputationStatusFilter;
  roleFilter: ReputationRoleFilter;
  query: string;
}): ReputationRecord[] {
  const normalizedQuery = input.query.trim().toLowerCase();

  return input.records.filter((record) => {
    const matchesStatus =
      input.statusFilter === 'all' || record.status === input.statusFilter;
    const matchesRole = input.roleFilter === 'all' || record.role === input.roleFilter;
    const matchesQuery =
      normalizedQuery === '' ||
      record.commodity.toLowerCase().includes(normalizedQuery) ||
      record.counterparty.toLowerCase().includes(normalizedQuery) ||
      record.txHash.toLowerCase().includes(normalizedQuery);

    return matchesStatus && matchesRole && matchesQuery;
  });
}
