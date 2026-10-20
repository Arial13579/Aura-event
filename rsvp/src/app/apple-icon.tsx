import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f3dc9a 0%, #d9b45a 45%, #a9843f 100%)', color: '#1a1408', fontSize: 110, fontWeight: 800 }}>
        A
      </div>
    ),
    size,
  );
}
