/**
 * Editorial knowledge graph for landing (and reusable in /demo).
 * Minimal, dark, monochrome (#0b172a). Organic nodes, curved edges, asymmetric composition.
 * No labels, no chrome. ViewBox 0 0 400 400, transparent background.
 */
const NAVY = '#0b172a';

export default function LandingGraphEditorial({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      className={className}
      fill="none"
      aria-hidden
    >
      {/* Edges first (so they sit under nodes). Quadratic bezier, round linecap, stop short of nodes. One primary (thick), others thin. */}
      <path
        d="M 159 152 Q 118 122 97 104"
        stroke={NAVY}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M 242 217 Q 268 238 296 259"
        stroke={NAVY}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M 168 226 Q 138 266 116 297"
        stroke={NAVY}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Satellite nodes — organic blobs, solid fill, asymmetric placement */}
      <path
        d="M 99.2 97 C 99.2 103.2 94.4 108.2 88.2 108.4 C 82 108.6 77 103.8 76.8 98 C 76.6 92.2 81.2 87.2 87.4 87 C 93.6 86.8 99 92.4 99.2 97 Z"
        fill={NAVY}
      />
      <path
        d="M 317.8 267.5 C 317.8 273.2 313.2 278 308 278.2 C 302.8 278.4 298 273.6 297.8 267.8 C 297.6 262 302.2 257 307.4 256.8 C 312.6 256.6 317.6 261.4 317.8 267.5 Z"
        fill={NAVY}
      />
      <path
        d="M 115.6 307.8 C 115.6 312.4 112.2 316.2 108 316.4 C 103.8 316.6 100.2 312.8 100 308.2 C 99.8 303.6 103.2 299.6 107.4 299.4 C 111.6 299.2 115.4 303.2 115.6 307.8 Z"
        fill={NAVY}
      />

      {/* Central node — concentric: outer dark (organic blob), inner white ring, inner-inner dark, white dot */}
      <path
        d="M 254 186 C 254 211 229 233 199 234 C 169 234 146 210 145 184 C 144 159 168 137 200 136 C 231 135 255 160 254 186 Z"
        fill={NAVY}
      />
      <path
        d="M 229 185 C 229 200 215 211 200 212 C 185 212 171 199 170 184 C 169 170 184 158 200 158 C 215 158 230 171 229 185 Z"
        fill="white"
      />
      <path
        d="M 215 185 C 215 192 208 198 200 199 C 192 199 185 192 184 185 C 183 178 191 172 200 171 C 208 171 216 178 215 185 Z"
        fill={NAVY}
      />
      <circle cx="200" cy="185" r="5" fill="white" />
    </svg>
  );
}
