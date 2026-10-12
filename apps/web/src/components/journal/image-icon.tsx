import type { ComponentType, CSSProperties } from 'react';

/** What the event icons are given, Tabler's or ours (`imageIcon`). */
export interface EventIconProps {
  size?: number | string;
  color?: string;
  stroke?: number | string;
  style?: CSSProperties;
  className?: string;
}
export type EventIconComponent = ComponentType<EventIconProps>;

/**
 * An icon drawn from a picture (`public/icons/…`: black strokes on transparent), used as a
 * mask so it takes the text colour, or `color`, like a Tabler icon.
 */
export function imageIcon(src: string, name: string): EventIconComponent {
  const mask = `url(${src}) center / contain no-repeat`;
  function ImageIcon({ size = 24, color, style, className }: EventIconProps) {
    return (
      <span
        aria-hidden
        className={className}
        style={{
          display: 'inline-block',
          flexShrink: 0,
          width: size,
          height: size,
          backgroundColor: color ?? 'currentColor',
          mask,
          WebkitMask: mask,
          ...style,
        }}
      />
    );
  }
  ImageIcon.displayName = name;
  return ImageIcon;
}

/**
 * An icon shown with its own colours (e.g. the competition's target): `color` is ignored.
 * `scale` draws it larger (or smaller) than its box, without changing the layout.
 */
export function pictureIcon(src: string, name: string, scale = 1): EventIconComponent {
  function PictureIcon({ size = 24, style, className }: EventIconProps) {
    return (
      // Decorative, small and static: a plain <img> rather than next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden
        width={typeof size === 'number' ? size : undefined}
        height={typeof size === 'number' ? size : undefined}
        className={className}
        style={{
          display: 'inline-block',
          flexShrink: 0,
          width: size,
          height: size,
          ...(scale !== 1 && { scale: String(scale) }),
          ...style,
        }}
      />
    );
  }
  PictureIcon.displayName = name;
  return PictureIcon;
}
