export function StarlingMark({
  size = 22,
}: {
  size?: number;
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
    >
      <title>Starling Data logo</title>
      {/* Body: plump, rounded torso with tail sweeping down-right */}
      <path
        d="M6.2 13.4
           C 5.8 10.6, 7.8 8.2, 10.6 7.8
           C 12.0 7.6, 13.2 7.9, 14.2 8.5
           L 17.6 7.6
           L 15.2 9.8
           C 16.1 10.8, 16.5 12.0, 16.3 13.3
           C 16.0 15.3, 14.3 16.8, 12.1 17.2
           L 13.6 19.6
           L 10.9 18.2
           L 8.0 18.4
           C 6.8 17.3, 6.3 15.5, 6.2 13.4 Z"
        fill="#2d4a35"
      />
      {/* Wing highlight: sage accent folded along the back */}
      <path
        d="M8.6 11.2
           C 9.8 10.3, 11.4 10.0, 12.9 10.4
           C 13.7 11.4, 13.6 12.9, 12.6 13.9
           C 11.2 15.1, 9.4 15.1, 8.2 14.0
           C 7.9 13.0, 8.1 11.9, 8.6 11.2 Z"
        fill="#9cc9a9"
      />
      {/* Beak: short sharp triangle pointing forward */}
      <path
        d="M14.2 8.5 L 18.4 8.0 L 15.2 9.8 Z"
        fill="#2d4a35"
      />
      {/* Eye: small dot on the head */}
      <circle cx="13.2" cy="9.2" r="0.55" fill="#ffffff" />
      {/* Leg */}
      <path
        d="M10.2 18.3 L 10.2 20.2"
        stroke="#2d4a35"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M11.8 18.3 L 11.8 20.2"
        stroke="#2d4a35"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
