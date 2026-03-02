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
  const [isFocused, setIsFocused] = React.useState(false);
  const [rawInput, setRawInput] = React.useState('');

  // format number for display when not focused
  const formattedValue = formatter.format(value ?? 0);
  
  // when focused, show plain editable number with comma as decimal separator
  const editableValue = React.useMemo(() => {
    if (value === 0) return '';
    // ensure minus sign preserved
    const str = value.toFixed(2).replace('.', ',');
    return str;
  }, [value]);

  const parseInput = (str: string): number => {
    if (!str || str === '' || str === '0' || str === '0,00' || str === '-') return 0;
    // accept comma as decimal separator in Brazilian format (pt-BR)
    // remove everything except digits, comma, dot and minus
    let cleaned = str.replace(/[^0-9,.-]/g, '');
    // if there are multiple minus signs, strip extras
    const minusCount = (cleaned.match(/-/g) || []).length;
    if (minusCount > 1) cleaned = cleaned.replace(/-/g, '');
    // move minus to start if not already
    if (cleaned.includes('-') && !cleaned.startsWith('-')) {
      cleaned = '-' + cleaned.replace(/-/g, '');
    }
    // Brazilian format: dots are thousand separators (remove them), comma is decimal separator
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setRawInput(editableValue);
    // select all on focus for easy replacement
    setTimeout(() => e.target.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInput(rawInput);
    onValueChange(parsed);
    setRawInput('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setRawInput(input);
    // update parent value in real-time for calculations
    const parsed = parseInput(input);
    onValueChange(parsed);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      pattern="-?[0-9.,]*"
      value={isFocused ? rawInput : formattedValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="0,00"
    />
  );
}
