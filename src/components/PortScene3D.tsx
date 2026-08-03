import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PortScene3DProps {
  // Top hãng tàu theo sản lượng (đã tính sẵn ở DashboardOverview) - dùng để tô màu/số lượng
  // container mô phỏng, để khối 3D này không chỉ trang trí mà còn phản ánh dữ liệu thật.
  lineData: { name: string; value: number }[];
}

const PALETTE = ['#059669', '#2563eb', '#4f46e5', '#9333ea', '#0d9488', '#ea580c', '#e11d48', '#0891b2'];
const CONTAINER_SIZE: [number, number, number] = [0.95, 0.55, 0.62];
const COLS = 4;
const STEEL = '#94a3b8';
const SAFETY_YELLOW = '#fbbf24';

function readThemePrimary(): string {
  if (typeof document === 'undefined') return '#2563eb';
  const v = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
  return v || '#2563eb';
}

/** Texture chữ "AN GIA" vẽ bằng canvas 2D - dùng làm biển hiệu gắn trên cần cẩu. */
function useSignTexture(text: string) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = SAFETY_YELLOW;
      ctx.lineWidth = 10;
      ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 92px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '6px';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 6);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [text]);
}

function Crane({ color }: { color: string }) {
  const signTexture = useSignTexture('AN GIA');
  // Góc nghiêng của 2 thanh giằng chéo (X-brace) giữa 2 chân cẩu - tan(góc) = (chênh lệch Z) / (chênh lệch Y)
  const braceAngle = Math.atan2(2.4, 1.8);

  return (
    <group position={[-2.6, -0.75, 0]}>
      {/* 2 chân cẩu */}
      <mesh position={[0, 1.1, -1.2]} castShadow>
        <boxGeometry args={[0.22, 2.6, 0.22]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.1, 1.2]} castShadow>
        <boxGeometry args={[0.22, 2.6, 0.22]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Bánh ray dưới chân cẩu */}
      <mesh position={[0, -0.28, -1.2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.18, 12]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.28, 1.2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.18, 12]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Giằng ngang chân cẩu */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.16, 0.16, 2.5]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Giằng chéo (X-brace) - chi tiết giúp khung cẩu trông chắc chắn/thật hơn */}
      <mesh position={[0, 1.2, 0]} rotation={[braceAngle, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 3.0, 0.08]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.2, 0]} rotation={[-braceAngle, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 3.0, 0.08]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Biển hiệu "AN GIA" gắn trên giằng ngang, quay mặt ra phía bãi container */}
      <mesh position={[0.13, 1.65, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.1, 0.66]} />
        <meshBasicMaterial map={signTexture} toneMapped={false} />
      </mesh>
      {/* Cần cẩu (boom) vươn ra */}
      <mesh position={[2.1, 2.5, 0]} castShadow>
        <boxGeometry args={[4.6, 0.22, 0.22]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[0.22, 0.22, 2.6]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Xe con (trolley) + cáp + móc */}
      <mesh position={[3.4, 2.35, 0]} castShadow>
        <boxGeometry args={[0.35, 0.2, 0.35]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[3.4, 1.55, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.6, 6]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[3.4, 0.75, 0]} castShadow>
        <boxGeometry args={[0.3, 0.18, 0.3]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function ContainerStack({ lineData }: { lineData: { name: string; value: number }[] }) {
  const boxes = useMemo(() => {
    const total = lineData.reduce((s, l) => s + l.value, 0) || 1;
    const items: { color: string; label: string }[] = [];
    lineData.forEach((l, i) => {
      const share = l.value / total;
      const count = Math.max(1, Math.min(6, Math.round(share * 14)));
      for (let n = 0; n < count; n++) items.push({ color: PALETTE[i % PALETTE.length], label: l.name });
    });
    return items.slice(0, 16);
  }, [lineData]);

  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...CONTAINER_SIZE)), []);

  const [w, h, d] = CONTAINER_SIZE;
  const gapX = w + 0.08;
  const gapZ = d + 0.08;
  const gapY = h + 0.06;

  return (
    <group position={[0.6, -0.75, 0]}>
      {boxes.map((box, i) => {
        const col = i % COLS;
        const layer = Math.floor(i / (COLS * 2));
        const row = Math.floor(i / COLS) % 2;
        const pos: [number, number, number] = [
          col * gapX - (gapX * (COLS - 1)) / 2,
          h / 2 + layer * gapY + 0.02,
          row * gapZ - gapZ / 2,
        ];
        return (
          <group key={i} position={pos}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={CONTAINER_SIZE} />
              <meshStandardMaterial color={box.color} roughness={0.4} metalness={0.25} />
            </mesh>
            {/* Viền nét đen mảnh giúp từng container tách bạch, đỡ trông như 1 khối màu phẳng */}
            <lineSegments geometry={edgesGeometry}>
              <lineBasicMaterial color="#111827" transparent opacity={0.35} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}

/** Easing nhẹ (smoothstep) cho chuyển động ra/vào và nâng/hạ mượt hơn tuyến tính thuần. */
function ease(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

const FORKLIFT_Z = 1.55;
const FORKLIFT_OUTER_X = 6.9; // vị trí "ngoài cổng bãi" - xe xuất hiện/biến mất ở đây
const FORKLIFT_STACK_X = 3.3; // vị trí dừng lại để chất hàng, sát mép đống container
const FORKLIFT_CARRY_Y = 0.55; // độ cao càng nâng khi đang chạy (hạ thấp cho vững, đúng thực tế)
const FORKLIFT_CLEAR_Y = 1.85; // độ cao nâng lên để vượt qua đỉnh đống hàng hiện có
const FORKLIFT_PLACE_Y = 1.28; // độ cao đặt xuống - ngay trên đỉnh đống 2 lớp hiện tại, như đang xếp thêm lớp mới

/** Xe nâng chạy từ ngoài bãi vào, chất 1 container lên đỉnh đống hàng rồi lùi ra - lặp vòng liên tục. */
function Forklift({ liftedColor }: { liftedColor: string }) {
  const vehicleRef = useRef<THREE.Group>(null);
  const forksRef = useRef<THREE.Group>(null);
  const liftedRef = useRef<THREE.Mesh>(null);
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...CONTAINER_SIZE)), []);

  useFrame(({ clock }) => {
    const CYCLE = 10; // giây / vòng lặp
    const t = (clock.elapsedTime % CYCLE) / CYCLE;

    let x = FORKLIFT_STACK_X;
    let forkY = FORKLIFT_CARRY_Y;
    let liftedVisible = true;

    if (t < 0.4) {
      // Chạy vào từ ngoài, mang theo container ở độ cao di chuyển
      x = FORKLIFT_OUTER_X + (FORKLIFT_STACK_X - FORKLIFT_OUTER_X) * ease(t / 0.4);
      forkY = FORKLIFT_CARRY_Y;
      liftedVisible = true;
    } else if (t < 0.5) {
      // Nâng lên để vượt qua đỉnh đống hàng hiện tại
      forkY = FORKLIFT_CARRY_Y + (FORKLIFT_CLEAR_Y - FORKLIFT_CARRY_Y) * ease((t - 0.4) / 0.1);
      liftedVisible = true;
    } else if (t < 0.62) {
      // Hạ xuống đặt lên đỉnh đống hàng
      forkY = FORKLIFT_CLEAR_Y + (FORKLIFT_PLACE_Y - FORKLIFT_CLEAR_Y) * ease((t - 0.5) / 0.12);
      liftedVisible = true;
    } else if (t < 0.68) {
      // Dừng lại - vừa đặt xong
      forkY = FORKLIFT_PLACE_Y;
      liftedVisible = true;
    } else if (t < 0.7) {
      // Nhả hàng
      forkY = FORKLIFT_PLACE_Y;
      liftedVisible = false;
    } else if (t < 0.8) {
      // Rút càng rỗng lên lại
      forkY = FORKLIFT_PLACE_Y + (FORKLIFT_CARRY_Y - FORKLIFT_PLACE_Y) * ease((t - 0.7) / 0.1);
      liftedVisible = false;
    } else {
      // Lùi/chạy ngược ra ngoài, càng rỗng
      x = FORKLIFT_STACK_X + (FORKLIFT_OUTER_X - FORKLIFT_STACK_X) * ease((t - 0.8) / 0.2);
      forkY = FORKLIFT_CARRY_Y;
      liftedVisible = false;
    }

    if (vehicleRef.current) vehicleRef.current.position.x = x;
    if (forksRef.current) forksRef.current.position.y = forkY;
    if (liftedRef.current) liftedRef.current.visible = liftedVisible;
  });

  return (
    <group ref={vehicleRef} position={[FORKLIFT_STACK_X, -0.75, FORKLIFT_Z]}>
      {/* Bánh xe */}
      {[
        [0.35, 0.28],
        [0.35, -0.28],
        [-0.35, 0.28],
        [-0.35, -0.28],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.14, 14]} />
          <meshStandardMaterial color="#111827" roughness={0.7} />
        </mesh>
      ))}
      {/* Thân xe */}
      <mesh position={[0.1, 0.43, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.5, 0.65]} />
        <meshStandardMaterial color="#f97316" roughness={0.45} metalness={0.2} />
      </mesh>
      {/* Ca-bin */}
      <mesh position={[0.32, 0.8, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Khung nâng (mast) cố định phía trước xe */}
      <mesh position={[-0.5, 1.1, 0.22]} castShadow>
        <boxGeometry args={[0.06, 2.1, 0.06]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[-0.5, 1.1, -0.22]} castShadow>
        <boxGeometry args={[0.06, 2.1, 0.06]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Càng nâng + container - trượt lên xuống dọc khung nâng */}
      <group ref={forksRef} position={[-0.5, FORKLIFT_CARRY_Y, 0]}>
        <mesh position={[-0.35, 0, 0.2]} castShadow>
          <boxGeometry args={[0.7, 0.06, 0.1]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[-0.35, 0, -0.2]} castShadow>
          <boxGeometry args={[0.7, 0.06, 0.1]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh ref={liftedRef} position={[-0.6, CONTAINER_SIZE[1] / 2 + 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={CONTAINER_SIZE} />
          <meshStandardMaterial color={liftedColor} roughness={0.4} metalness={0.25} />
        </mesh>
        <lineSegments position={[-0.6, CONTAINER_SIZE[1] / 2 + 0.05, 0]} geometry={edgesGeometry}>
          <lineBasicMaterial color="#111827" transparent opacity={0.35} />
        </lineSegments>
      </group>
    </group>
  );
}

function Dock({ craneColor, lineData }: { craneColor: string; lineData: { name: string; value: number }[] }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.18;
  });

  return (
    <group ref={group}>
      {/* Nền bến cảng */}
      <mesh position={[0, -1.05, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.3, 4]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.95} />
      </mesh>
      {/* Viền sơn an toàn màu vàng quanh mép bãi - chi tiết đặc trưng của cảng/bãi container */}
      <mesh position={[0, -0.897, -1.9]}>
        <boxGeometry args={[7.0, 0.02, 0.12]} />
        <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.897, 1.9]}>
        <boxGeometry args={[7.0, 0.02, 0.12]} />
        <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.7} />
      </mesh>
      <mesh position={[-3.44, -0.897, 0]}>
        <boxGeometry args={[0.12, 0.02, 3.9]} />
        <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.7} />
      </mesh>
      <mesh position={[3.44, -0.897, 0]}>
        <boxGeometry args={[0.12, 0.02, 3.9]} />
        <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.7} />
      </mesh>
      <Crane color={craneColor} />
      <ContainerStack lineData={lineData} />
      <Forklift liftedColor={PALETTE[0]} />
    </group>
  );
}

export default function PortScene3D({ lineData }: PortScene3DProps) {
  const craneColor = useMemo(() => readThemePrimary(), []);
  const safeLineData = lineData.length > 0 ? lineData : [{ name: 'Chưa có dữ liệu', value: 1 }];

  return (
    <Canvas
      shadows
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [6.5, 3.6, 7.5], fov: 38 }}
      dpr={[1, 1.75]}
    >
      <fog attach="fog" args={['#e2e8f0', 9, 22]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={0.95}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-bias={-0.0015}
      />
      <directionalLight position={[-4, 3, -5]} intensity={0.25} color="#93c5fd" />
      <Dock craneColor={craneColor} lineData={safeLineData} />
    </Canvas>
  );
}
