// Twitter card reuses the OG composition. Next.js requires these constants
// to be statically declared, so we re-declare them here (cannot be aliased
// from the OG file).
import OGImage from './opengraph-image';

export const runtime = 'edge';
export const alt = 'Clud Bug — a field guide to specimens crawling your code';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default OGImage;
