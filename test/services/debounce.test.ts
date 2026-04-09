import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScanDebouncer } from "../../src/services/debounce.js";

describe("ScanDebouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires callback after the window", () => {
    const onFire = vi.fn();
    const debouncer = new ScanDebouncer(5000, onFire);

    debouncer.schedule("/movies/Foo", "1");
    expect(onFire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(onFire).toHaveBeenCalledOnce();
    expect(onFire).toHaveBeenCalledWith("/movies/Foo", "1");
  });

  it("resets timer on re-schedule for the same path", () => {
    const onFire = vi.fn();
    const debouncer = new ScanDebouncer(5000, onFire);

    debouncer.schedule("/tv/Breaking Bad", "2");
    vi.advanceTimersByTime(3000);
    debouncer.schedule("/tv/Breaking Bad", "2");
    vi.advanceTimersByTime(3000);

    expect(onFire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(onFire).toHaveBeenCalledOnce();
  });

  it("handles multiple independent paths", () => {
    const onFire = vi.fn();
    const debouncer = new ScanDebouncer(5000, onFire);

    debouncer.schedule("/movies/A", "1");
    debouncer.schedule("/tv/B", "2");

    vi.advanceTimersByTime(5000);

    expect(onFire).toHaveBeenCalledTimes(2);
    expect(onFire).toHaveBeenCalledWith("/movies/A", "1");
    expect(onFire).toHaveBeenCalledWith("/tv/B", "2");
  });

  it("tracks pending count", () => {
    const onFire = vi.fn();
    const debouncer = new ScanDebouncer(5000, onFire);

    expect(debouncer.pending).toBe(0);

    debouncer.schedule("/movies/A", "1");
    debouncer.schedule("/tv/B", "2");
    expect(debouncer.pending).toBe(2);

    vi.advanceTimersByTime(5000);
    expect(debouncer.pending).toBe(0);
  });

  it("clears all pending timers", () => {
    const onFire = vi.fn();
    const debouncer = new ScanDebouncer(5000, onFire);

    debouncer.schedule("/movies/A", "1");
    debouncer.schedule("/tv/B", "2");
    debouncer.clear();

    vi.advanceTimersByTime(10000);
    expect(onFire).not.toHaveBeenCalled();
    expect(debouncer.pending).toBe(0);
  });
});
