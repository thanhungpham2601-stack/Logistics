import React, { useMemo, useState, lazy, Suspense } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, Ship, Activity, Sun, Moon, Package, PackageOpen, Box } from 'lucide-react';
import { JobEntry, Driver } from '../types';
import { ContainerSizeRow, OperationTypeRow } from '../lib/supabaseTypes';
import { isJobInDateRange, todayVN, addDaysToDateStr, daysBetweenDateStr, toVNDateStr, formatDateOnly } from '../utils';
import DateRangePicker from './DateRangePicker';

// Tách riêng chunk cho three.js/@react-three/fiber - chỉ tải khi người dùng thực sự mở trang
// Tổng Quan, không đụng vào bundle chính (đặc biệt là màn hình tài xế dùng ngoài trời/4G).
const PortScene3D = lazy(() => import('./PortScene3D'));

interface DashboardOverviewProps {
  jobs: JobEntry[];
  drivers: Driver[];
  sizes: ContainerSizeRow[];
  operations: OperationTypeRow[];
}

// Bảng màu dùng chung cho các biểu đồ nhiều nhóm (loại tác nghiệp, hãng tàu...) - lặp vòng
// khi số nhóm nhiều hơn số màu, đồng bộ với bảng màu tác nghiệp bên màn hình tài xế.
const PALETTE = ['#059669', '#2563eb', '#4f46e5', '#9333ea', '#0d9488', '#ea580c', '#e11d48', '#0891b2'];

const CARGO_HANG_COLOR = '#059669';
const CARGO_RONG_COLOR = '#64748b';
const SHIFT_DAY_COLOR = '#f59e0b';
const SHIFT_NIGHT_COLOR = '#4f46e5';

function KpiCard({
  label, value, suffix, icon: Icon, deltaPct, colorVar,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  deltaPct?: number | null;
  colorVar: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex items-center justify-between transition-all hover:shadow-md">
      <div>
        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
          {value}
          {suffix && <span className="text-xs font-bold text-slate-400 ml-1">{suffix}</span>}
        </span>
        {deltaPct !== undefined && deltaPct !== null && (
          <span
            className={`text-[11px] font-bold flex items-center gap-0.5 mt-1 ${
              deltaPct > 0 ? 'text-emerald-600' : deltaPct < 0 ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            {deltaPct > 0 ? <TrendingUp className="w-3 h-3" /> : deltaPct < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(deltaPct).toFixed(1)}% so với kỳ trước
          </span>
        )}
      </div>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 12%, white)`, color: colorVar }}
      >
        <Icon className="w-5.5 h-5.5" style={{ color: colorVar }} />
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function DashboardOverview({ jobs, drivers, sizes, operations }: DashboardOverviewProps) {
  const today = todayVN();
  const [from, setFrom] = useState(addDaysToDateStr(today, -29));
  const [to, setTo] = useState(today);

  const daysInRange = daysBetweenDateStr(from, to);
  const prevTo = addDaysToDateStr(from, -1);
  const prevFrom = addDaysToDateStr(prevTo, -(daysInRange - 1));

  const periodJobs = useMemo(() => jobs.filter((j) => isJobInDateRange(j.timestamp, from, to)), [jobs, from, to]);
  const prevPeriodJobs = useMemo(
    () => jobs.filter((j) => isJobInDateRange(j.timestamp, prevFrom, prevTo)),
    [jobs, prevFrom, prevTo]
  );

  const pctChange = (curr: number, prev: number): number | null => {
    if (prev === 0) return curr > 0 ? 100 : null;
    return ((curr - prev) / prev) * 100;
  };

  const totalCount = periodJobs.length;
  const prevCount = prevPeriodJobs.length;
  const avgPerDay = daysInRange > 0 ? totalCount / daysInRange : 0;
  const activeDrivers = new Set(periodJobs.map((j) => j.driverId)).size;
  const activeLines = new Set(periodJobs.map((j) => j.line)).size;
  const dayShiftCount = periodJobs.filter((j) => j.shift === 'day').length;
  const nightShiftCount = periodJobs.filter((j) => j.shift === 'night').length;
  const cargoHangCount = periodJobs.filter((j) => j.cargoStatus === 'hang').length;
  const cargoRongCount = periodJobs.filter((j) => j.cargoStatus === 'rong').length;

  // Xu hướng sản lượng theo ngày - lấp đầy các ngày không có dữ liệu bằng 0 để biểu đồ liền mạch.
  const trendData = useMemo(() => {
    const byDate = new Map<string, { day: number; night: number }>();
    let cursor = from;
    while (cursor <= to) {
      byDate.set(cursor, { day: 0, night: 0 });
      cursor = addDaysToDateStr(cursor, 1);
    }
    for (const j of periodJobs) {
      const d = toVNDateStr(j.timestamp);
      const bucket = byDate.get(d);
      if (!bucket) continue;
      if (j.shift === 'day') bucket.day += 1;
      else bucket.night += 1;
    }
    return Array.from(byDate.entries()).map(([date, v]) => ({
      date: formatDateOnly(`${date}T12:00:00Z`).slice(0, 5),
      'Ca ngày': v.day,
      'Ca đêm': v.night,
    }));
  }, [periodJobs, from, to]);

  const operationData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of periodJobs) counts.set(j.operation, (counts.get(j.operation) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([code, value]) => ({ name: operations.find((o) => o.code === code)?.label ?? code, value }))
      .sort((a, b) => b.value - a.value);
  }, [periodJobs, operations]);

  const sizeData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of periodJobs) counts.set(j.size, (counts.get(j.size) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([code, value]) => ({ name: sizes.find((s) => s.code === code)?.label ?? code, value }))
      .sort((a, b) => b.value - a.value);
  }, [periodJobs, sizes]);

  const TOP_N = 8;
  const lineData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of periodJobs) counts.set(j.line, (counts.get(j.line) ?? 0) + 1);
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_N).map(([name, value]) => ({ name, value }));
    const restTotal = sorted.slice(TOP_N).reduce((sum, [, v]) => sum + v, 0);
    if (restTotal > 0) top.push({ name: 'Khác', value: restTotal });
    return top;
  }, [periodJobs]);

  const driverData = useMemo(() => {
    const counts = new Map<string, { name: string; value: number }>();
    for (const j of periodJobs) {
      const existing = counts.get(j.driverId);
      if (existing) existing.value += 1;
      else counts.set(j.driverId, { name: j.driverName, value: 1 });
    }
    return Array.from(counts.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [periodJobs]);

  const shiftPieData = [
    { name: 'Ca ngày', value: dayShiftCount, color: SHIFT_DAY_COLOR },
    { name: 'Ca đêm', value: nightShiftCount, color: SHIFT_NIGHT_COLOR },
  ];
  const cargoPieData = [
    { name: 'Có hàng', value: cargoHangCount, color: CARGO_HANG_COLOR },
    { name: 'Rỗng', value: cargoRongCount, color: CARGO_RONG_COLOR },
  ];

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Bộ chọn khoảng thời gian - độc lập với bộ lọc ca/ngày của các tab khác vì trang này
          xem xu hướng nhiều ngày, không phải 1 ca cụ thể. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker from={from} to={to} onChange={(nf, nt) => { setFrom(nf); setTo(nt); }} />
        <span className="text-xs text-slate-400 font-medium">
          So sánh với kỳ liền trước ({formatDateOnly(`${prevFrom}T12:00:00Z`)} - {formatDateOnly(`${prevTo}T12:00:00Z`)})
        </span>
      </div>

      {totalCount === 0 && prevCount === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Activity className="w-10 h-10 mx-auto opacity-30 mb-2" />
          <p className="text-sm font-bold">Không có dữ liệu sản lượng trong khoảng thời gian này.</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Tổng sản lượng kỳ này" value={String(totalCount)} suffix="công" icon={TrendingUp} deltaPct={pctChange(totalCount, prevCount)} colorVar="#2563eb" />
            <KpiCard label="Trung bình mỗi ngày" value={avgPerDay.toFixed(1)} suffix="công/ngày" icon={Activity} colorVar="#059669" />
            <KpiCard label="Tài xế hoạt động" value={String(activeDrivers)} suffix={`/ ${drivers.length} tài xế`} icon={Users} colorVar="#7c3aed" />
            <KpiCard label="Hãng tàu giao dịch" value={String(activeLines)} suffix="hãng" icon={Ship} colorVar="#d97706" />
          </div>

          {/* Mô phỏng bãi cảng 3D - màu/số lượng container phản ánh tỷ trọng top hãng tàu thật
              trong kỳ đang xem. Canvas three.js được tách chunk riêng (lazy) nên chỉ tải khi
              trang này thực sự mở, không ảnh hưởng tốc độ các màn hình khác. */}
          <ChartCard title="Mô Phỏng Bãi Cảng" subtitle="Màu container phản ánh tỷ trọng top hãng tàu trong kỳ">
            <div className="h-72 rounded-xl overflow-hidden bg-gradient-to-b from-sky-50 to-slate-100">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs gap-2 animate-pulse">
                    <Box className="w-5 h-5" /> Đang tải mô hình 3D...
                  </div>
                }
              >
                <PortScene3D lineData={lineData} />
              </Suspense>
            </div>
          </ChartCard>

          {/* Xu hướng theo ngày */}
          <ChartCard title="Xu hướng sản lượng theo ngày" subtitle="Chia theo ca ngày / ca đêm">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Ca ngày" stackId="shift" fill={SHIFT_DAY_COLOR} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Ca đêm" stackId="shift" fill={SHIFT_NIGHT_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Cơ cấu theo loại tác nghiệp">
              {operationData.length === 0 ? (
                <EmptyChartHint />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={operationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} isAnimationActive={false}>
                      {operationData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Cơ cấu theo kích thước container">
              {sizeData.length === 0 ? (
                <EmptyChartHint />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sizeData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" name="Số công" radius={[0, 4, 4, 0]}>
                      {sizeData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Top hãng tàu theo sản lượng">
              {lineData.length === 0 ? (
                <EmptyChartHint />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, lineData.length * 32)}>
                  <BarChart data={lineData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={96} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" name="Số công" fill="var(--theme-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Top tài xế theo sản lượng">
              {driverData.length === 0 ? (
                <EmptyChartHint />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, driverData.length * 32)}>
                  <BarChart data={driverData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" name="Số công" fill="var(--theme-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MiniSplitCard
              title="Ca ngày / Ca đêm"
              items={[
                { label: 'Ca ngày', value: dayShiftCount, color: SHIFT_DAY_COLOR, icon: Sun },
                { label: 'Ca đêm', value: nightShiftCount, color: SHIFT_NIGHT_COLOR, icon: Moon },
              ]}
            />
            <MiniSplitCard
              title="Container rỗng / có hàng"
              items={[
                { label: 'Có hàng', value: cargoHangCount, color: CARGO_HANG_COLOR, icon: Package },
                { label: 'Rỗng', value: cargoRongCount, color: CARGO_RONG_COLOR, icon: PackageOpen },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChartHint() {
  return <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">Không có dữ liệu</div>;
}

function MiniSplitCard({
  title, items,
}: {
  title: string;
  items: { label: string; value: number; color: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-3">{title}</h3>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 mb-3">
        {items.map((item, i) => (
          <div
            key={i}
            style={{ width: total > 0 ? `${(item.value / total) * 100}%` : '0%', backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${item.color} 15%, white)`, color: item.color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 font-mono leading-tight">{item.value} <span className="text-[10px] text-slate-400 font-bold">({pct}%)</span></p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
