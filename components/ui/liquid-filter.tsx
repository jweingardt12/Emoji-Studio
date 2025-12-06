"use client"

/**
 * A global SVG filter definition for liquid glass refraction effects.
 * Based on techniques used in rdev/liquid-glass-react.
 * 
 * Usage:
 * 1. Include this component once in your app layout or the specific page.
 * 2. Use the CSS filter property: `filter: url(#liquid-displacement)`
 * 
 * Note: SVG filters can be performance-intensive. Use sparingly on mobile.
 */
export function LiquidFilter() {
    return (
        <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <defs>
                <filter id="liquid-displacement">
                    {/* 
            Generate turbulence noise. 
            baseFrequency: Controls the "roughness" of the liquid. Lower = larger waves.
            numOctaves: Detail level.
          */}
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.015"
                        numOctaves="3"
                        result="noise"
                    />

                    {/* 
            Displace the source graphic using the noise.
            scale: Intensity of the distortion.
            xChannelSelector/yChannelSelector: Which color channels drive the distortion.
          */}
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="8"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>

                <filter id="liquid-edge">
                    {/* High frequency noise for rough edges */}
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.5"
                        numOctaves="2"
                        result="noise"
                    />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="4"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </defs>
        </svg>
    )
}
