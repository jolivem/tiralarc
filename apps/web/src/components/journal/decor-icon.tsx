/** A picture with a spark, in colour (the decoration button of the Journal page). */
export function DecorIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M12 21h-6a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6l-9 9z"
        fill="#a5d8ff"
        stroke="none"
      />
      <path
        d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l3 3l1 -1c.47 -.452 .995 -.675 1.52 -.67c.8 .2 1.4 1 1.98 2.17l-6.5 6.5h-6a3 3 0 0 1 -3 -3z"
        fill="#69db7c"
        stroke="none"
      />
      <circle cx="15" cy="8" r="1.7" fill="#fcc419" stroke="none" />
      <path d="M12 21h-6a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6" fill="none" />
      <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l3.993 3.993" fill="none" />
      <path d="M14 14l1 -1c.47 -.452 .995 -.675 1.52 -.67" fill="none" />
      <path
        d="M19 22.5a4.75 4.75 0 0 1 3.5 -3.5a4.75 4.75 0 0 1 -3.5 -3.5a4.75 4.75 0 0 1 -3.5 3.5a4.75 4.75 0 0 1 3.5 3.5"
        fill="#ffa94d"
      />
    </svg>
  );
}
