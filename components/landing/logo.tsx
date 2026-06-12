export function LogoMark({ className }: { className?: string }) {
  const gradId = "bb-logo-grad"
  const lensId = "bb-logo-lens"
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="20" y1="18" x2="82" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b9dff" />
          <stop offset="0.55" stopColor="#1f6fe5" />
          <stop offset="1" stopColor="#1b3a8f" />
        </linearGradient>
        <linearGradient id={lensId} x1="26" y1="40" x2="52" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5fb0ff" />
          <stop offset="1" stopColor="#1f6fe5" />
        </linearGradient>
      </defs>

      {/* Antennae */}
      <g stroke="url(#bb-logo-grad)" strokeWidth="3.2" strokeLinecap="round">
        <path d="M40 34 C 36 26, 31 23, 28 21" fill="none" />
        <path d="M58 34 C 62 26, 67 23, 70 21" fill="none" />
      </g>
      <circle cx="26" cy="19.5" r="3.6" fill="none" stroke="url(#bb-logo-grad)" strokeWidth="3.2" />
      <circle cx="72" cy="19.5" r="3.6" fill="none" stroke="url(#bb-logo-grad)" strokeWidth="3.2" />

      {/* Bug head */}
      <circle cx="49" cy="38" r="13" fill="url(#bb-logo-grad)" />

      {/* Legs */}
      <g stroke="url(#bb-logo-grad)" strokeWidth="3" strokeLinecap="round">
        <path d="M30 48 H 20 L 16 44" fill="none" />
        <path d="M29 58 H 18 L 14 55" fill="none" />
        <path d="M30 68 H 20 L 16 71" fill="none" />
        <path d="M70 48 H 80 L 84 44" fill="none" />
        <path d="M71 58 H 82 L 86 55" fill="none" />
        <path d="M70 68 H 80 L 84 71" fill="none" />
      </g>

      {/* Shield body */}
      <path
        d="M50 32 L 76 41 V 60 C 76 76, 64 86, 50 92 C 36 86, 24 76, 24 60 V 41 Z"
        fill="url(#bb-logo-grad)"
      />

      {/* Magnifying glass */}
      <circle cx="42" cy="55" r="13" fill="url(#bb-logo-lens)" stroke="#0b2a66" strokeWidth="3" />
      <circle cx="46.5" cy="51" r="3.2" fill="#0b2a66" />
      <path d="M33 64 L 25 73" stroke="#0b2a66" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  )
}
