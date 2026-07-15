export function LibraixLogoMark({ size = 32 }: { size?: number }) {
  const gid = `libraix-lux-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8d5b5" />
          <stop offset="0.55" stopColor="#c4a574" />
          <stop offset="1" stopColor="#8a7350" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="14" fill={`url(#${gid})`} />
      <path
        d="M24 13v22M15 19h18M15 29h18"
        stroke="#1a1612"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
