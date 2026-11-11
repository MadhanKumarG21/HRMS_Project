const createIcon = (paths) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
    {paths}
  </svg>
);

const ICONS = {
  add: createIcon(<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />),
  admin_panel_settings: createIcon(
    <path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3zm0 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 10c-2.03 0-3.86-.82-5.18-2.14.03-1.99 4-3.08 5.18-3.08 1.17 0 5.15 1.09 5.18 3.08A7.25 7.25 0 0 1 12 18z" />,
  ),
  arrow_forward: createIcon(
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />,
  ),
  campaign: createIcon(
    <path d="M18 11c0-.67 0-1.33-.21-1.98L20 8l-1.5-2.6-2.48 1.43c-1.15-1.07-2.63-1.83-4.27-1.83H4v8h2v6h2v-6h3.75l4.25 2.5 1.5-2.6-2.21-1.3c.47-.64.71-1.41.71-2.2zM8 9H6V7h2v2zm3.75 2H6V9h5.75c1.47 0 2.76.77 3.5 1.94-.37.58-.75 1.06-1.5 1.06z" />,
  ),
  assignment: createIcon(
    <path d="M19 3h-3.18A3 3 0 0 0 13 1h-2a3 3 0 0 0-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0a1 1 0 0 1 1 1h-2a1 1 0 0 1 1-1Zm-1 14-4-4 1.41-1.41L11 14.17l5.59-5.58L18 10l-7 7Z" />,
  ),
  backup: createIcon(
    <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4a7.05 7.05 0 0 0-6.65 4.04A5.99 5.99 0 0 0 6 20h13a5 5 0 0 0 .35-9.96ZM13 13h3l-4 4-4-4h3V9h2v4Z" />,
  ),
  badge: createIcon(
    <path d="M20 7h-5V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Zm-8-3h2v3h-2V4Zm-1.5 8A1.5 1.5 0 1 1 9 13.5 1.5 1.5 0 0 1 10.5 12Zm4.5 6H6v-.75c0-1.5 3-2.25 4.5-2.25s4.5.75 4.5 2.25V18Z" />,
  ),
  check: createIcon(
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />,
  ),
  check_box: createIcon(
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9Z" />,
  ),
  check_box_outline_blank: createIcon(
    <path d="M19 5v14H5V5h14m0-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />,
  ),
  check_circle: createIcon(
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.58L19 8l-9 9Z" />,
  ),
  close: createIcon(
    <path d="m19 6.41-1.41-1.41L12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12Z" />,
  ),
  cloud: createIcon(
    <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4a7.05 7.05 0 0 0-6.65 4.04A5.99 5.99 0 0 0 6 20h13a5 5 0 0 0 .35-9.96Z" />,
  ),
  chevron_left: createIcon(
    <path d="M15.41 7.41 14 6 8 12l6 6 1.41-1.41L10.83 12z" />,
  ),
  chevron_right: createIcon(
    <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41Z" />,
  ),
  content_copy: createIcon(
    <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z" />,
  ),
  danger: createIcon(
    <path d="M12 2 1 21h22L12 2Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4Z" />,
  ),
  dangerous: createIcon(
    <path d="M15.73 3H8.27 8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3ZM12 17.3A1.3 1.3 0 1 1 13.3 16 1.3 1.3 0 0 1 12 17.3Zm1-4.3h-2V7h2v6Z" />,
  ),
  dashboard: createIcon(
    <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />,
  ),
  download: createIcon(
    <path d="M5 20h14v-2H5v2Zm7-18-5.5 5.5 1.41 1.41L11 6.83V16h2V6.83l3.09 3.09 1.41-1.41L12 2Z" />,
  ),
  database: createIcon(
    <path d="M12 2C6.48 2 2 4.69 2 8s4.48 6 10 6 10-2.69 10-6-4.48-6-10-6Zm0 10c-4.42 0-8-1.79-8-4s3.58-4 8-4 8 1.79 8 4-3.58 4-8 4Zm-8 4.5V17c0 2.21 3.58 4.5 8 4.5s8-2.29 8-4.5v-.5c0 2.21-3.58 4.5-8 4.5S4 18.71 4 16.5Zm0 4V21c0 2.21 3.58 4.5 8 4.5s8-2.29 8-4.5v-.5c0 2.21-3.58 4.5-8 4.5S4 22.71 4 20.5Z" />,
  ),
  delete: createIcon(
    <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1Z" />,
  ),
  delete_sweep: createIcon(
    <path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z" />,
  ),
  done_all: createIcon(
    <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />,
  ),
  description: createIcon(
    <path d="M14 2H6a2 2 0 0 0-2 2l.01 16A2 2 0 0 0 6 22h12a2 2 0 0 0 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z" />,
  ),
  edit: createIcon(
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83Z" />,
  ),
  error: createIcon(
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" />,
  ),
  error_outline: createIcon(
    <path d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />,
  ),
  event_repeat: createIcon(
    <path d="M17 17H7v-3l-4 4 4 4v-3h10a4 4 0 0 0 4-4V9h-2v10a2 2 0 0 1-2 2ZM7 7h10v3l4-4-4-4v3H7a4 4 0 0 0-4 4v10h2V9a2 2 0 0 1 2-2Z" />,
  ),
  expand_less: createIcon(
    <path d="m12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />,
  ),
  expand_more: createIcon(
    <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />,
  ),
  extension: createIcon(
    <path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 1 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7 2.7 0 1 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 1 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5ZM10 3.5a.5.5 0 1 1 1 0V5h-1V3.5Z" />,
  ),
  eye: createIcon(
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5Zm0 13a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Zm0-9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />,
  ),
  eye_off: createIcon(
    <path d="M12 6a9.77 9.77 0 0 1 8.94 6A9.77 9.77 0 0 1 12 18a9.77 9.77 0 0 1-8.94-6A9.77 9.77 0 0 1 12 6Zm0-2C7.05 4 2.73 7.11 1 12c1.73 4.89 6.05 8 11 8s9.27-3.11 11-8c-1.73-4.89-6.05-8-11-8Zm0 5a3 3 0 1 1-3 3a3 3 0 0 1 3-3Zm0-2a5.01 5.01 0 0 0-4.58 2.91l6.67-6.67A9.77 9.77 0 0 1 12 4Zm4.58-.09l-6.67 6.67A5.01 5.01 0 0 0 17.58 10Z" />,
  ),
  favicon: createIcon(
    <path d="M12 2C6.48 2 2 4.69 2 8v8c0 3.31 4.48 6 10 6s10-2.69 10-6V8c0-3.31-4.48-6-10-6Zm5 12c0 1.66-3.58 4-8 4s-8-2.34-8-4v-.5c0-1.66 3.58-4 8-4s8 2.34 8 4V14Zm0-3c0 .83-3.58 3-8 3s-8-2.17-8-3v-.5c0-.83 3.58-3 8-3s8 2.17 8 3V11Z" />,
  ),
  file_export: createIcon(
    <path d="M19.41 7.41 14.83 2.83A2 2 0 0 0 13.41 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.83a2 2 0 0 0-.59-1.42ZM13 9V3.5L18.5 9H13Zm-1 9-5-5h3v-3h4v3h3l-5 5Z" />,
  ),
  filter_list: createIcon(
    <path d="M10 18h4v-2h-4v2Zm-7-8v2h18v-2H3Zm3-6v2h12V4H6Z" />,
  ),
  filter_alt_off: createIcon(
    <path d="M19.79 5.61A.998.998 0 0 0 19 4H6.83l7.97 7.97 4.99-6.36zM2.81 2.81L1.39 4.22 10 12.83V19c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.17l5.78 5.78 1.41-1.41L2.81 2.81z" />,
  ),
  forum: createIcon(
    <path d="M21 6h-2v9H6v2a1 1 0 0 0 1 1h11l4 4V7a1 1 0 0 0-1-1Zm-4 6V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v14l4-4h10a1 1 0 0 0 1-1Z" />,
  ),
  group: createIcon(
    <path d="M16 11c1.66 0 2.99-1.79 2.99-4S17.66 3 16 3s-3 1.79-3 4 1.34 4 3 4Zm-8 0c1.66 0 2.99-1.79 2.99-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5Z" />,
  ),
  groups: createIcon(
    <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4ZM8 11c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Zm0 2c-2.67 0-8 1.34-8 4v3h10v-3c0-1.19.43-2.31 1.15-3.23C10.13 13.29 8.91 13 8 13Zm8 0c-.91 0-2.13.29-3.15.77A4.98 4.98 0 0 1 14 17v3h10v-3c0-2.66-5.33-4-8-4Z" />,
  ),
  info: createIcon(
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z" />,
  ),
  lock: createIcon(
    <path d="M12 17a2 2 0 1 0-2-2 2 2 0 0 0 2 2Zm6-6V7A6 6 0 0 0 6 7v4H4v12h16V11Zm-8-4a2 2 0 1 1 4 0v4h-4V7Z" />,
  ),
  lock_open: createIcon(
    <path d="M12 17a2 2 0 1 0-2-2 2 2 0 0 0 2 2Zm6-9h-8V6a2 2 0 1 1 4 0h2a4 4 0 1 0-8 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z" />,
  ),
  logout: createIcon(
    <path d="m17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5ZM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5Z" />,
  ),
  menu: createIcon(
    <path d="M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z" />,
  ),
  mail: createIcon(
    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />,
  ),
  mark_email_unread: createIcon(
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2zm2-5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />,
  ),
  notifications: createIcon(
    <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-4.5-5.82V4a1.5 1.5 0 1 0-3 0v1.18A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z" />,
  ),
  notifications_off: createIcon(
    <path d="M20.29 3.71 18.86 2.29 2.29 18.86 3.71 20.29l1.6-1.6A1 1 0 0 0 6 19h12v-1l-2-2v-4.68l4.29 4.29 1.4-1.42-1.4-1.4V11a6 6 0 0 0-4.5-5.82V4a1.5 1.5 0 1 0-3 0v1.18a5.97 5.97 0 0 0-2.36 1.12l1.45 1.45A4 4 0 0 1 14 11v.68L7.32 5H12a1 1 0 0 0-.02-.06L20.29 3.71ZM12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" />,
  ),
  next: createIcon(
    <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41Z" />,
  ),
  online_prediction: createIcon(
    <>
      <path d="M5 5h6v2H7v4H5V5Zm14 0v6h-2V7h-4V5h6ZM5 19v-6h2v4h4v2H5Zm12-2v-4h2v6h-6v-2h4Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
  phone: createIcon(
    <path
      d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1A17.92 17.92 0 0 1 3 5a1 1 0 0 1 1-1H7.5a1 1 0 0 1 1 1c0 1.35.27 2.67.76 3.88a1 1 0 0 1-.21 1.11l-2.43
  2.2Z"
    />,
  ),
  person: createIcon(
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />,
  ),
  person_add: createIcon(
    <path d="M15 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM6 10V7H4v3H1v2h3v3h2v-3h3v-2Zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />,
  ),
  person_off: createIcon(
    <path d="M2.81 2.81 1.39 4.22l4.44 4.44A3.9 3.9 0 0 0 8 12a4 4 0 0 0 3.34-6.17l1.68 1.68A7.93 7.93 0 0 1 12 8c-2.67 0-8 1.34-8 4v2h11.17l4.61 4.61 1.41-1.41L2.81 2.81ZM12 4a4 4 0 0 1 4 4 3.9 3.9 0 0 1-.49 1.89l-5.4-5.4A3.9 3.9 0 0 1 12 4Zm0 10c.8 0 1.78.12 2.77.35L6.42 6A4 4 0 0 0 8 12c1.48 0 2.76-.8 3.46-2H12Z" />,
  ),
  previous: createIcon(
    <path d="M15.41 7.41 10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41Z" />,
  ),
  refresh: createIcon(
    <path d="M17.65 6.35A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.76-4.24L13 11h7V4l-2.35 2.35Z" />,
  ),
  recruitment: createIcon(
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-1v6m3-3h-6" />,
  ),

  remove: createIcon(<path d="M19 13H5v-2h14v2Z" />),
  report: createIcon(
    <path d="M3 3v18h18V3H3Zm16 16H5V5h14v14ZM11 7h2v6h-2V7Zm0 8h2v2h-2v-2Z" />,
  ),
  schedule: createIcon(
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 11h-2V7h2v5l4.25 2.52-.75 1.23L13 13Z" />,
  ),
  school: createIcon(
    <path d="M12 2 1 7l11 5 9-4.09V17h2V7L12 2Zm0 11-7-3.18v-.82L12 4l7 3.18v.82L12 13Zm0 2.25L18.39 15H5.61L12 15.25ZM6 17h12v2H6v-2Z" />,
  ),
  settings_suggest: createIcon(
    <path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.12 7.12 0 0 0-1.7-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.63.25-1.22.58-1.7.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98L2.6 14.63a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.48.4 1.07.73 1.7.98l.38 2.65A.5.5 0 0 0 10 22h4a.5.5 0 0 0 .5-.42l.38-2.65c.63-.25 1.22-.58 1.7-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15a3 3 0 1 1 3-3 3 3 0 0 1-3 3Z" />,
  ),
  search: createIcon(
    <path d="m15.5 14-.79-.79A6.5 6.5 0 1 0 14 14.5l.79.79L20 20.49 21.49 19l-5.99-5ZM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />,
  ),
  search_off: createIcon(
    <>
      <path d="m15.5 14-.79-.79A6.5 6.5 0 1 0 14 14.5l.79.79L20 20.49 21.49 19l-5.99-5ZM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z" />
      <path d="m3 4.27 16.73 16.73 1.27-1.27L4.27 3 3 4.27Z" />
    </>,
  ),
  send: createIcon(
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />,
  ),
  security_update_good: createIcon(
    <path d="m12 1 8 4v6c0 5-3.5 9.74-8 11-4.5-1.26-8-6-8-11V5l8-4Zm-1 14 5-5-1.41-1.41L11 12.17l-1.59-1.58L8 12l3 3Z" />,
  ),
  settings: createIcon(
    <path d="m19.14 12.94 2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.34 7.34 0 0 0-1.62-.94l-.36-2.54A.49.49 0 0 0 13.91 4h-3.82a.49.49 0 0 0-.49.41l-.36 2.54c-.57.23-1.11.55-1.61.94l-2.4-.96a.5.5 0 0 0-.59.22L2.72 10.5a.5.5 0 0 0 .12.64l2.03 1.58a7.93 7.93 0 0 0 0 1.88L2.84 16.2a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .59.22l2.4-.96c.5.39 1.04.71 1.61.94l.36 2.54a.49.49 0 0 0 .49.41h3.82a.49.49 0 0 0 .49-.41l.36-2.54c.57-.23 1.11-.55 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58c.04-.31.07-.62.07-.94s-.03-.63-.07-.94ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z" />,
  ),
  shield: createIcon(
    <path d="m12 1 9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4Z" />,
  ),
  supervisor_account: createIcon(
    <path d="M16.5 12c1.93 0 3.5-1.79 3.5-4s-1.57-4-3.5-4S13 5.79 13 8s1.57 4 3.5 4ZM9 11c1.66 0 3-1.79 3-4S10.66 3 9 3 6 4.79 6 7s1.34 4 3 4Zm7.5 2c-1.73 0-5.5.87-5.5 2.6V18h11v-2.4c0-1.73-3.77-2.6-5.5-2.6ZM9 13c-2.33 0-7 1.17-7 3.5V19h7v-3.4c0-.76.29-1.45.77-2.02A8.86 8.86 0 0 0 9 13Z" />,
  ),
  toggle_off: createIcon(
    <>
      <path
        d="M7 7h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="9" cy="12" r="3" />
    </>,
  ),
  toggle_on: createIcon(
    <>
      <path
        d="M7 7h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="15" cy="12" r="3" />
    </>,
  ),
  trending_up: createIcon(
    <path d="M16 6 18.29 8.29 13.41 13.17l-4-4L2 16.59 3.41 18l6-6 4 4L19.71 9.71 22 12V6h-6Z" />,
  ),
  verified: createIcon(
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.41 14.59L7.83 13l1.41-1.41L10.59 13l4.59-4.59L16.59 10l-6 6.59Z" />,
  ),
  verified_user: createIcon(
    <path d="m12 1 9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4Zm-1.41 15.59L7.83 13l-1.42 1.41L10.59 19 18 11.59 16.59 10l-6 6.59Z" />,
  ),
  video_camera_front: createIcon(
    <path d="M18 10.48V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.48l4 3.98v-11l-4 3.98ZM10 8a2 2 0 1 1-2 2 2 2 0 0 1 2-2Zm4 8H6v-.57c0-.81.48-1.53 1.22-1.85A6.76 6.76 0 0 1 10 13c.99 0 1.93.21 2.78.58.74.32 1.22 1.04 1.22 1.85V16Z" />,
  ),
  view_list: createIcon(
    <path d="M3 14h4v-4H3v4Zm0 5h4v-4H3v4Zm0-14v4h4V5H3Zm5 9h13v-4H8v4Zm0 5h13v-4H8v4ZM8 5v4h13V5H8Z" />,
  ),
  view_module: createIcon(
    <path d="M4 11h5V5H4v6Zm0 8h5v-6H4v6Zm6 0h5v-6h-5v6Zm6 0h5v-6h-5v6Zm-6-8h5V5h-5v6Zm6-6v6h5V5h-5Z" />,
  ),
  warning: createIcon(
    <path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />,
  ),
  work: createIcon(
    <path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-6-1h-4v1h4V5Zm6 15H4V8h16v12Z" />,
  ),
};

export default function Icon({ name, style, className, onClick, size }) {
  const icon = ICONS[name];
  const mergedStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size || style?.fontSize,
    ...style,
  };

  if (!icon) {
    return (
      <span className={className} style={mergedStyle} onClick={onClick}>
        ?
      </span>
    );
  }

  return (
    <span className={className} style={mergedStyle} onClick={onClick}>
      {icon}
    </span>
  );
}