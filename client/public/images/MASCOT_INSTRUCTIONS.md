# Rally - Official Rug Killer Mascot 🎀

## Meet Rally!
Rally is the vibrant, energetic mascot of Rug Killer Alpha Bot - an anime-style character with colorful dual-tone hair (pink and blue) who represents our mission to protect the Solana community from rug pulls!

## Image Files

### Main Mascot
**Filename**: `rally-mascot.png`
**Location**: `/client/public/images/rally-mascot.png`
**Specifications**:
- Format: PNG with transparency
- Source: Anime-style character with dual-tone pigtails
- Display size: 500x500px
- Opacity: 18% (automatically applied via CSS)
- Position: Bottom left corner
- Effect: Gentle floating animation

### Favicon
**Filename**: `rally-favicon.png`
**Location**: `/client/public/rally-favicon.png`
**Specifications**:
- Format: PNG
- Recommended size: 512x512px (will be scaled down by browser)
- Used as browser tab icon

## Current Implementation
Rally has been integrated into:
- ✅ Main home page (`/`) - floating in bottom left
- ✅ Landing page (`/landing`) - floating in bottom left
- ✅ Browser favicon (tab icon)
- ✅ CSS animations (gentle floating effect)
- ✅ Positioned to enhance, not overpower content

## Character Design
- **Hair**: Dark base with bright pink and blue dual-tone pigtails
- **Eyes**: Vibrant pink/magenta
- **Outfit**: Purple crop top, black jacket
- **Style**: Modern anime aesthetic with energetic personality
- **Vibe**: Protective, vigilant, community-focused

## How It Works
1. The mascot image is referenced in CSS via `.mascot-background` class
2. Automatically applies faded appearance (18% opacity)
3. Floating animation runs continuously
4. Appears on landing/home pages when no token analysis is shown
5. Favicon appears in all browser tabs

Rally represents our commitment to keeping the Solana community safe! 💜🔐
