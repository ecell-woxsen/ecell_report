import Image from "next/image";

type ECellLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function ECellLogo({
  size = 40,
  className = "",
  priority = false,
}: ECellLogoProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-border-light ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/ecell-logo.png"
        alt="E-Cell Woxsen University logo"
        fill
        sizes={`${size}px`}
        className="object-contain p-0.5"
        priority={priority}
      />
    </span>
  );
}
