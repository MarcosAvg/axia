import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { ticketMessages } from '../i18n'

const t = ticketMessages.inbox

/** Acción directa para tomar una oferta desde la bandeja. */
export function TakeOfferButton({ ticketId }: { ticketId: string }) {
  const { take } = useTicketActions(ticketId)
  return (
    <Button
      type="button"
      className="min-h-11"
      disabled={take.isPending}
      onClick={() =>
        take.mutate(
          {},
          {
            onSuccess: () => toast.success(t.takeSuccess),
            onError: () => toast.error(t.takeError),
          },
        )
      }
    >
      {take.isPending ? t.taking : ticketMessages.detail.takeOffer}
    </Button>
  )
}
