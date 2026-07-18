export type Slippage = '0.5' | '1' | '2'
export function SlippageSelector({ value, onChange }: { value: Slippage; onChange: (value: Slippage) => void }) {
  return <fieldset className="slippage-selector"><legend>Preview slippage</legend>{(['0.5', '1', '2'] as const).map((option) => <label key={option}><input type="radio" name="slippage" value={option} checked={value === option} onChange={() => onChange(option)} /><span>{option}%</span></label>)}</fieldset>
}
