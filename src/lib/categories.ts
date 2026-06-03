/**
 * The 6 maintenance categories from Maintainance_pattern.txt.
 *
 * Each category has:
 *   - code (1..6) used in DB rows
 *   - title (Thai + English) for headers
 *   - icon emoji (used in compact labels)
 *   - seedParts: factory-supplied default options for the dropdown.
 *     User-added "+ อื่นๆ" entries are merged in at runtime from `custom_parts`.
 */

export type CategoryCode = 1 | 2 | 3 | 4 | 5 | 6;

export interface Category {
  code: CategoryCode;
  emoji: string;
  titleTh: string;
  titleEn: string;
  seedParts: string[];
}

export const CATEGORIES: readonly Category[] = [
  {
    code: 1,
    emoji: '🛠️',
    titleTh: 'ของเหลวและสารหล่อลื่น',
    titleEn: 'Fluids & Lubricants',
    seedParts: [
      'น้ำมันเครื่อง (Engine Oil)',
      'กรองน้ำมันเครื่อง (Oil Filter)',
      'น้ำมันเกียร์อัตโนมัติ (ATF)',
      'น้ำมันเฟืองท้าย / ทรานสเฟอร์ (Rear Diff / Transfer Oil)',
      'น้ำมันเบรก (Brake Fluid)',
      'น้ำยาหล่อเย็นเครื่องยนต์ (Engine Coolant)',
    ],
  },
  {
    code: 2,
    emoji: '🌬️',
    titleTh: 'ระบบไอดี ไอเสีย และไส้กรอง',
    titleEn: 'Filters & Emission System',
    seedParts: [
      'กรองอากาศเครื่องยนต์ (Engine Air Filter)',
      'กรอง DPF (Diesel Particulate Filter)',
      'กรองแอร์ในห้องโดยสาร (Cabin Air Filter)',
      'การล้างเขม่าไอดี / วาล์ว EGR',
    ],
  },
  {
    code: 3,
    emoji: '⚡',
    titleTh: 'ระบบไฟและชิ้นส่วนเฉพาะเครื่องดีเซล',
    titleEn: 'Engine & Electrical',
    seedParts: [
      'แหวนรองหัวฉีด (Injector Washers)',
      'สายพานหน้าเครื่อง และลูกรอก (Drive Belts & Tensioner)',
      'แบตเตอรี่ (Battery)',
    ],
  },
  {
    code: 4,
    emoji: '🚗',
    titleTh: 'ช่วงล่าง เบรก และยาง',
    titleEn: 'Chassis, Brakes & Tires',
    seedParts: [
      'โคมกระจกมองข้างซ้าย (M-KA4N-69-181)',
      'แร็คพวงมาลัย (M-K011-32-110M)',
      'ลูกหมากกันโคลงหน้า (M-KD35-34-170)',
      'ลูกหมากคันชักนอก (M-KD31-32-280)',
      'ปีกนกล่างซ้าย (M-KA0G-34-350K)',
      'ปีกนกล่างขวา (M-KA0G-34-300K)',
      'โช้คหลัง (M-K070-28-910E)',
      'ผ้าเบรกหน้า (Front Brake Pads)',
      'ผ้าเบรกหลัง (Rear Brake Pads)',
      'ยางรถยนต์ (Tires)',
      'ตั้งศูนย์ล้อและถ่วงล้อ (Wheel Alignment & Balancing)',
    ],
  },
  {
    code: 5,
    emoji: '🧼',
    titleTh: 'ชิ้นส่วนสิ้นเปลืองทั่วไป',
    titleEn: 'General Consumables',
    seedParts: [
      'ยางปัดน้ำฝนหน้า (Wiper Blades - Front)',
      'ยางปัดน้ำฝนหลัง (Wiper Blade - Rear)',
      'รีโมทกุญแจ / ถ่านรีโมท (Key Fob Battery)',
    ],
  },
  {
    code: 6,
    emoji: '📦',
    titleTh: 'อื่นๆ',
    titleEn: 'Others',
    seedParts: [
      'ค่าบริการ / ค่าแรงช่าง (Labor Fee)',
    ],
  },
] as const;

export const getCategory = (code: CategoryCode): Category => {
  const c = CATEGORIES.find((x) => x.code === code);
  if (!c) throw new Error(`Unknown category code: ${code}`);
  return c;
};

export const isCategoryCode = (n: number): n is CategoryCode =>
  Number.isInteger(n) && n >= 1 && n <= 6;
