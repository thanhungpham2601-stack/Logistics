import React from 'react';

// Đường bờ biển Việt Nam lấy từ dữ liệu địa lý thật (Natural Earth 1:50m, chiếu Mercator, quy về
// hệ toạ độ SVG cục bộ) chứ không phải hình cách điệu - đảm bảo đúng dáng chữ S ngoài đời.
const VN_PATH =
  'M236.9,83L235,83.3L230.3,83.4L226.3,87.3L223.5,89L219.2,90.3L214.4,92.5L213.2,96.4L213,99.2L212.3,102.3' +
  'L204.7,106.8L202.6,106.3L201.1,104.6L199,105L197.4,105.8L195.7,105.7L193.7,106.7L191.1,106.4L188.7,105' +
  'L187.3,104.6L185.5,104.6L185.3,106.3L187.7,112.8L188.4,115.9L180.4,124.7L181.3,130.4L179.1,134.8L174.2,138.3' +
  'L165.1,147.3L160.9,147.6L157.8,149.6L151.1,164.4L150.9,169.6L149.9,173.2L150.2,176.8L147.2,183.8L144.1,186.8' +
  'L143.5,190.6L147.8,198.5L148.4,199.8L150.8,204.1L152.1,207.1L154.1,210L161.1,217.8L164.2,220.2L168,221.9' +
  'L174.8,228.8L178.3,233.3L176.7,236.3L177.5,242.8L172.5,240.9L173.2,241.7L179,245.2L187.7,257.4L195.3,263.5' +
  'L203,270.4L205.4,277L212.3,281.3L220,287.6L219.7,289L221.7,290.7L227,294L230.2,297.5L231.3,300.8L233.2,301.3' +
  'L235.5,300.5L237.6,300.3L239,300.5L241.5,304.1L244.6,307.4L246.2,310.4L247.5,310L248.5,310.5L248.8,313' +
  'L249.3,314.6L253.6,319.4L255.6,323.9L260.9,331.3L264.6,335.5L267.5,337.8L270.5,339.8L273.7,348L275.2,355.4' +
  'L278.5,363.5L281.1,367.1L281.1,373.8L283.1,380.7L285.2,385.4L286,390.1L286.5,392.5L287.4,394.3L289.7,402.4' +
  'L289.1,406.1L287.5,402.4L287.7,413.2L289.1,418.9L288.4,425.9L290,428.4L292.7,436.3L294.5,439.1L294.4,448.8' +
  'L295.4,453.7L292.8,450.8L291,447.4L288.5,449.2L286.4,451.8L289.8,462.1L285.8,461.1L286.2,475.1L287.8,478.3' +
  'L288,479.8L287.5,481.8L286.4,479.7L286.2,477.6L285.5,478L285.7,479.1L284.2,481.6L284,484.6L285.2,487.2' +
  'L285.5,489.2L284.5,491.6L283,494.2L279.2,494.6L278.4,499.6L277.1,504.9L270.5,505.8L265.8,510.5L259.8,512.2' +
  'L254.5,516.9L248.8,521.2L244.9,521.8L241.8,522.7L238,529.9L231.7,530.7L220.6,536.5L216.9,539.3L213.4,540.5' +
  'L208.6,542.9L207.6,542L205.9,539.9L201.7,538.8L199.6,536.5L199,533.5L198.4,532.3L197.6,534L196.8,541.2' +
  'L196.1,542.8L194.3,543.5L190.7,541.4L187.4,537.3L182.5,540.2L184,540.5L186.3,540.3L188,541L189.4,543.8' +
  'L189.3,545.3L188.5,547.1L184,547.3L178,546.7L177,546.9L182.4,549.6L187.4,551.2L189.7,552.9L189.7,554.3' +
  'L186.8,556.5L184.7,559.3L184.5,561.1L184.5,563L182.1,564.6L180.5,564.3L176.2,561.4L164,550L165.8,553.2' +
  'L178.7,566.2L180.8,570.4L181.3,573.5L179.8,574.9L177.7,576.7L173.5,576.9L166.5,572.1L155.5,560.5L151.8,559' +
  'L163,572.1L164.8,575.3L166.7,579.1L166.1,581.2L165.1,583.3L138.6,595.5L134.6,600.8L131.5,607.3L126.3,610.8' +
  'L123.3,614.2L114.5,616L109.6,615.4L114.6,609.4L111.5,607.2L111.3,591.8L112.6,574.9L114.9,566.4L118.2,564.3' +
  'L122.5,563L122.5,561.2L122,559.1L119.9,556.2L117.3,554.9L113.7,554.3L110.9,550.8L108.7,550.9L105.3,552.1' +
  'L103.3,550.6L102.6,548.2L99.4,545.2L96,542.4L97.6,541.9L99.4,540.3L101.4,538.1L106.4,537.9L111.5,537.9' +
  'L112.7,537.4L114.7,535.1L118,532.3L120.6,530.6L121.2,529.3L120.2,526.3L119.6,523.1L120.6,522.1L125,522.7' +
  'L130,524.2L131.2,524.8L134.1,521L134.9,520.5L136.8,520.5L141.6,519.8L146.5,518.8L148.8,519L151,521.6' +
  'L152.6,524.1L153.5,524.2L155.9,523.2L158.1,524.5L162.4,526.8L165,526.8L163.7,521.7L165.1,518.1L164.8,517.1' +
  'L162.4,515.4L154.2,508.6L152.8,506.6L152.9,503.4L152.6,498.8L151.9,495.9L152.1,494.2L152.5,492.8L154.1,492.3' +
  'L155.5,492.1L156.7,490.9L158.7,487.8L162.5,488.1L168,489.9L172,490.9L174.4,490.7L174.8,490.3L174.8,488.7' +
  'L175.1,481.6L175,480.1L178.3,479.4L183.5,479.3L186.3,478.9L188.8,475.9L195.4,474.8L200.3,470.9L204.6,466.7' +
  'L206.6,465.7L209.3,465L211.3,465L213.9,467.4L215.9,466L218.3,463.2L219.6,460.4L220.3,456.1L219.7,449.3' +
  'L218.6,444L217.3,440L217,436L219.9,428.1L222.3,419.5L221.7,415.99L219.2,410.6L216.6,404L213.7,396.7' +
  'L212.6,395.7L211.9,393.6L211.3,391.3L212.6,383.9L212.7,381.3L216,378L217.7,374L219.4,369.8L218.9,367.6' +
  'L218.6,362.9L219,360.7L218.3,358.8L217.3,356.2L217.9,354.5L220.3,353.1L221.6,350.6L223.3,347.6L224.2,344.9' +
  'L222.9,342.6L220.6,339.3L216.4,336.2L211.7,332.3L209.3,329.9L207.4,327.5L205.7,324.6L204.9,322.4L205.7,320.9' +
  'L212.6,317.4L213.7,316.2L214.4,314.3L214,312.4L212.2,311.4L210,310.7L206.9,308.5L201,302.6L198.3,301.3' +
  'L195.4,299.5L194,297.7L192.3,292.9L191.6,292.4L190,293.9L187.8,295.4L186.1,295.2L184.5,293.8L183.8,291.9' +
  'L182.1,289.3L180.1,287.2L179.7,280.2L179.4,277.9L178.4,274.6L177,273.5L175.4,272.6L171.7,266.8L169.2,263.7' +
  'L158.7,255.5L157.4,254.1L154.6,250.7L149.6,246L146.2,242L143.6,238L142.5,234.5L142.1,231.7L139.3,227.8' +
  'L136.9,224.6L134.6,223.6L132,223.1L129.6,221.2L125.2,216.9L123.3,214.1L122.2,212.2L122.2,210.3L123.2,207.1' +
  'L124.5,205.2L124.6,203.8L123.3,202.7L118.5,200.6L107.4,197.4L103.3,195L99.6,192L96.7,189.9L83.3,181' +
  'L79.3,179.5L75.7,177.9L74.7,176.4L74.8,174.9L76.3,173.8L80.1,171.5L81.6,168.9L81,165.5L79.6,161.9L80.3,160.8' +
  'L81.6,160.6L84,160.5L89.3,160.3L100.7,163.5L102.3,163.1L108.6,157.4L110.9,153.9L111.5,151.1L112.6,149.3' +
  'L115.9,146.2L115.9,143.5L114.3,139.9L112.7,138.5L111.3,137.9L106.7,138.3L105.9,137.5L105.3,134.8L105,133.1' +
  'L103.6,131.2L98.7,129.5L94.6,129L93.6,128.3L95.1,126.5L98,124.6L100.2,123.5L101.9,121.6L102.2,119.6' +
  'L100,117.8L97.3,115.9L92.9,112.2L86.7,108.3L83,106.9L81.1,107.1L74.3,110.5L70.7,112.7L67.7,116.7L64.5,117.5' +
  'L61.2,115.8L57.7,113.9L47.7,111.4L43.4,109.2L34.6,96L33.4,93.2L34.2,90.2L34.8,85.8L35.6,83L37.2,80.3' +
  'L37.6,77.9L37.2,75.5L35.9,74.2L34.4,73.8L33.1,73.2L31.9,70.2L31.2,70.6L30.2,74.3L28.9,75.7L27.2,76.4' +
  'L25.8,75.8L25.1,74.3L24.6,71.7L23.8,68.3L22.6,66L18.9,63.7L17.2,60.7L11.5,54.3L6.7,49.7L4.6,45.6L6.5,44.1' +
  'L8.9,41.9L11.6,38.5L14.5,34.1L15.6,31.5L16.5,30.4L18.2,29.6L20.1,30.1L23.3,31.8L28.2,34L32.5,36.7L34.2,39.4' +
  'L36.6,41.9L38.5,42.6L39.5,42.5L42.2,40.5L44.7,38.6L44.8,36.4L46.9,34.5L49.8,31.3L51.2,29L52.2,28.8' +
  'L53.4,29.5L58,36.2L58.8,36.7L60.1,35.6L62,30.4L64,28.3L64.5,28.8L75.5,38.8L76.7,38.7L77.8,38.2L78.7,36.7' +
  'L79.6,33.3L81.1,29.6L84.7,27.5L87.4,27.1L88.4,28.9L90.9,31.3L93.7,31.7L99.9,27.3L102,26.6L104.2,26.7' +
  'L106.3,26.6L108.4,24.9L110.6,22.8L111.3,18.4L111.9,14.6L113.3,13L115.2,12L118.6,10.5L126.2,6.8L128.2,5' +
  'L129.6,4L132.6,5.6L136.2,8.7L138.3,11.1L139.8,13.6L140.5,15.8L146.2,17.6L149.8,20.2L152.2,22.2L154.6,22.2' +
  'L156.9,21.6L158.5,20L161.2,20L164.4,20.2L165.8,20.8L168.4,24.5L169.5,25.1L172,24.8L176.4,23.5L180,22.8' +
  'L183.3,24.3L189.4,28.4L187.7,31.4L186.4,34.5L183.7,36.7L181.5,37.3L180.4,40.4L179.8,44.9L180.4,47.3' +
  'L182,48L183.7,49.5L184.4,51.5L184.7,56.1L184.5,61.1L184.8,62.8L186.1,62.5L187.4,61.9L190,62.7L193.3,64' +
  'L195.3,65.4L197,65.1L198.4,66.5L199,69L200.7,70.7L205.3,74L209,74.3L212.1,78.7L215.4,77.2L216.9,79.1' +
  'L223.6,78.4L228.3,76.6L230,77.1L234.3,80.7Z';

// Đảo Phú Quốc, ngoài khơi Hà Tiên (Kiên Giang) - hình dáng thật, cùng hệ toạ độ với đất liền.
const PHU_QUOC_PATH =
  'M81.6,543.2L82.3,545.2L82,549.9L80.4,554.5L81,556.5L79.7,557.8L77.1,549.2L73.7,545.4L73,544' +
  'L75,544.1L78.4,541.7L80.1,541.7Z';

// Cụm chấm cách điệu cho quần đảo Hoàng Sa, đặt trong khung chú thích bên phải bản đồ (vị trí thật
// cách xa đất liền hàng trăm km nên được minh hoạ dạng khung riêng như thông lệ bản đồ hành chính).
const HOANG_SA_DOTS: [number, number][] = [
  [345, 288], [361, 282], [353, 298], [371, 292], [363, 308], [343, 305], [355, 318], [375, 310],
];

// Cụm chấm cách điệu cho quần đảo Trường Sa, đặt trong khung chú thích bên phải bản đồ, rải rác
// trên vùng biển rộng hơn Hoàng Sa như thực tế.
const TRUONG_SA_DOTS: [number, number][] = [
  [335, 460], [353, 470], [329, 482], [365, 474], [344, 490], [375, 484],
  [327, 500], [359, 510], [337, 520], [380, 464], [322, 492],
];

// Trục "đường bay/đường vận chuyển" nét đứt nối ba thành phố lớn, đi qua đúng vị trí đã chiếu thật.
const SPINE_PATH =
  'M152.7,103.4 C 195,190 175,250 246,311.9 C 275,370 260,430 285.5,468.3 C 255,500 205,510 183.5,525.7';

// Vài "tuyến vận chuyển" cách điệu chạy dọc bờ biển thật, gợi luồng container ra/vào cảng.
const ROUTES = [
  'M60 90 C 100 160 90 260 160 330 C 210 380 200 470 180 540',
  'M230 60 C 190 150 220 260 170 340 C 130 410 150 500 110 590',
  'M20 300 C 90 270 170 290 250 340',
];

interface CityMarkerProps {
  x: number;
  y: number;
  label: string;
  labelDx?: number;
  labelDy?: number;
  anchor?: 'start' | 'middle' | 'end';
}

function CityMarker({ x, y, label, labelDx = 8, labelDy = 3, anchor = 'start' }: CityMarkerProps) {
  return (
    <g>
      <circle cx={x} cy={y} r="4" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6">
        <animate attributeName="r" values="4;10;4" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r="2.6" fill="#7dd3fc" stroke="#0b1220" strokeWidth="1" />
      <text
        x={x + labelDx}
        y={y + labelDy}
        fontSize="7.5"
        fontWeight="800"
        fill="#bae6fd"
        textAnchor={anchor}
        letterSpacing="0.4"
      >
        {label}
      </text>
    </g>
  );
}

function HubDot({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="3.4" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.55">
        <animate attributeName="r" values="3;7;3" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;0;0.55" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y} r="2" fill="#7dd3fc" stroke="#0b1220" strokeWidth="0.8" />
    </g>
  );
}

function SecondaryDot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r="1.6" fill="#e2e8f0" opacity="0.85" />;
}

interface IslandCalloutProps {
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  title: string;
  subtitle: string;
  dots: [number, number][];
  dotClassName: string;
  connectFrom: [number, number];
  connectTo: [number, number];
}

function IslandCallout({
  boxX,
  boxY,
  boxWidth,
  boxHeight,
  title,
  subtitle,
  dots,
  dotClassName,
  connectFrom,
  connectTo,
}: IslandCalloutProps) {
  return (
    <g>
      <path
        d={`M${connectFrom[0]} ${connectFrom[1]} L${connectTo[0]} ${connectTo[1]}`}
        stroke="#64748b"
        strokeWidth="0.8"
        strokeDasharray="2.5 3"
        fill="none"
      />
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx="2"
        fill="#0b1220"
        fillOpacity="0.35"
        stroke="#475569"
        strokeWidth="0.9"
        strokeDasharray="3 2.5"
      />
      <text
        x={boxX + boxWidth / 2}
        y={boxY - 6}
        fontSize="7"
        fontWeight="800"
        fill="#7dd3fc"
        textAnchor="middle"
        letterSpacing="0.3"
      >
        {title}
      </text>
      <text
        x={boxX + boxWidth / 2}
        y={boxY + 8}
        fontSize="5"
        fontWeight="600"
        fill="#64748b"
        textAnchor="middle"
        letterSpacing="0.3"
      >
        {subtitle}
      </text>
      <g className={dotClassName} fill="currentColor">
        {dots.map(([x, y]) => (
          <circle key={`${title}-${x}-${y}`} cx={x} cy={y} r="1.6" />
        ))}
      </g>
    </g>
  );
}

interface VietnamMapBackgroundProps {
  className?: string;
}

export default function VietnamMapBackground({ className = '' }: VietnamMapBackgroundProps) {
  return (
    <svg
      viewBox="-10 -10 420 640"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="vn-shape-clip">
          <path d={VN_PATH} />
        </clipPath>
        <pattern id="vn-dot-pattern" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="1.1" cy="1.1" r="1.1" fill="currentColor" />
        </pattern>
        <linearGradient id="vn-route-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
          <stop offset="45%" stopColor="#60a5fa" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
        {/* Đổ bóng bên trong để bản đồ trông "chìm" xuống nền thay vì nổi phẳng lì */}
        <filter id="vn-inset-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feComponentTransfer in="SourceAlpha">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="9" />
          <feOffset dx="0" dy="7" result="offsetblur" />
          <feFlood floodColor="#000000" floodOpacity="0.7" />
          <feComposite in2="offsetblur" operator="in" />
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>
      </defs>

      {/* Đất liền hình chữ S */}
      <g className="vn-map-glow">
        <path d={VN_PATH} fill="#0b1220" filter="url(#vn-inset-shadow)" />
        <path d={VN_PATH} fill="none" stroke="#1e293b" strokeWidth="1.5" />
      </g>

      <g clipPath="url(#vn-shape-clip)" className="text-slate-500/70">
        <rect x="-10" y="-10" width="420" height="640" fill="url(#vn-dot-pattern)" />
      </g>

      {/* Đảo Phú Quốc */}
      <g className="vn-map-glow">
        <path d={PHU_QUOC_PATH} fill="#0b1220" stroke="#1e293b" strokeWidth="1" />
        <text x="78" y="569" fontSize="6.5" fontWeight="700" fill="#64748b" textAnchor="middle" letterSpacing="0.3">
          PHÚ QUỐC
        </text>
      </g>

      {ROUTES.map((d, i) => (
        <g key={d}>
          <path
            d={d}
            fill="none"
            stroke="url(#vn-route-grad)"
            strokeWidth="1.5"
            strokeDasharray="5 11"
            className="vn-route-line"
            style={{ animationDelay: `${i * 1.4}s` }}
          />
          <circle r="2.4" fill="#93c5fd">
            <animateMotion dur="7s" repeatCount="indefinite" begin={`${i * 1.4}s`} path={d} />
          </circle>
        </g>
      ))}

      {/* Trục nét đứt nối Hà Nội - Đà Nẵng - TP.HCM */}
      <path d={SPINE_PATH} fill="none" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 3.5" opacity="0.85" />

      {/* Điểm trung chuyển không tên dọc theo trục (Quy Nhơn, Nha Trang) */}
      <HubDot x={286.4} y={405.6} />
      <HubDot x={285.5} y={468.3} />

      {/* Chấm phụ cạnh các thành phố lớn (Hải Phòng, Vũng Tàu, Cần Thơ) */}
      <SecondaryDot x={185.8} y={111.2} />
      <SecondaryDot x={201.5} y={545} />
      <SecondaryDot x={148.4} y={557.1} />

      {/* Ba thành phố lớn */}
      <CityMarker x={152.7} y={103.4} label="HÀ NỘI" />
      <CityMarker x={246} y={311.9} label="ĐÀ NẴNG" />
      <CityMarker x={183.5} y={525.7} label="TP.HCM" />

      <IslandCallout
        boxX={325}
        boxY={260}
        boxWidth={75}
        boxHeight={72}
        title="QUẦN ĐẢO HOÀNG SA"
        subtitle="TP. ĐÀ NẴNG"
        dots={HOANG_SA_DOTS}
        dotClassName="text-blue-300/70"
        connectFrom={[246, 311.9]}
        connectTo={[325, 296]}
      />

      <IslandCallout
        boxX={310}
        boxY={445}
        boxWidth={85}
        boxHeight={90}
        title="QUẦN ĐẢO TRƯỜNG SA"
        subtitle="TỈNH KHÁNH HOÀ"
        dots={TRUONG_SA_DOTS}
        dotClassName="text-emerald-300/70"
        connectFrom={[285.5, 468.3]}
        connectTo={[310, 480]}
      />
    </svg>
  );
}
