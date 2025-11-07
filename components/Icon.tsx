import React from 'react';
import { Text } from 'react-native';
import { Icons, IconName } from '../constants/icons';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * Unified Icon component
 * Automatically selects the correct icon family and renders the icon
 * Supports both vector icons and emoji strings
 */
export default function Icon({ name, size = 24, color = '#000' }: IconProps) {
  const icon = Icons[name];
  if (!icon) return null;
  
  // Handle emoji strings
  if (typeof icon === 'string') {
    return (
      <Text style={{ 
        fontSize: size, 
        color: color,
        lineHeight: size * 1.2,
        textAlign: 'center'
      }}>
        {icon}
      </Text>
    );
  }
  
  // Handle vector icons
  const IconComponent = icon.family;
  return <IconComponent name={icon.name as any} size={size} color={color} />;
}
