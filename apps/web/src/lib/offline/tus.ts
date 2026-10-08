import { Upload } from 'tus-js-client'

export interface ResumableUploadParams {
  endpoint: string
  token: string
  bucket: string
  path: string
  blob: Blob
  mimeType: string
  onProgress?: (percentage: number) => void
}

/** Subida reanudable (TUS) a Supabase Storage; reintenta por tramos. */
export function uploadResumable(params: ResumableUploadParams): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new Upload(params.blob, {
      endpoint: params.endpoint,
      retryDelays: [0, 1000],
      headers: { authorization: `Bearer ${params.token}` },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: params.bucket,
        objectName: params.path,
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
