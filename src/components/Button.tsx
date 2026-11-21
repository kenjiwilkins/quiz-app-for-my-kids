import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  size?: 'large' | 'small'
  block?: boolean
  children: ReactNode
}

export function Button({ variant = 'secondary', size = 'large', block = false, className, children, ...rest }: Props) {
  const classes = [
    styles.button,
    variant === 'primary' ? styles.primary : '',
    styles[size],
    block ? styles.block : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}
