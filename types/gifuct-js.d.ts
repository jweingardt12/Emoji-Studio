declare module 'gifuct-js' {
  export interface GifFrame {
    dims: {
      top: number
      left: number
      width: number
      height: number
    }
    colorTable: number[]
    delay: number
    disposalType: number
    image: Uint8Array
    patch: Uint8Array
  }

  export interface ParsedGif {
    lsd: {
      width: number
      height: number
      gct: number[]
      backgroundColorIndex: number
      pixelAspectRatio: number
    }
    frames: any[]
  }

  export function parseGIF(arrayBuffer: ArrayBuffer): ParsedGif
  export function decompressFrames(parsedGif: ParsedGif, buildImagePatches: boolean): GifFrame[]
}