import {
  hasHighlightImage,
  MUSCLE_HIGHLIGHT_IMAGES,
  MUSCLE_HIGHLIGHT_VIEW,
} from '../muscle-highlight-images';
import { MUSCLE_TARGETS_BY_GROUP } from '../muscle-data';

describe('muscle highlight images', () => {
  it('ships a pre-rendered plate for every workout muscle target', () => {
    for (const targets of Object.values(MUSCLE_TARGETS_BY_GROUP)) {
      for (const target of targets) {
        expect(hasHighlightImage(target.id)).toBe(true);
        expect(MUSCLE_HIGHLIGHT_IMAGES[target.id]).toBeDefined();
        expect(MUSCLE_HIGHLIGHT_VIEW[target.id]).toBeDefined();
      }
    }
  });
});
