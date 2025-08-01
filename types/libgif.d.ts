declare module 'libgif' {
  interface SuperGifOptions {
    gif: HTMLImageElement
    auto_play?: boolean
    max_width?: number
    rubbable?: boolean
    on_end?: () => void
    loop_delay?: number
    draw_while_loading?: boolean
    show_progress_bar?: boolean
  }

  interface Frame {
    delay: number
    disposal: number
    transparency?: number
  }

  export class SuperGif {
    constructor(options: SuperGifOptions)
    
    load(callback?: () => void): void
    load_url(url: string, callback?: () => void): void
    play(): void
    pause(): void
    move_to(frame: number): void
    move_relative(delta: number): void
    get_canvas(): HTMLCanvasElement
    get_length(): number
    get_current_frame(): number
    get_frames(): Frame[]
    get_loading(): boolean
    get_auto_play(): boolean
    set_auto_play(auto_play: boolean): void
    get_player(): any
  }
}