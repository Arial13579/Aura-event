import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
const SIZE = 512;
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3fd6c9 0%, #0fb5ae 50%, #0a93a6 100%)' }}>
        <div style={{ display: 'flex', position: 'relative', width: SIZE * 0.62, height: SIZE * 0.42 }}>
          <div style={{ position: 'absolute', right: 0, top: 0, width: SIZE * 0.42, height: SIZE * 0.42, borderRadius: '50%', border: `${SIZE * 0.05}px solid #ffffff` }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: SIZE * 0.42, height: SIZE * 0.42, borderRadius: '50%', border: `${SIZE * 0.05}px solid #ffffff` }} />
        </div>
      </div>
    ),
    size,
  );
}
