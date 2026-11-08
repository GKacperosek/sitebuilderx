import sanitizeHtml from 'sanitize-html';
import { HttpError } from '../security';
import { safeStyleValue } from '../validation';

export function sanitizeSVG(input: string): string {
  if (input.length > 10 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(input) || !/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(input.replace(/^\uFEFF/, ''))) throw new HttpError(400, 'Invalid SVG image');
  const svg = sanitizeHtml(input.replace(/^\uFEFF/, ''), {
    allowedTags: ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'title', 'desc', 'use', 'symbol'],
    allowedAttributes: { '*': ['id', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'width', 'height', 'viewBox', 'xmlns', 'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'opacity', 'transform', 'preserveAspectRatio', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform', 'clip-path', 'mask', 'font-size', 'font-family', 'text-anchor', 'href', 'xlink:href'] },
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
    allowedSchemes: [], allowProtocolRelative: false,
    transformTags: { '*': (tagName, attribs) => {
      for (const [key, value] of Object.entries(attribs)) {
        if (['href', 'xlink:href'].includes(key) && !/^#[A-Za-z0-9_-]+$/.test(value)) delete attribs[key];
        else if (key === 'xmlns') { if (value !== 'http://www.w3.org/2000/svg') delete attribs[key]; }
        else if (/url\s*\(/i.test(value) && !/^url\(#[A-Za-z0-9_-]+\)$/.test(value)) delete attribs[key];
        else if (!['d', 'points', 'viewBox'].includes(key) && !safeStyleValue(value)) delete attribs[key];
      }
      return { tagName, attribs };
    } },
  });
  if (!/^\s*<svg[\s>]/.test(svg) || !/<\/svg>\s*$/.test(svg)) throw new HttpError(400, 'Invalid SVG image');
  return svg;
}
export function validateImage(buffer: Buffer): { buffer: Buffer; mime: string; ext: string } {
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new HttpError(413, 'Each image must be at most 10 MB');
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.toString('ascii', 12, 16) === 'IHDR') return { buffer, mime: 'image/png', ext: 'png' };
  if (buffer.length >= 12 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217) return { buffer, mime: 'image/jpeg', ext: 'jpg' };
  if (buffer.length >= 14 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)) && buffer[buffer.length - 1] === 59) return { buffer, mime: 'image/gif', ext: 'gif' };
  if (buffer.length >= 20 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16))) return { buffer, mime: 'image/webp', ext: 'webp' };
  const text = buffer.toString('utf8');
  if (/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text.replace(/^\uFEFF/, ''))) return { buffer: Buffer.from(sanitizeSVG(text)), mime: 'image/svg+xml', ext: 'svg' };
  throw new HttpError(400, 'Only valid PNG, JPEG, GIF, WebP and sanitized SVG images are accepted', 'INVALID_IMAGE');
}
