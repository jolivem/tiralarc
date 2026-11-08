/** A painter's palette in colour (the "Colour" button of the Journal page). */
export function PaletteIcon({ size = 22, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={muted ? { opacity: 0.4 } : undefined}
    >
      <path
        d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25"
        fill="#e9c08a"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.6" cy="13.6" r="1.7" fill="#2f9e44" />
      <circle cx="8.3" cy="8.8" r="1.7" fill="#e03131" />
      <circle cx="12.9" cy="6.9" r="1.7" fill="#fcc419" />
      <circle cx="17" cy="10.2" r="1.7" fill="#1c7ed6" />
    </svg>
  );
}
