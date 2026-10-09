import { useEffect, useMemo, useRef } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import { CameraIcon, PaperclipIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/i18n'

/** URL de vista previa para imágenes, revocada al desmontar. */
function useFilePreview(file: File | null): string | null {
  const previewUrl = useMemo(
    () =>
      file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    [file],
  )
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )
  return previewUrl
}

function FilePreview({
  name,
  previewUrl,
  onRemove,
}: {
  name: string
  previewUrl: string | null
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="size-14 shrink-0 rounded-md object-cover"
        />
      ) : (
        <PaperclipIcon className="size-6 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {name}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
        {messages.fileField.remove}
      </Button>
    </div>
  )
}

function FileActions({
  hasFile,
  camera,
  onCamera,
  onChoose,
}: {
  hasFile: boolean
  camera: boolean
  onCamera: () => void
  onChoose: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {camera ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 lg:hidden"
          onClick={onCamera}
        >
          <CameraIcon />
          {messages.fileField.takePhoto}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={onChoose}
      >
        <PaperclipIcon />
        {hasFile ? messages.fileField.replace : messages.fileField.chooseFile}
      </Button>
    </div>
  )
}

function HiddenInputs({
  id,
  accept,
  cameraRef,
  fileRef,
  onChange,
}: {
  id: string
  accept: string
  cameraRef: RefObject<HTMLInputElement | null>
  fileRef: RefObject<HTMLInputElement | null>
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <>
      <input
        ref={cameraRef}
        id={`${id}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={onChange}
      />
      <input
        ref={fileRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={onChange}
      />
    </>
  )
}

interface FileFieldProps {
  id: string
  label: string
  file: File | null
  onChange: (file: File | null) => void
  /** Tipos aceptados por el selector de archivos (p. ej. `image/*,application/pdf`). */
  accept: string
  /** Mostrar el botón "Tomar foto" (abre la cámara en móvil). */
  camera?: boolean
  hint?: string
}

/**
 * Campo de archivo con botones visibles, acceso a la cámara en móvil y vista previa.
 * El `<input>` real queda oculto y se dispara desde el botón; el `label` va asociado a él.
 */
export function FileField({
  id,
  label,
  file,
  onChange,
  accept,
  camera = false,
  hint,
}: FileFieldProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const previewUrl = useFilePreview(file)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    event.target.value = ''
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {file ? (
        <FilePreview
          name={file.name}
          previewUrl={previewUrl}
          onRemove={() => onChange(null)}
        />
      ) : null}
      <FileActions
        hasFile={Boolean(file)}
        camera={camera}
        onCamera={() => cameraRef.current?.click()}
        onChoose={() => fileRef.current?.click()}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <HiddenInputs
        id={id}
        accept={accept}
        cameraRef={cameraRef}
        fileRef={fileRef}
        onChange={handleChange}
      />
    </div>
  )
}
