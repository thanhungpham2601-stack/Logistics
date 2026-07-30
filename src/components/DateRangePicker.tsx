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
}

const YMD = 'YYYY-MM-DD';

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

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const value: [Dayjs, Dayjs] = [dayjs(from, YMD), dayjs(to, YMD)];

  return (
    <RangePicker
      value={value}
      format="DD/MM/YYYY"
      allowClear={false}
      presets={PRESETS}
      onChange={(dates) => {
        if (!dates || !dates[0] || !dates[1]) return;
        onChange(dates[0].format(YMD), dates[1].format(YMD));
      }}
      className="!h-[38px] !rounded-lg"
    />
  );
}
