declare module 'omggif' {
  export class GifReader {
    constructor(buf: Uint8Array);
    width: number;
    height: number;
    numFrames(): number;
    frameInfo(frame_num: number): {
      x: number;
      y: number;
      width: number;
      height: number;
      disposal: number;
      delay: number;
      transparentIndex?: number;
    };
    decodeAndBlitFrameRGBA(frame_num: number, pixels: Uint8ClampedArray): void;
  }
}