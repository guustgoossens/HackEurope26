import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

function svg(children: React.ReactNode, props: IconProps) {
  return (
    <svg viewBox="0 0 400 400" fill="currentColor" xmlns="http://www.w3.org/2000/svg"
      className={props.className} style={props.style}>
      {children}
    </svg>
  );
}

export function FolioMail(props: IconProps) {
  return svg(
    <>
      <path d="M66 114c-4 3-7 11-6 18l3 152c1 12 10 20 22 19l238-12c11-1 19-10 18-21l-5-148c-1-8-5-14-10-16L204 58c-6-2-11-1-16 2L66 114z" />
      <path d="M64 130c4-2 118 82 132 90c8 5 16 6 22 1c12-9 114-98 118-101" fill="none" stroke="white" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 276l92-74" fill="none" stroke="white" strokeWidth="16" strokeLinecap="round" />
      <path d="M334 270l-88-68" fill="none" stroke="white" strokeWidth="16" strokeLinecap="round" />
    </>,
    props,
  );
}

export function FolioHardDrive(props: IconProps) {
  return svg(
    <>
      <path d="M76 82c-7 1-13 7-16 15L36 214c-2 5-2 9-1 13l4 86c1 11 10 19 20 18l282-14c11-1 19-10 18-20l-4-82c0-4-1-8-3-12L322 94c-3-8-10-13-17-12L76 82z" />
      <path d="M38 218c6-3 64 2 130-1c68-3 192 6 198 4" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="312" cy="262" rx="15" ry="14" fill="white" />
      <ellipse cx="268" cy="264" rx="13" ry="14" fill="white" />
    </>,
    props,
  );
}

export function FolioFileSpreadsheet(props: IconProps) {
  return svg(
    <>
      <path d="M104 54c-13 1-22 11-21 23l12 250c1 12 11 20 23 19l190-10c12-1 21-11 20-22l-8-180L240 54L104 54z" />
      <path d="M238 56l4 64c0 12 10 21 22 20l58-3" fill="white" opacity="0.3" />
      <path d="M124 174l152-6" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <path d="M126 206l112-4" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <path d="M128 238l132-5" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <path d="M130 270l82-3" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <path d="M198 168l4 110" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
    </>,
    props,
  );
}

export function FolioCloud(props: IconProps) {
  return svg(
    <path d="M314 252c6-1 16-2 20-4c24-8 40-28 38-54c-2-26-22-44-48-44c-4-54-50-92-104-88c-36 3-66 28-78 60c-8-4-16-5-24-4c-28 3-48 28-46 56c0 4 1 8 2 12c-24 10-40 36-36 64c4 34 34 58 68 56l208-10c0 0 2-42-0-44z" />,
    props,
  );
}

export function FolioSend(props: IconProps) {
  return svg(
    <>
      <path d="M62 200c-3-2-2-6 2-8L338 66c5-2 12 4 8 10l-72 196c-2 6-9 8-14 4l-78-38l-40 76c-3 6-12 3-12-4l2-78L62 200z" />
      <path d="M192 234L338 68" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" />
      <path d="M132 232l58 6" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
    </>,
    props,
  );
}

export function FolioCheck(props: IconProps) {
  return svg(
    <path d="M86 214c-6-5-14-3-16 4c-2 6 1 12 6 16l68 72c5 6 14 6 20-1l168-196c4-5 3-13-3-16c-6-4-13-2-17 3L168 280L86 214z" />,
    props,
  );
}

export function FolioX(props: IconProps) {
  return svg(
    <>
      <path d="M106 88c-5-6-14-5-18 1c-4 6-2 14 3 18l86 88l-90 96c-5 5-4 14 2 18c6 4 14 2 18-3l88-94l92 90c5 5 14 4 18-2c4-6 2-14-3-18L212 194l86-92c5-5 4-14-2-18c-6-4-14-2-18 3l-82 90L106 88z" />
    </>,
    props,
  );
}

export function FolioArrowRight(props: IconProps) {
  return svg(
    <>
      <path d="M56 204c-1-7 4-12 10-13c52-6 108-4 168-2c28 1 52 3 68 4c-1-1-58-62-66-72c-4-6-3-14 4-17c6-4 14-1 17 4l84 96c4 5 3 13-2 17l-96 84c-5 4-13 3-17-3c-3-6-1-14 4-17l66-56c-18-1-44-3-74-4c-60-2-118-4-170 2c-7 1-13-4-14-10z" />
    </>,
    props,
  );
}

export function FolioPlay(props: IconProps) {
  return svg(
    <path d="M118 78c-9-6-20 0-20 12l4 224c0 10 12 16 20 10l192-118c8-6 9-17 1-22L118 78z" />,
    props,
  );
}

export function FolioPause(props: IconProps) {
  return svg(
    <>
      <path d="M100 76c-2-8 4-16 14-16l32 2c9 0 16 9 14 18l-10 246c-1 9-9 16-18 15l-30-2c-9-1-15-9-14-18L100 76z" />
      <path d="M248 74c-1-8 5-15 14-15l32 1c9 1 15 9 14 18l-12 248c-1 9-9 15-18 14l-28-2c-9-1-15-9-14-18L248 74z" />
    </>,
    props,
  );
}

export function FolioAlertTriangle(props: IconProps) {
  return svg(
    <>
      <path d="M186 76c6-12 24-14 32-2l152 248c8 14-1 34-20 34l-304 4c-18 0-28-18-20-34L186 76z" />
      <path d="M194 160c-1-6 4-10 9-10c5 0 10 4 9 10l-6 88c-1 6-6 8-8 8c-3 0-7-2-8-8L194 160z" fill="white" />
      <ellipse cx="201" cy="296" rx="15" ry="14" fill="white" />
    </>,
    props,
  );
}

export function FolioCheckCircle2(props: IconProps) {
  return svg(
    <>
      <path d="M200 48c-86 2-154 72-152 158c2 86 72 154 158 152c86-2 154-72 152-158C356 114 286 46 200 48z" />
      <path d="M128 204l44 48c4 4 10 4 14-1l96-104" fill="none" stroke="white" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
    </>,
    props,
  );
}

export function FolioHelpCircle(props: IconProps) {
  return svg(
    <>
      <path d="M200 48c-86 2-154 72-152 158c2 86 72 154 158 152c86-2 154-72 152-158C356 114 286 46 200 48z" />
      <path d="M158 162c2-26 22-44 46-42c24 2 42 22 40 46c-1 18-14 34-30 40c-8 4-14 12-14 20l-1 14" fill="none" stroke="white" strokeWidth="24" strokeLinecap="round" />
      <ellipse cx="198" cy="282" rx="15" ry="14" fill="white" />
    </>,
    props,
  );
}

export function FolioFileText(props: IconProps) {
  return svg(
    <>
      <path d="M104 56c-14 1-24 12-22 24l14 252c1 12 12 21 24 20l186-10c12-1 21-12 20-24l-8-176L238 58L104 56z" />
      <path d="M236 58l6 62c1 12 11 20 22 19l56-4" fill="white" opacity="0.3" />
      <path d="M126 188l148-6" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M128 222l110-4" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M130 256l128-5" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
    </>,
    props,
  );
}

export function FolioFolder(props: IconProps) {
  return svg(
    <>
      <path d="M56 124c-2-14 8-26 22-27l86-4l40 34l128-6c14-1 25 10 26 22l6 152c1 14-10 25-22 26L60 326c-12 1-23-10-24-22L56 124z" />
      <path d="M56 160c8-2 72-1 148-4c78-3 152 0 160-1" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
    </>,
    props,
  );
}

export function FolioUsers(props: IconProps) {
  return svg(
    <>
      <ellipse cx="158" cy="138" rx="46" ry="50" />
      <path d="M78 316c2-46 38-82 82-80c44 2 78 40 76 84" />
      <ellipse cx="270" cy="126" rx="34" ry="38" />
      <path d="M232 298c4-38 20-66 48-76c8-3 18-4 26-2c30 4 54 32 52 64" />
    </>,
    props,
  );
}

export function FolioScale(props: IconProps) {
  return svg(
    <>
      <path d="M188 76c-2-8 4-14 14-14c10 0 16 6 14 14l-8 236c-1 8-6 12-14 12c-8 0-13-4-12-12L188 76z" />
      <path d="M106 304c-4 0-8 4-8 10c0 8 8 14 16 14l174-4c8 0 14-8 14-14c0-6-4-10-10-10L106 304z" />
      <path d="M108 150c8-4 44-3 92-2c48 1 84-2 92-4" fill="none" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
      <path d="M108 148l-34 78c-3 6 0 14 8 18c14 6 32 10 50 8c18-2 34-8 46-16c6-4 8-12 4-18l-36-74" />
      <path d="M300 144l-34 78c-3 6 0 14 8 18c14 6 32 10 50 8c18-2 34-8 46-16c6-4 8-12 4-18l-36-74" />
    </>,
    props,
  );
}

export function FolioSparkles(props: IconProps) {
  return svg(
    <>
      <path d="M200 56c4 28 14 56 36 78c22 22 50 32 78 36c-28 4-56 14-78 36c-22 22-32 50-36 78c-4-28-14-56-36-78c-22-22-50-32-78-36c28-4 56-14 78-36c22-22 32-50 36-78z" />
      <path d="M316 180c2 16 8 30 20 42c12 12 28 18 42 20c-14 2-30 8-42 20c-12 12-18 28-20 42c-2-14-8-30-20-42c-12-12-28-18-42-20c14-2 30-8 42-20c12-12 18-28 20-42z" />
      <path d="M108 248c2 12 6 22 14 30c8 8 20 14 32 16c-12 2-24 8-32 16c-8 8-12 18-14 30c-2-12-6-22-14-30c-8-8-20-14-32-16c12-2 24-8 32-16c8-8 12-18 14-30z" />
    </>,
    props,
  );
}

export function FolioEye(props: IconProps) {
  return svg(
    <>
      <path d="M42 204c8-12 38-52 78-80c44-30 92-42 132-24c40 18 72 56 98 88c8 10 8 18 0 28c-26 32-58 68-98 88c-40 20-88 10-132-20c-40-28-70-66-78-80z" />
      <ellipse cx="210" cy="204" rx="56" ry="60" fill="white" />
      <ellipse cx="214" cy="202" rx="28" ry="30" />
      <ellipse cx="226" cy="190" rx="8" ry="10" fill="white" />
    </>,
    props,
  );
}

export function FolioZap(props: IconProps) {
  return svg(
    <path d="M228 52c2-6-4-10-10-6L102 192c-4 4-2 10 4 10l76-2l-36 148c-2 6 4 10 10 6L280 202c4-4 2-10-4-10l-78 4L228 52z" />,
    props,
  );
}

export function FolioShield(props: IconProps) {
  return svg(
    <>
      <path d="M200 52c-48 18-96 26-140 22c-10-1-18 6-18 16l6 132c2 48 26 92 62 120c20 16 44 28 68 38c6 2 12 2 18 0c24-10 48-22 68-38c36-28 60-72 62-120l6-132c0-10-8-17-18-16c-44 4-92-4-140-22z" />
      <path d="M144 208l36 38c4 4 10 4 14-1l68-76" fill="none" stroke="white" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
    </>,
    props,
  );
}

export function FolioBuilding(props: IconProps) {
  return svg(
    <>
      <path d="M96 80c-2-10 6-20 16-20l176-2c10 0 18 8 18 18l4 244c0 10-8 18-18 18l-196 2c-10 0-18-8-18-18L96 80z" />
      <rect x="134" y="108" width="32" height="32" rx="6" fill="white" />
      <rect x="196" y="106" width="32" height="32" rx="6" fill="white" />
      <rect x="252" y="104" width="32" height="32" rx="6" fill="white" />
      <rect x="136" y="170" width="32" height="32" rx="6" fill="white" />
      <rect x="198" y="168" width="32" height="32" rx="6" fill="white" />
      <rect x="254" y="166" width="32" height="32" rx="6" fill="white" />
      <path d="M182 300c0-8 6-16 16-16l12 0c10 0 16 8 16 16l0 40l-44 0L182 300z" fill="white" />
    </>,
    props,
  );
}

export function FolioGlobe(props: IconProps) {
  return svg(
    <>
      <path d="M200 48c-86 2-154 72-152 158c2 86 72 154 158 152c86-2 154-72 152-158C356 114 286 46 200 48z" />
      <path d="M200 48c-30 8-56 60-58 152c-2 92 24 144 54 152" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <path d="M200 48c30 8 56 60 58 152c2 92-24 144-54 152" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <path d="M64 168c20 4 68 6 136 2c68-4 116-2 136 6" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <path d="M60 244c24-6 72-8 140-4c68 4 116 2 140-4" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" />
    </>,
    props,
  );
}

export function FolioLink(props: IconProps) {
  return svg(
    <>
      <path d="M172 228l-28 28c-26 26-68 26-94 0c-26-26-26-68 0-94l56-56c26-26 68-26 94 0c6 6 10 12 14 20" fill="none" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
      <path d="M228 172l28-28c26-26 68-26 94 0c26 26 26 68 0 94l-56 56c-26 26-68 26-94 0c-6-6-10-12-14-20" fill="none" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
    </>,
    props,
  );
}

export function FolioCompass(props: IconProps) {
  return svg(
    <>
      <path d="M200 48c-86 2-154 72-152 158c2 86 72 154 158 152c86-2 154-72 152-158C356 114 286 46 200 48z" />
      <path d="M200 48c-86 2-154 72-152 158c2 86 72 154 158 152c86-2 154-72 152-158C356 114 286 46 200 48z" fill="none" stroke="currentColor" strokeWidth="16" />
      <path d="M170 230l-40 88c-2 4 2 8 6 6l88-40l40-88c2-4-2-8-6-6L170 230z" fill="white" />
      <path d="M170 230l88-40l-58 58L170 230z" />
      <ellipse cx="200" cy="204" rx="12" ry="12" fill="white" />
    </>,
    props,
  );
}

export function FolioDatabase(props: IconProps) {
  return svg(
    <>
      <ellipse cx="200" cy="104" rx="128" ry="44" />
      <path d="M72 104v82c0 24 56 44 128 44c72 0 128-20 128-44V104" />
      <ellipse cx="200" cy="186" rx="128" ry="44" fill="none" stroke="white" strokeWidth="6" opacity="0.3" />
      <path d="M72 186v82c0 24 56 44 128 44c72 0 128-20 128-44V186" />
      <ellipse cx="200" cy="268" rx="128" ry="44" fill="none" stroke="white" strokeWidth="6" opacity="0.3" />
    </>,
    props,
  );
}

export function FolioBot(props: IconProps) {
  return svg(
    <>
      <path d="M92 136c-4 0-12 6-14 14l-4 168c-1 13 9 24 22 24l206-4c13 0 23-11 22-24l-6-166c-1-8-7-14-15-14L92 136z" />
      <ellipse cx="200" cy="90" rx="23" ry="21" />
      <path d="M194 110c0 0 2 22 4 26c2 4 6 4 8 0c2-4 4-26 4-26" />
      <ellipse cx="156" cy="218" rx="24" ry="22" fill="white" />
      <ellipse cx="248" cy="214" rx="22" ry="24" fill="white" />
      <path d="M150 268c4 4 20 16 50 14c30-2 44-14 48-18" fill="none" stroke="white" strokeWidth="14" strokeLinecap="round" />
    </>,
    props,
  );
}

export function FolioChevronLeft(props: IconProps) {
  return svg(
    <path d="M246 80c6 6 6 14 0 20L136 200l110 100c6 6 6 14 0 20c-6 6-14 6-20 0L106 210c-6-6-6-14 0-20l120-110c6-6 14-6 20 0z" />,
    props,
  );
}

export function FolioChevronRight(props: IconProps) {
  return svg(
    <path d="M154 80c-6 6-6 14 0 20l110 100l-110 100c-6 6-6 14 0 20c6 6 14 6 20 0l120-110c6-6 6-14 0-20L174 80c-6-6-14-6-20 0z" />,
    props,
  );
}

export function FolioArrowLeft(props: IconProps) {
  return svg(
    <path d="M344 204c1 7-4 12-10 13c-52 6-108 4-168 2c-28-1-52-3-68-4c1 1 58 62 66 72c4 6 3 14-4 17c-6 4-14 1-17-4l-84-96c-4-5-3-13 2-17l96-84c5-4 13-3 17 3c3 6 1 14-4 17l-66 56c18 1 44 3 74 4c60 2 118 4 170-2c7-1 13 4 14 10z" />,
    props,
  );
}

export function FolioChevronDown(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

export function FolioCode(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );
}
