interface ImageGeneratingProps {
  label?: string;
}

export function ImageGenerating({ label = "Libraix is rendering…" }: ImageGeneratingProps) {
  return (
    <div className="image-generating" role="status" aria-live="polite">
      <div className="image-generating-shimmer" />
      <div className="image-generating-label">
        <span className="image-generating-spinner" aria-hidden />
        {label}
      </div>
      <p className="image-generating-hint">Libraix Image — usually 10–25 seconds</p>
    </div>
  );
}
