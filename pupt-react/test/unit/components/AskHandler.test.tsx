/**
 * Tests for AskHandler headless component
 */

import { describe, it, expect, vi } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import React from "react";
import { PuptProvider } from "../../../src/components/PuptProvider";
import { AskHandler } from "../../../src/components/AskHandler";
import { transformSource } from "../../../src/utils/transform";
import type { PuptElement } from "pupt-lib";
import type { AskHandlerRenderProps } from "../../../src/types/components";

async function createElementWithAsks(): Promise<PuptElement> {
  return transformSource(`export default (
    <Prompt name="test">
      <Ask.Text name="firstName" label="First name" required />
      <Ask.Text name="lastName" label="Last name" />
    </Prompt>
  )`);
}

describe("AskHandler", () => {
  describe("initialization", () => {
    it("should provide all input requirements", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div>{props.requirements.length} inputs</div>;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() =>
        expect(capturedProps!.requirements.length).toBeGreaterThan(0)
      );
      expect(capturedProps!.requirements.length).toBe(2);
      expect(capturedProps!.requirements[0].name).toBe("firstName");
      expect(capturedProps!.requirements[1].name).toBe("lastName");
    });

    it("should start with zero progress", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div>Progress: {props.progress}%</div>;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));
      expect(capturedProps!.progress).toBe(0);
      expect(capturedProps!.currentIndex).toBe(0);
    });

    it("should handle null element", () => {
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={null}>
            {(props) => {
              capturedProps = props;
              return <div>No element</div>;
            }}
          </AskHandler>
        </PuptProvider>
      );

      expect(capturedProps!.requirements).toEqual([]);
      expect(capturedProps!.isDone).toBe(true);
      expect(capturedProps!.progress).toBe(100);
    });
  });

  describe("progress tracking", () => {
    it("should update progress when inputs are submitted", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div>Progress: {props.progress}%</div>;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));

      // Submit first value
      await act(async () => {
        await capturedProps!.submit("John");
      });

      expect(capturedProps!.progress).toBe(50);
      expect(capturedProps!.currentIndex).toBe(1);
    });

    it("should reach 100% when all inputs submitted", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div>Done: {String(props.isDone)}</div>;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));

      await act(async () => {
        await capturedProps!.submit("John");
      });
      await act(async () => {
        await capturedProps!.submit("Doe");
      });

      expect(capturedProps!.isDone).toBe(true);
      expect(capturedProps!.progress).toBe(100);
    });
  });

  describe("getInputProps", () => {
    it("should provide input props for a specific field", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div />;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));

      const inputProps = capturedProps!.getInputProps("firstName");
      expect(inputProps.inputProps.id).toBe("ask-firstName");
      expect(inputProps.inputProps.name).toBe("firstName");
      expect(inputProps.inputProps.required).toBe(true);
      expect(inputProps.inputProps["aria-label"]).toBe("First name");
      expect(inputProps.requirement.name).toBe("firstName");
    });

    it("should provide setValue for individual fields", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div />;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));

      const inputProps = capturedProps!.getInputProps("firstName");
      act(() => inputProps.setValue("Alice"));

      expect(capturedProps!.values.get("firstName")).toBe("Alice");
    });

    it("should return fallback for unknown field names", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div />;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));

      const inputProps = capturedProps!.getInputProps("nonexistent");
      expect(inputProps.inputProps.name).toBe("nonexistent");
      expect(inputProps.inputProps.id).toBe("ask-nonexistent");
    });
  });

  describe("callbacks", () => {
    it("should call onComplete when all inputs are filled", async () => {
      const onComplete = vi.fn();
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element} onComplete={onComplete}>
            {(props) => {
              capturedProps = props;
              return <div />;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));

      await act(async () => {
        await capturedProps!.submit("John");
      });
      await act(async () => {
        await capturedProps!.submit("Doe");
      });

      await waitFor(() => expect(onComplete).toHaveBeenCalled());
      const values = onComplete.mock.calls[0][0] as Map<string, unknown>;
      expect(values.get("firstName")).toBe("John");
      expect(values.get("lastName")).toBe("Doe");
    });
  });

  describe("initialValues", () => {
    it("should accept initial values for inputs", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      const initialValues = new Map<string, unknown>([
        ["firstName", "Jane"],
      ]);

      render(
        <PuptProvider>
          <AskHandler element={element} initialValues={initialValues}>
            {(props) => {
              capturedProps = props;
              return <div />;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));
      expect(capturedProps!.values.get("firstName")).toBe("Jane");
    });
  });

  describe("navigation", () => {
    it("should support previous navigation", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div />;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));

      // Advance
      await act(async () => {
        await capturedProps!.submit("John");
      });
      expect(capturedProps!.currentIndex).toBe(1);

      // Go back
      act(() => capturedProps!.previous());
      expect(capturedProps!.currentIndex).toBe(0);
    });

    it("should support reset", async () => {
      const element = await createElementWithAsks();
      let capturedProps: AskHandlerRenderProps | null = null;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              capturedProps = props;
              return <div />;
            }}
          </AskHandler>
        </PuptProvider>
      );

      await waitFor(() => expect(capturedProps!.totalInputs).toBe(2));

      await act(async () => {
        await capturedProps!.submit("John");
      });

      act(() => capturedProps!.reset());
      expect(capturedProps!.currentIndex).toBe(0);
      expect(capturedProps!.progress).toBe(0);
    });
  });
});
