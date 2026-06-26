declare module '@react-native-community/slider' {
  import { ComponentType } from 'react';
  interface SliderProps {
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    value?: number;
    onValueChange?: (value: number) => void;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
    style?: any;
    disabled?: boolean;
  }
  const Slider: ComponentType<SliderProps>;
  export default Slider;
}
