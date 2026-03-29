import { describe, expect, it } from "vitest";
import {
  assertSafeWindowsShellArgs,
  resolveRunner,
  shouldUseShellForCommand,
} from "../../scripts/ui.js";

describe("scripts/ui windows spawn behavior", () => {
  it("enables shell for Windows command launchers that require cmd.exe", () => {
    expect(
      shouldUseShellForCommand("C:\\Users\\dev\\AppData\\Local\\pnpm\\pnpm.CMD", "win32"),
    ).toBe(true);
    expect(shouldUseShellForCommand("C:\\tools\\pnpm.bat", "win32")).toBe(true);
  });

  it("does not enable shell for non-shell launchers", () => {
    expect(shouldUseShellForCommand("C:\\Program Files\\nodejs\\node.exe", "win32")).toBe(false);
    expect(shouldUseShellForCommand("/usr/local/bin/pnpm", "linux")).toBe(false);
  });

  it("allows safe forwarded args when shell mode is required on Windows", () => {
    expect(() =>
      assertSafeWindowsShellArgs(["run", "build", "--filter", "@openclaw/ui"], "win32"),
    ).not.toThrow();
  });

  it("rejects dangerous forwarded args when shell mode is required on Windows", () => {
    expect(() => assertSafeWindowsShellArgs(["run", "build", "evil&calc"], "win32")).toThrow(
      /unsafe windows shell argument/i,
    );
    expect(() => assertSafeWindowsShellArgs(["run", "build", "%PATH%"], "win32")).toThrow(
      /unsafe windows shell argument/i,
    );
  });

  it("does not reject args on non-windows platforms", () => {
    expect(() => assertSafeWindowsShellArgs(["contains&metacharacters"], "linux")).not.toThrow();
  });
});

describe("scripts/ui runner resolution", () => {
  it("prefers pnpm when it is available", () => {
    const runner = resolveRunner((cmd) => {
      if (cmd === "pnpm") {
        return "/opt/bin/pnpm";
      }
      return null;
    });

    expect(runner).toEqual({ cmd: "/opt/bin/pnpm", args: [] });
  });

  it("falls back to corepack pnpm when pnpm is missing", () => {
    const runner = resolveRunner((cmd) => {
      if (cmd === "corepack") {
        return "/opt/bin/corepack";
      }
      return null;
    }, "/tmp/openclaw-corepack-test");

    expect(runner).toMatchObject({
      cmd: "/opt/bin/corepack",
      args: ["pnpm"],
      env: { COREPACK_HOME: "/tmp/openclaw-corepack-test" },
    });
  });

  it("returns null when neither pnpm nor corepack is available", () => {
    expect(resolveRunner(() => null)).toBeNull();
  });
});
