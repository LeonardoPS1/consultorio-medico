'use client';

const AVATAR_COLORS = [
  'bg-[#2563EB]', 'bg-[#14B8A6]', 'bg-[#8B5CF6]', 'bg-[#F59E0B]',
  'bg-[#0EA5E9]', 'bg-[#F43F5E]',
];

function hashToIndex(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % AVATAR_COLORS.length;
}

/**
 * AvatarInitials — Avatar circular con iniciales del nombre.
 * @param root0
 * @param root0.nombre
 * @param root0.apellido
 * @param root0.className
 */
export function AvatarInitials({
  nombre,
  apellido,
  className = 'h-10 w-10 text-sm',
}: {
  nombre: string;
  apellido?: string;
  className?: string;
}) {
  const initials = `${(nombre || '?').trim().charAt(0)}${(apellido || '').trim().charAt(0)}`
    .toUpperCase();
  const color = AVATAR_COLORS[hashToIndex(`${nombre}${apellido}`)];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-[#1C1C22] shrink-0 ${color} ${className}`}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
}