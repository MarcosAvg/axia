import { Button } from '@/components/ui/button'

export function TakeOfferBanner({
  pending,
  onTake,
}: {
  pending: boolean
  onTake: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">
          Tienes una oferta para este tiquet
        </p>
        <p className="text-xs text-muted-foreground">
          Tómalo para asignarlo y continuar con la atención.
        </p>
      </div>
      <Button
        type="button"
        className="min-h-11"
        disabled={pending}
        onClick={onTake}
      >
        Tomar tiquet
      </Button>
    </div>
  )
}
