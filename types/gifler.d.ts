declare module 'gifler' {
  interface Frame {
    width: number
    height: number
    delay: number
    disposal: number
    transparency?: number
    patch: any
  }

  interface GiflerInstance {
    frames(
      canvas: HTMLCanvasElement,
      onFrame: (ctx: CanvasRenderingContext2D, frame: Frame) => boolean,
      decodeAll?: boolean
    ): Promise<void>
    
    animate(canvas: HTMLCanvasElement): void
    stop(): void
    reset(): void
  }

  function gifler(url: string): GiflerInstance

  export = gifler
}