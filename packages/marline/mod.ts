import exitHook from "exit-hook";
import process from "node:process";
import type { WriteStream } from "node:tty";

/**
 * ANSI escape sequences for terminal manipulation
 */
const ansiEscapes = {
  eraseLine: "\x1B[2K",
  cursorDown: (count: number = 1) => `\x1B[${count}B`,
  cursorUp: (count: number = 1) => `\x1B[${count}A`,
  cursorTo: (x: number, y: number) => `\x1B[${y};${x}H`,
  setTopBottomMargin: (top: number = 1, bottom?: number) =>
    `\x1B[${top};${bottom || ""}r`,
  resetTopBottomMargin: `\x1B[;r`,
  cursorSavePosition: "\x1B7",
  cursorRestorePosition: "\x1B8",
};

/**
 * Interface representing terminal dimensions
 */
export interface ITermSize {
  /** Number of rows in the terminal */
  rows: number;
  /** Number of columns in the terminal */
  columns: number;
}

/**
 * Manages an array of lines with dirty state tracking for efficient rendering
 */
export class MarlineLineArray {
  private readonly buffer: string[];
  private readonly dirty: boolean[];

  /**
   * Creates a new MarlineLineArray with the specified length
   * @param length - The number of lines to manage
   */
  constructor(public readonly length: number) {
    this.buffer = new Array(length).fill("");
    this.dirty = new Array(length).fill(false);
  }

  /**
   * Sets the text content of a line at the specified index
   * @param index - The line index to set
   * @param text - The text content to set (converted to string, empty string if null/undefined)
   */
  public set(index: number, text?: string | null | undefined) {
    text = String(text || "");
    if (this.buffer[index] === text) return;
    this.buffer[index] = text;
    this.dirty[index] = true;
  }

  /**
   * Gets the text content of a line at the specified index
   * @param index - The line index to get
   * @returns The text content of the line
   * @throws {Error} If the index is out of range
   */
  public get(index: number): string {
    if (index < 0 || index >= this.length) {
      throw new Error(`index out of range: ${index}`);
    }
    return this.buffer[index]!;
  }

  /**
   * Checks if a line at the specified index has been modified since last render
   * @param index - The line index to check
   * @returns True if the line is dirty (needs re-rendering)
   * @throws {Error} If the index is out of range
   */
  public isDirty(index: number): boolean {
    if (index < 0 || index >= this.length) {
      throw new Error(`index out of range: ${index}`);
    }
    return this.dirty[index]!;
  }

  /**
   * Marks a line as clean (not dirty) after rendering
   * @param index - The line index to mark as clean
   * @throws {Error} If the index is out of range
   * @internal
   */
  public _cleanDirty(index: number): void {
    if (index < 0 || index >= this.length) {
      throw new Error(`index out of range: ${index}`);
    }
    this.dirty[index] = false;
  }

  /**
   * Clears all lines and marks them as dirty for full re-render
   */
  public clean() {
    this.dirty.fill(true);
    this.buffer.fill("");
  }
}

/**
 * Callback function type for custom rendering logic
 * @param this - The Marline instance
 * @param marline - The Marline instance
 * @param width - The current terminal width
 * @returns Any value (typically ignored)
 */
export type MarlineRenderCallback = (
  this: Marline,
  marline: Marline,
  width: number,
) => unknown;

/**
 * Marline - tool for managing terminal margin rendering.
 *
 * Provides functionality to reserve space at the top and bottom of the terminal
 * and efficiently render content in those reserved areas.
 *
 * See [demo](./demo.ts) for usage example.
 */
export class Marline {
  /** The output stream to write to (defaults to stderr) */
  readonly stream: WriteStream;
  /** Number of lines reserved at the bottom of the terminal */
  readonly marginBottom: number;
  /** Number of lines reserved at the top of the terminal */
  readonly marginTop: number;
  /** Array managing the top margin lines */
  readonly top: MarlineLineArray;
  /** Array managing the bottom margin lines */
  readonly bottom: MarlineLineArray;
  /** Whether the terminal supports the required features */
  readonly isAvailable: boolean;
  private renderCallback?: MarlineRenderCallback;

  /**
   * Creates a new Marline instance
   * @param options - Configuration options
   * @param options.stream - The output stream (defaults to process.stderr)
   * @param options.marginBottom - Number of lines to reserve at bottom (defaults to 1)
   * @param options.marginTop - Number of lines to reserve at top (defaults to 0)
   * @param options.render - Optional callback function for custom rendering logic
   */
  constructor(options: {
    stream?: WriteStream;
    marginBottom?: number;
    marginTop?: number;
    render?: MarlineRenderCallback;
  } = {}) {
    this.stream = options.stream || process.stderr;
    this.isAvailable = false;
    do {
      if (!this.stream.isTTY) break;

      this._termSize = this.getTermSize();
      if (!this._termSize) break;

      this.isAvailable = true;
    } while (false);

    this.marginBottom = options.marginBottom === undefined
      ? 1
      : options.marginBottom;
    this.marginTop = options.marginTop === undefined ? 0 : options.marginTop;

    this.top = new MarlineLineArray(this.marginTop);
    this.bottom = new MarlineLineArray(this.marginBottom);

    this.renderCallback = options.render;
  }

  /**
   * Gets the current terminal size from the stream
   * @returns Terminal size object or undefined if not available
   * @private
   */
  private getTermSize(): ITermSize | undefined {
    if (this.stream && this.stream.columns && this.stream.rows) {
      return { columns: this.stream.columns, rows: this.stream.rows };
    }
    return undefined;
  }

  private _termSize?: ITermSize | undefined;

  /**
   * Gets the current terminal size
   * @returns Terminal size object or undefined if not available
   */
  get termSize(): ITermSize | undefined {
    return this._termSize;
  }

  /**
   * Gets the current terminal width
   * @returns Terminal width in columns, or 0 if not available
   */
  get width(): number {
    return this._termSize ? this._termSize.columns : 0;
  }

  private handleStdoutResize$ = this.handleStdoutResize.bind(this);

  /**
   * Handles terminal resize events
   * @private
   */
  private handleStdoutResize() {
    if (!this.isAvailable) return;

    this._termSize = this.getTermSize();
    if (this._started) {
      this.setMargin();
      this.refresh(true);
    }
  }

  private _started: boolean = false;

  /**
   * Gets whether the Marline instance is currently started and active
   * @returns True if the instance is started
   */
  get started(): boolean {
    return this._started;
  }

  private _resizeListened: boolean = false;

  /**
   * Starts the Marline instance and sets up terminal margins
   * @throws {Error} If another Marline instance is already running
   */
  start() {
    if (!this.isAvailable) return;
    if (this._started) return;
    if (activeMarline) throw new Error("Another Marline instance is running.");
    installExitHook();
    this._started = true;
    activeMarline = this;
    if (!this._resizeListened) {
      this._resizeListened = true;
      this.stream.addListener("resize", this.handleStdoutResize$);
    }

    this.handleStdoutResize();
    this.setMargin();
    this.redrawInternal(true);
  }

  /**
   * Stops the Marline instance and restores terminal to normal state
   */
  stop() {
    if (!this._started) return;
    this._started = false;
    activeMarline = null;

    if (this._resizeListened) {
      if (this.stream.removeListener) {
        try {
          this.stream.removeListener("resize", this.handleStdoutResize$);
          this._resizeListened = false;
        } catch {
          // ignore
        }
      }
    }

    if (!this.isAvailable) return;
    this.resetMargin();
    this.top.clean();
    this.bottom.clean();
    this.redrawInternal(true);
  }

  /**
   * Checks if drawing operations are possible
   * @private
   */
  private get canDraw(): boolean {
    return this.isAvailable && !!this._termSize;
  }

  /**
   * Sets up terminal margins using ANSI escape sequences
   * @private
   */
  private setMargin() {
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(ansiEscapes.cursorSavePosition);
    seq.push(ansiEscapes.resetTopBottomMargin);
    seq.push(ansiEscapes.cursorRestorePosition);
    if (this.marginBottom > 0) {
      seq.push(ansiEscapes.cursorSavePosition);
      for (let i = 0; i < this.marginBottom; i++) {
        seq.push(`\n`);
      }
      seq.push(ansiEscapes.cursorRestorePosition);
      seq.push(ansiEscapes.cursorDown(this.marginBottom));
      seq.push(ansiEscapes.cursorUp(this.marginBottom));
    }
    seq.push(ansiEscapes.cursorSavePosition);
    seq.push(
      ansiEscapes.setTopBottomMargin(
        1 + this.marginTop,
        this._termSize!.rows - this.marginBottom,
      ),
    );
    seq.push(ansiEscapes.cursorRestorePosition);
    this.stream.write(seq.join(""));
  }

  /**
   * Resets terminal margins to normal state
   * @private
   */
  private resetMargin() {
    if (!this.canDraw) return;

    const seq: string[] = [];
    seq.push(ansiEscapes.cursorSavePosition);
    seq.push(ansiEscapes.resetTopBottomMargin);
    seq.push(ansiEscapes.cursorRestorePosition);

    this.stream.write(seq.join(""));
  }

  /**
   * Refreshes the display by calling the render callback and redrawing
   * @param force - Whether to force redraw all lines regardless of dirty state
   */
  public refresh(force: boolean = false) {
    if (!this._started) return;
    if (this.renderCallback) this.renderCallback.call(this, this, this.width);
    this.redrawInternal(force);
  }

  /**
   * Redraws the display without calling the render callback
   * @param force - Whether to force redraw all lines regardless of dirty state
   */
  public redraw(force: boolean = false) {
    if (!this._started) return;
    this.redrawInternal(force);
  }

  /**
   * Internal method to redraw the display
   * @param force - Whether to force redraw all lines regardless of dirty state
   * @private
   */
  private redrawInternal(force: boolean = false) {
    if (!this.canDraw) return;

    const seq: string[] = [];
    const topIndexes: number[] = [];
    const bottomIndexes: number[] = [];

    seq.push(ansiEscapes.cursorSavePosition);

    for (let i = 0; i < this.marginTop; i++) {
      if (!force && !this.top.isDirty(i)) continue;
      topIndexes.push(i);
      seq.push(this.redrawTopLineSeq(i));
    }

    for (let i = 0; i < this.marginBottom; i++) {
      if (!force && !this.bottom.isDirty(i)) continue;
      bottomIndexes.push(i);
      seq.push(this.redrawBottomLineSeq(i));
    }

    seq.push(ansiEscapes.cursorRestorePosition);

    if (topIndexes.length === 0 && bottomIndexes.length === 0) return;
    this.stream.write(seq.join(""));

    for (const i of topIndexes) this.top._cleanDirty(i);
    for (const i of bottomIndexes) this.bottom._cleanDirty(i);
  }

  /**
   * Generates ANSI escape sequence for redrawing a top margin line
   * @param index - The line index to redraw
   * @returns ANSI escape sequence string
   * @private
   */
  private redrawTopLineSeq(index: number): string {
    return ansiEscapes.cursorTo(1, index + 1) +
      ansiEscapes.eraseLine +
      this.top.get(index);
  }

  /**
   * Generates ANSI escape sequence for redrawing a bottom margin line
   * @param index - The line index to redraw
   * @returns ANSI escape sequence string
   * @private
   */
  private redrawBottomLineSeq(index: number): string {
    return ansiEscapes.cursorTo(
      1,
      this._termSize!.rows - this.marginBottom + index + 1,
    ) +
      ansiEscapes.eraseLine +
      this.bottom.get(index);
  }
}

/** Currently active Marline instance (only one can be active at a time) */
let activeMarline: Marline | null = null;
/** Whether the exit hook has been installed */
let exitHookInstalled = false;

/**
 * Installs a hook to clean up the active Marline instance on process exit
 */
function installExitHook() {
  if (exitHookInstalled) return;

  exitHookInstalled = true;
  exitHook(() => {
    if (activeMarline) activeMarline.stop();
  });
}
