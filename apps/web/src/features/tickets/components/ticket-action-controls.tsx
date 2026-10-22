import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  actionGroupLabels,
  actionHints,
  actionPanelMessages,
} from '../action-i18n'
import { actionEmphasis } from '../domain/action-emphasis'
import type { ActionEmphasis } from '../domain/action-emphasis'
import { groupActions } from '../domain/action-groups'
import type { ActionGroup } from '../domain/action-groups'
import { pickPrimaryAction } from '../domain/actions'
import type { ActionKey } from '../domain/actions'
import { ticketMessages } from '../i18n'

const EMPHASIS_VARIANT = {
  primary: 'default',
  success: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'destructive',
  neutral: 'outline',
} as const satisfies Record<ActionEmphasis, string>

type ActionButtonVariant = (typeof EMPHASIS_VARIANT)[ActionEmphasis]

interface ActionInteractionProps {
  oneClick: Partial<Record<ActionKey, () => void>>
  pending: Partial<Record<ActionKey, boolean>>
  blocked: ActionKey[]
  onOpenForm: (action: ActionKey) => void
}

function ActionButton({
  action,
  variant,
  className,
  disabled,
  onClick,
}: {
  action: ActionKey
  variant: ActionButtonVariant
  className: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {ticketMessages.actions[action]}
    </Button>
  )
}

function PrimaryAction({
  action,
  disabled,
  onClick,
}: {
  action: ActionKey
  disabled: boolean
  onClick: () => void
}) {
  const danger = actionEmphasis(action) === 'danger'
  return (
    <section
      aria-labelledby="action-primary-title"
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-3',
        danger
          ? 'border-destructive/20 bg-destructive/5'
          : 'border-primary/20 bg-primary/5',
      )}
    >
      <h3
        id="action-primary-title"
        className={cn(
          'text-xs font-semibold tracking-wide uppercase',
          danger ? 'text-destructive' : 'text-primary',
        )}
      >
        {actionPanelMessages.primary}
      </h3>
      <ActionButton
        action={action}
        variant={danger ? 'destructive' : 'default'}
        className="min-h-12 w-full justify-center text-base"
        disabled={disabled}
        onClick={onClick}
      />
      {actionHints[action] ? (
        <p className="text-xs text-muted-foreground">{actionHints[action]}</p>
      ) : null}
    </section>
  )
}

function ActionGroupBlock({
  group,
  oneClick,
  pending,
  blocked,
  onOpenForm,
}: ActionInteractionProps & { group: ActionGroup }) {
  const run = (action: ActionKey) => () =>
    (oneClick[action] ?? (() => onOpenForm(action)))()
  const disabled = (action: ActionKey) =>
    Boolean(pending[action]) || blocked.includes(action)
  const titleId = `action-group-${group.key}`

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h3
        id={titleId}
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {actionGroupLabels[group.key]}
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {group.actions.map((action) => (
          <ActionButton
            key={action}
            action={action}
            variant={EMPHASIS_VARIANT[actionEmphasis(action)]}
            className="min-h-11 w-full justify-start"
            disabled={disabled(action)}
            onClick={run(action)}
          />
        ))}
      </div>
    </section>
  )
}

function SensitiveActions({
  group,
  oneClick,
  pending,
  blocked,
  onOpenForm,
}: ActionInteractionProps & { group: ActionGroup }) {
  const run = (action: ActionKey) => () =>
    (oneClick[action] ?? (() => onOpenForm(action)))()
  const disabled = (action: ActionKey) =>
    Boolean(pending[action]) || blocked.includes(action)

  return (
    <section
      aria-labelledby="action-group-sensitive"
      className="flex flex-col gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3"
    >
      <div className="flex flex-col gap-0.5">
        <h3
          id="action-group-sensitive"
          className="text-xs font-semibold tracking-wide text-destructive uppercase"
        >
          {actionGroupLabels.sensitive}
        </h3>
        <p className="text-xs text-foreground/75">
          {actionPanelMessages.sensitiveHelp}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {group.actions.map((action) => (
          <ActionButton
            key={action}
            action={action}
            variant="destructive"
            className="min-h-11 w-full justify-start"
            disabled={disabled(action)}
            onClick={run(action)}
          />
        ))}
      </div>
    </section>
  )
}

export interface ActionControlsProps extends ActionInteractionProps {
  visible: ActionKey[]
}

/** Acciones agrupadas por intención, con un único siguiente paso destacado. */
export function ActionControls(props: ActionControlsProps) {
  const primary = pickPrimaryAction(props.visible)
  const groups = groupActions(props.visible, primary)
  const sensitive = groups.find((group) => group.key === 'sensitive')
  const regular = groups.filter((group) => group.key !== 'sensitive')
  const disabled = (action: ActionKey) =>
    Boolean(props.pending[action]) || props.blocked.includes(action)
  const run = (action: ActionKey) => () =>
    (props.oneClick[action] ?? (() => props.onOpenForm(action)))()

  if (!primary && groups.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {primary ? (
        <PrimaryAction
          action={primary}
          disabled={disabled(primary)}
          onClick={run(primary)}
        />
      ) : null}
      {regular.map((group) => (
        <ActionGroupBlock key={group.key} group={group} {...props} />
      ))}
      {sensitive ? <SensitiveActions group={sensitive} {...props} /> : null}
    </div>
  )
}
