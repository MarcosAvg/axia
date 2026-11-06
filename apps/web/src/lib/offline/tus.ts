import { Upload } from 'tus-js-client'

export interface ResumableUploadParams {
  endpoint: string
  evidenceId: string
  ticketId: string
  blob: Blob
  mimeType: string
  onProgress?: (percentage: number) => void
}

export interface AttachmentUploadParams {
  endpoint: string
  attachmentId: string
  blob: Blob
  mimeType: string
  onProgress?: (percentage: number) => void
}

function progressHandler(callback?: (percentage: number) => void) {
  return (bytesSent: number, bytesTotal: number) => {
    if (callback && bytesTotal > 0) {
      callback(Math.round((bytesSent / bytesTotal) * 100))
    }
  }
}

/** Subida reanudable de un adjunto (TUS); la sesión viaja en la cookie. */
export function uploadAttachmentResumable(
  params: AttachmentUploadParams,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new Upload(params.blob, {
      endpoint: params.endpoint,
      retryDelays: [0, 1000],
      onBeforeRequest: (request) => {
        const xhr = request.getUnderlyingObject() as XMLHttpRequest
        xhr.withCredentials = true
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        attachmentId: params.attachmentId,
        contentType: params.mimeType,
      },
      onProgress: progressHandler(params.onProgress),
      onError: (error) => reject(error),
      onSuccess: () => resolve(),
    })
    upload.start()
  })
}

/** Subida reanudable (TUS) al servidor de Axia; la sesión viaja en la cookie. */
export function uploadResumable(params: ResumableUploadParams): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new Upload(params.blob, {
      endpoint: params.endpoint,
      retryDelays: [0, 1000],
      onBeforeRequest: (request) => {
        const xhr = request.getUnderlyingObject() as XMLHttpRequest
        xhr.withCredentials = true
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        evidenceId: params.evidenceId,
        ticketId: params.ticketId,
        contentType: params.mimeType,
      },
      onProgress: progressHandler(params.onProgress),
      onError: (error) => reject(error),
      onSuccess: () => resolve(),
    })
    upload.start()
  })
}
