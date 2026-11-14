/**
 * The site's logo: a closed leather notebook with an archery target on its cover and a
 * bookmark ending in fletching. Same drawing as the browser tab's icon (`app/icon.svg`).
 */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M17 24h4.4v7.2l-2.2-2-2.2 2z" fill="#b23a2e" />
      <rect x="6" y="2" width="20" height="25" rx="2.2" fill="#7a5539" />
      <rect x="6" y="2" width="3.2" height="25" rx="1.2" fill="#523825" />
      <rect x="22.2" y="2" width="1.4" height="25" fill="#3f2817" />
      <circle cx="15.6" cy="13.5" r="6.3" fill="#ffffff" />
      <circle cx="15.6" cy="13.5" r="5.1" fill="#1f1f1f" />
      <circle cx="15.6" cy="13.5" r="3.9" fill="#2f7fd1" />
      <circle cx="15.6" cy="13.5" r="2.7" fill="#d63a2f" />
      <circle cx="15.6" cy="13.5" r="1.5" fill="#f5c518" />
    </svg>
  );
}
