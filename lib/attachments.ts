export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

export class AttachmentTooLargeError extends Error {
  constructor(fileName: string, originalSize: number) {
    super(
      `${fileName} is ${formatFileSize(originalSize)}. It could not be compressed below ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`
    );
    this.name = "AttachmentTooLargeError";
  }
}

type PreparedAttachmentFile = {
  file: File;
  compressed: boolean;
  originalSize: number;
};

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatAttachmentType(contentType?: string) {
  if (!contentType) return "File";
  const [group, subtype] = contentType.split("/");
  if (subtype) return subtype.replace(/[.+-]/g, " ").toUpperCase();
  return group.toUpperCase();
}

export async function prepareAttachmentForUpload(
  file: File
): Promise<PreparedAttachmentFile> {
  if (file.size <= MAX_ATTACHMENT_BYTES) {
    return { file, compressed: false, originalSize: file.size };
  }

  const candidates: File[] = [];
  const imageFile = await compressImageFile(file);
  if (imageFile) candidates.push(imageFile);

  const gzipFile = await compressWithGzip(file);
  if (gzipFile) candidates.push(gzipFile);

  const bestCandidate = candidates
    .filter((candidate) => candidate.size <= MAX_ATTACHMENT_BYTES)
    .sort((a, b) => a.size - b.size)[0];

  if (!bestCandidate) {
    throw new AttachmentTooLargeError(file.name, file.size);
  }

  return { file: bestCandidate, compressed: true, originalSize: file.size };
}

async function compressImageFile(file: File) {
  if (!file.type.startsWith("image/")) return null;

  try {
    const image = await loadImage(file);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    const maxDimensions = [2200, 1800, 1400, 1100, 900, 700];
    const qualities = [0.82, 0.72, 0.62, 0.52, 0.42];
    let smallestFile: File | null = null;

    for (const maxDimension of maxDimensions) {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, "image/webp", quality);
        if (!blob) continue;
        const compressed = new File([blob], replaceExtension(file.name, "webp"), {
          type: "image/webp",
          lastModified: Date.now(),
        });
        if (!smallestFile || compressed.size < smallestFile.size) {
          smallestFile = compressed;
        }
        if (compressed.size <= MAX_ATTACHMENT_BYTES) {
          return compressed;
        }
      }
    }

    return smallestFile && smallestFile.size < file.size ? smallestFile : null;
  } catch {
    return null;
  }
}

async function compressWithGzip(file: File) {
  type CompressionStreamConstructor = new (
    format: "gzip"
  ) => TransformStream<Uint8Array, Uint8Array>;
  const CompressionStreamClass = (
    globalThis as typeof globalThis & {
      CompressionStream?: CompressionStreamConstructor;
    }
  ).CompressionStream;
  if (!CompressionStreamClass || typeof file.stream !== "function") return null;

  try {
    const compressedStream = file
      .stream()
      .pipeThrough(new CompressionStreamClass("gzip"));
    const blob = await new Response(compressedStream).blob();
    if (blob.size >= file.size) return null;
    return new File([blob], `${file.name}.gz`, {
      type: "application/gzip",
      lastModified: Date.now(),
    });
  } catch {
    return null;
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be loaded"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function replaceExtension(fileName: string, extension: string) {
  const cleanedExtension = extension.replace(/^\./, "");
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return `${fileName}.${cleanedExtension}`;
  return `${fileName.slice(0, dotIndex)}.${cleanedExtension}`;
}
