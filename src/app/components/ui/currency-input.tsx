import * as React from 'react';
import { Input } from './input';

// formatter for Brazilian reais
const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  value: number;
  onValueChange: (value: number) => void;
}

export function CurrencyInput({ value, onValueChange, ...props }: CurrencyInputProps) {
  const [display, setDisplay] = React.useState<string>('');

  // whenever the numeric value changes from outside, update display
  React.useEffect(() => {
    setDisplay(formatter.format(value ?? 0));
  }, [value]);

  const parseNumber = (str: string): number => {
    if (!str) return 0;
    // remove currency symbol, spaces and thousand separators, replace comma with dot
    const cleaned = str
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplay(val);
    onValueChange(parseNumber(val));
  };

  const handleBlur = () => {
    setDisplay(formatter.format(value ?? 0));
  };

  const handleFocus = () => {
    // show plain number when focusing for easier editing
    setDisplay((value ?? 0).toString().replace('.', ','));
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9.,]*"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
    />
  );
}
