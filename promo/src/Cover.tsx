import { loadFonts } from './fonts';
import { CoverArt } from './Scenes';

loadFonts();

export function Cover() {
  return <CoverArt />;
}
