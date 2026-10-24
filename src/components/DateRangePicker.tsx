import React from 'react';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/vi';

dayjs.extend(isoWeek);
dayjs.locale('vi');

const { RangePicker } = DatePicker;

interface DateRangePickerProps {
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
  onChange: (from: string, to: string) => void;
  // Bật để chọn thêm giờ:phút ngay trong cùng 1 popup lịch (thay vì phải mở thêm ô giờ riêng bên
  // ngoài) - dùng cho báo cáo cần mốc giờ chính xác (vd đối soát theo đúng "06h30 ngày X"). Chỉ
  // hiện giờ:phút (không có giây) theo đúng yêu cầu.
  showTime?: boolean;
  fromTime?: string; // "HH:mm"
  toTime?: string; // "HH:mm"
  onTimeChange?: (fromTime: string, toTime: string) => void;
}

const YMD = 'YYYY-MM-DD';
const HM = 'HH:mm';

const PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: 'Hôm nay', value: [dayjs(), dayjs()] },
  { label: 'Hôm qua', value: [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
  { label: 'Tuần này', value: [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')] },
  { label: 'Tuần trước', value: [dayjs().subtract(1, 'week').startOf('isoWeek'), dayjs().subtract(1, 'week').endOf('isoWeek')] },
  { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { label: 'Năm này', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
  { label: 'Năm trước', value: [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')] },
];

export default function DateRangePicker({ from, to, onChange, showTime, fromTime, toTime, onTimeChange }: DateRangePickerProps) {
  const value: [Dayjs, Dayjs] = showTime
    ? [dayjs(`${from}T${fromTime ?? '00:00'}`), dayjs(`${to}T${toTime ?? '23:59'}`)]
    : [dayjs(from, YMD), dayjs(to, YMD)];

  return (
    <RangePicker
      value={value}
      format={showTime ? `DD/MM/YYYY ${HM}` : 'DD/MM/YYYY'}
      showTime={showTime ? { format: HM } : undefined}
      allowClear={false}
      presets={PRESETS}
      onChange={(dates) => {
        if (!dates || !dates[0] || !dates[1]) return;
        onChange(dates[0].format(YMD), dates[1].format(YMD));
        if (showTime) onTimeChange?.(dates[0].format(HM), dates[1].format(HM));
      }}
      className="!h-[38px] !rounded-lg"
    />
  );
}
