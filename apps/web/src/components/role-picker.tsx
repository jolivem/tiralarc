'use client';

import { Checkbox, Group, SimpleGrid, Text } from '@mantine/core';
import { IconSchool, IconTarget } from '@tabler/icons-react';
import type { SelfAssignableRole } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';

export const SELF_ASSIGNABLE_ROLES: SelfAssignableRole[] = ['ARCHER', 'COACH'];

const ICONS = { ARCHER: IconTarget, COACH: IconSchool } as const;

interface RolePickerProps {
  value: SelfAssignableRole[];
  onChange: (roles: SelfAssignableRole[]) => void;
  error?: string;
}

/**
 * Archer / coach cards (cumulative). Stacked on phones, side by side from xs up.
 * Submitted as repeated hidden "roles" fields.
 */
export function RolePicker({ value, onChange, error }: RolePickerProps) {
  const t = useTranslations('roles');
  return (
    <Checkbox.Group
      value={value}
      onChange={(roles) => onChange(roles as SelfAssignableRole[])}
      error={error}
    >
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        {SELF_ASSIGNABLE_ROLES.map((role) => {
          const Icon = ICONS[role];
          return (
            <Checkbox.Card key={role} value={role} radius="md" p="md">
              <Group wrap="nowrap" align="flex-start" gap="sm">
                <Checkbox.Indicator mt={2} />
                <div>
                  <Group gap={6}>
                    <Icon size={18} />
                    <Text fw={600}>{t(role)}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t(`${role}_description`)}
                  </Text>
                </div>
              </Group>
            </Checkbox.Card>
          );
        })}
      </SimpleGrid>
      {value.map((role) => (
        <input key={role} type="hidden" name="roles" value={role} />
      ))}
    </Checkbox.Group>
  );
}
