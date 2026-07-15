export const SUPPORTED_COMPONENT_TYPES = ['Button', 'Input', 'Card'] as const;

export type SupportedComponentType = (typeof SUPPORTED_COMPONENT_TYPES)[number];

export function isSupportedComponentType(componentType: string): boolean {
  return (SUPPORTED_COMPONENT_TYPES as readonly string[]).includes(componentType);
}
