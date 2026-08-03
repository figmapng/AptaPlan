declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export const Ionicons: ComponentType<IconProps>;
  export const Feather: ComponentType<IconProps>;
  export const Octicons: ComponentType<IconProps>;
  export const MaterialCommunityIcons: ComponentType<IconProps>;
}

declare module '@expo/vector-icons/Ionicons' {
  import { ComponentType } from 'react';
  import { IconProps } from '@expo/vector-icons';
  const Ionicons: ComponentType<IconProps>;
  export default Ionicons;
}
