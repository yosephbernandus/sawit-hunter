export type QualityTier = 'high' | 'low';

export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);
}

export function getQualityTier(): QualityTier {
  if (isMobile()) return 'low';

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return 'low';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
    const lowEnd = /Mali-4|Adreno 3|Intel HD 4|SwiftShader/i.test(renderer);
    if (lowEnd) return 'low';
  }

  return 'high';
}
