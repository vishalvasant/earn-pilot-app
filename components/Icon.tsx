import React from 'react';
import { Icons, IconName } from '../constants/icons';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * Unified Icon component
 * Automatically selects the correct icon family and renders the icon
 */
export default function Icon({ name, size = 24, color = '#000' }: IconProps) {
  const icon = Icons[name];
  if (!icon) return null;
  
  const IconComponent = icon.family;
  return <IconComponent name={icon.name as any} size={size} color={color} />;
}
