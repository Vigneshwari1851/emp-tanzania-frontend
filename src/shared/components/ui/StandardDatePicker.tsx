import React from "react";
import { ModernDatePicker } from "./ModernDatePicker";

interface StandardDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  align?: 'left' | 'right';
}

export const StandardDatePicker: React.FC<StandardDatePickerProps> = (props) => {
  return <ModernDatePicker {...props} />;
};

export default StandardDatePicker;
