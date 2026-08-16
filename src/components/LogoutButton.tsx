import { useNavigate } from 'react-router-dom'
import { useSession } from '../auth/session'
import { useConfirmDialog } from './ConfirmDialog'
import { Icon } from './Icon'

type LogoutButtonProps = {
  className?: string
  iconOnly?: boolean
}

export function LogoutButton({ className, iconOnly }: LogoutButtonProps) {
  const { logout } = useSession()
  const navigate = useNavigate()
  const { ask, dialog } = useConfirmDialog()

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="Log out"
        onClick={() => {
          void ask({
            title: 'Log out?',
            body: 'You will need to sign in again to book or manage appointments.',
            confirmLabel: 'Log out',
            danger: true,
          }).then((ok) => {
            if (!ok) return
            return logout().then(() => navigate('/login'))
          })
        }}
      >
        <Icon name="logout" />
        {iconOnly ? null : 'Log out'}
      </button>
      {dialog}
    </>
  )
}
