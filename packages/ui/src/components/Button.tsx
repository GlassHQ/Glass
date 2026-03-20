import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

const variants = {
  cta: styles.cta,
  submit: styles.submit,
  inverse: styles.inverse,
  outline: styles.outline,
  text: styles.text,
} as const

export type ButtonVariant = keyof typeof variants

export type ButtonProps = {
  variant?: ButtonVariant
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant = 'cta',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const v = variants[variant]
  return (
    <button
      type={type}
      className={[v, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
