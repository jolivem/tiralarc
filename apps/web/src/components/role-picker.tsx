'use client';

import type { SelfAssignableRole } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';

export const SELF_ASSIGNABLE_ROLES: SelfAssignableRole[] = ['ARCHER', 'COACH'];

interface RolePickerProps {
  value: SelfAssignableRole[];
  onChange: (roles: SelfAssignableRole[]) => void;
}

/** Archer / coach checkboxes (cumulative), submitted as repeated "roles" form fields. */
export function RolePicker({ value, onChange }: RolePickerProps) {
  const t = useTranslations('roles');
  return (
    <div className="grid grid-cols-2 gap-3">
      {SELF_ASSIGNABLE_ROLES.map((role) => {
        const checked = value.includes(role);
        return (
          <label
            key={role}
            className={`flex cursor-pointer flex-col gap-1 rounded border p-3 text-sm ${
              checked
                ? 'border-neutral-900 dark:border-white'
                : 'border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                name="roles"
                value={role}
                checked={checked}
                onChange={(e) =>
                  onChange(e.target.checked ? [...value, role] : value.filter((r) => r !== role))
                }
              />
              {t(role)}
            </span>
            <span className="text-neutral-500">{t(`${role}_description`)}</span>
          </label>
        );
      })}
    </div>
  );
}
