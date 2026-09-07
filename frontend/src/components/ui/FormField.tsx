import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'

interface BaseProps {
  label?: string
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
  /** آیکون یا دکمه‌ای که ابتدای ورودی (سمت راست در RTL) می‌نشیند */
  prefix?: ReactNode
  /** آیکون یا دکمه‌ای که انتهای ورودی (سمت چپ در RTL) می‌نشیند */
  suffix?: ReactNode
  /** ورودی کد یک‌بارمصرف: وسط‌چین با فاصله بین ارقام */
  code?: boolean
}

type InputProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'prefix'>

/** ورودی متنی با برچسب، پیام خطا و اتصال درست ARIA */
export const FormField = forwardRef<HTMLInputElement, InputProps>(function FormField(
  { label, error, hint, required, className = '', prefix, suffix, code, id, ...rest },
  ref,
) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  const inputClasses = [
    'input-field',
    error ? 'is-invalid' : '',
    prefix ? 'has-prefix' : '',
    suffix ? 'has-suffix' : '',
    code ? 'is-code' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="form-label">
          {label}
          {required && <span className="required" aria-hidden>*</span>}
        </label>
      )}
      <div className="form-field__control">
        {prefix && <span className="form-field__affix form-field__affix--start">{prefix}</span>}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-required={required || undefined}
          aria-invalid={!!error}
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          className={inputClasses}
          {...rest}
        />
        {suffix && <span className="form-field__affix form-field__affix--end">{suffix}</span>}
      </div>
      {hint && !error && <p id={hintId} className="form-hint">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="form-error">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
})

type AreaProps = BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>

export const FormTextarea = forwardRef<HTMLTextAreaElement, AreaProps>(function FormTextarea(
  { label, error, hint, required, className = '', id, rows = 5, ...rest },
  ref,
) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="form-label">
          {label}
          {required && <span className="required" aria-hidden>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        className={`input-field ${error ? 'is-invalid' : ''}`}
        style={{ minHeight: 'unset', resize: 'vertical' }}
        {...rest}
      />
      {hint && !error && <p id={hintId} className="form-hint">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="form-error">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
})

interface SelectOption {
  value: string | number
  label: string
}

type SelectProps = BaseProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  options: SelectOption[]
  placeholder?: string
}

export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(function FormSelect(
  { label, error, hint, required, className = '', id, options, placeholder, ...rest },
  ref,
) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="form-label">
          {label}
          {required && <span className="required" aria-hidden>*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        className={`input-field is-select ${error ? 'is-invalid' : ''}`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {hint && !error && <p id={hintId} className="form-hint">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="form-error">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
})

interface SwitchProps {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  className?: string
}

/** کلید روشن/خاموش برای فیلدهای بولی پنل مدیر. */
export function FormSwitch({ label, hint, checked, onChange, disabled, className = '' }: SwitchProps) {
  return (
    <div className={`form-switch ${className}`}>
      <span className="min-w-0">
        <span className="form-switch__label">{label}</span>
        {hint && <span className="form-hint block mt-1">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`filter-switch ${checked ? 'is-active' : ''}`}
      >
        <span />
      </button>
    </div>
  )
}

export default FormField
