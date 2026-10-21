import { Upload } from 'tus-js-client'

export interface ResumableUploadParams {
  endpoint: string
  evidenceId: string
  ticketId: string
  blob: Blob
  mimeType: string
  onProgress?: (percentage: number) => void
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
      onProgress: (bytesSent, bytesTotal) => {
        if (params.onProgress && bytesTotal > 0) {
          params.onProgress(Math.round((bytesSent / bytesTotal) * 100))
        }
      },
      onError: (error) => reject(error),
      onSuccess: () => resolve(),
    })
    upload.start()
  })
}
