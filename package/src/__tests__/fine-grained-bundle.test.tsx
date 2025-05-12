// @ts-nocheck
// ai written test
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useShikiHighlighter } from "../hook";
import { createFineGrainedBundle } from "../bundle";
import React from "react";
import type { HighlighterOptions } from "../types";

// Mock the bundle module
vi.mock("../bundle", () => ({
  createFineGrainedBundle: vi.fn(),
}));

// Mock the toJsxRuntime function to avoid full rendering
vi.mock("hast-util-to-jsx-runtime", () => ({
  toJsxRuntime: vi
    .fn()
    .mockImplementation(() => <div data-testid="mocked-hast">Mocked HAST</div>),
}));

// Helper component for testing useShikiHighlighter hook
const TestComponent = ({
  code,
  language,
  theme,
  options,
}: {
  code: string;
  language: any;
  theme: any;
  options?: HighlighterOptions;
}) => {
  const highlighted = useShikiHighlighter(code, language, theme, options);
  return <div data-testid="test-component">{highlighted}</div>;
};

describe("Fine-grained bundle", () => {
  const mockCodeToHast = vi
    .fn()
    .mockResolvedValue({ type: "element", tagName: "div" });

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock the bundle with a predefined codeToHast function
    (createFineGrainedBundle as any).mockResolvedValue({
      codeToHast: mockCodeToHast,
      bundledLanguages: {},
      bundledThemes: {},
    });
  });

  it("should use createCodegenBundle when fineGrainedBundle is provided", async () => {
    const code = 'const test = "Hello";';
    const fineGrainedBundle = {
      langs: ["typescript"],
      themes: ["github-dark"],
      engine: "javascript" as const,
    };

    render(
      <TestComponent
        code={code}
        language="typescript"
        theme="github-dark"
        options={{ fineGrainedBundle }}
      />
    );

    // Wait for the asynchronous operations to complete
    await waitFor(() => {
      // Include precompiled: false when checking call arguments
      expect(createFineGrainedBundle).toHaveBeenCalledWith({
        ...fineGrainedBundle,
        precompiled: false,
      });
      expect(mockCodeToHast).toHaveBeenCalled();
    });
  });

  it("should cache the bundle for the same configuration", async () => {
    const code = 'const test = "Hello";';
    const fineGrainedBundle = {
      langs: ["typescript"],
      themes: ["github-dark"],
      engine: "javascript" as const,
    };

    // Render with the same config twice
    const { rerender } = render(
      <TestComponent
        code={code}
        language="typescript"
        theme="github-dark"
        options={{ fineGrainedBundle }}
      />
    );

    await waitFor(() => {
      expect(createFineGrainedBundle).toHaveBeenCalledTimes(1);
    });

    // Re-render with same config
    rerender(
      <TestComponent
        code={code + "// new comment"}
        language="typescript"
        theme="github-dark"
        options={{ fineGrainedBundle }}
      />
    );

    // Should not create a new bundle
    await waitFor(() => {
      expect(createFineGrainedBundle).toHaveBeenCalledTimes(1);
    });
  });

  it("should create a new bundle when configuration changes", async () => {
    const code = 'const test = "Hello";';
    const fineGrainedBundle1 = {
      langs: ["typescript"],
      themes: ["github-dark"],
      engine: "javascript" as const,
    };

    const fineGrainedBundle2 = {
      langs: ["typescript", "javascript"],
      themes: ["github-dark", "github-light"],
      engine: "javascript" as const,
    };

    // Render with first config
    const { rerender } = render(
      <TestComponent
        code={code}
        language="typescript"
        theme="github-dark"
        options={{ fineGrainedBundle: fineGrainedBundle1 }}
      />
    );

    await waitFor(() => {
      // Include precompiled: false when checking call arguments
      expect(createFineGrainedBundle).toHaveBeenCalledWith({
        ...fineGrainedBundle1,
        precompiled: false,
      });
      expect(createFineGrainedBundle).toHaveBeenCalledTimes(1);
    });

    // Re-render with different config
    rerender(
      <TestComponent
        code={code}
        language="typescript"
        theme="github-dark"
        options={{ fineGrainedBundle: fineGrainedBundle2 }}
      />
    );

    // Should create a new bundle
    await waitFor(() => {
      // Include precompiled: false when checking call arguments
      expect(createFineGrainedBundle).toHaveBeenCalledWith({
        ...fineGrainedBundle2,
        precompiled: false,
      });
      expect(createFineGrainedBundle).toHaveBeenCalledTimes(2);
    });
  });

  it("should create deterministic cache keys regardless of order", async () => {
    const code = 'const test = "Hello";';

    // Same configuration with different order
    const fineGrainedBundle1 = {
      langs: ["typescript", "javascript"],
      themes: ["github-dark", "github-light"],
      engine: "javascript" as const,
      precompiled: false,
    };

    const fineGrainedBundle2 = {
      langs: ["javascript", "typescript"],
      themes: ["github-light", "github-dark"],
      engine: "javascript" as const,
      precompiled: false,
    };

    // Render with first config
    const { rerender } = render(
      <TestComponent
        code={code}
        language="typescript"
        theme="github-dark"
        options={{ fineGrainedBundle: fineGrainedBundle1 }}
      />
    );

    await waitFor(() => {
      expect(createFineGrainedBundle).toHaveBeenCalledTimes(1);
    });

    // Re-render with same config but different order
    rerender(
      <TestComponent
        code={code}
        language="typescript"
        theme="github-dark"
        options={{ fineGrainedBundle: fineGrainedBundle2 }}
      />
    );

    // Should not create a new bundle
    await waitFor(() => {
      expect(createFineGrainedBundle).toHaveBeenCalledTimes(1);
    });
  });
});
