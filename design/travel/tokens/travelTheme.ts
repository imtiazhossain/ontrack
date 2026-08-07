export const travelTheme = {
  layout: { screenHorizontalPadding: 20, sectionGap: 16, cardGap: 16 },
  hero: { minHeight: 0, titleTopOffset: 12, backgroundFadeHeight: 96, blurRadius: 6 },
  card: {
    radius: 28,
    imageHeight: 193,
    imageAspect: 2.05,
    contentPadding: 18,
    imageContentOverlap: 0,
  },
  avatar: { size: 44, overlap: 12, borderWidth: 2 },
  editButton: { size: 44, inset: 14 },
  itineraryButton: {
    height: 48,
    maxWidth: 176,
    radius: 12,
    iconSize: 20,
    horizontalPadding: 12,
  },
  carousel: { activeDot: 7, inactiveDot: 5, dotGap: 6, bottomInset: 10 },
  motion: { heroCrossfadeMs: 350, cardPressMs: 120 },
  referenceWidth: 863,
} as const;
