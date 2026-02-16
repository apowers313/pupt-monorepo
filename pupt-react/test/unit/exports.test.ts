/**
 * Export smoke tests - verify all new exports are importable from pupt-react
 */

import { describe, it, expect } from "vitest";
import {
  // Hooks
  useFormula,
  usePuptLibrary,
  usePuptLibraryContext,

  // Components
  PuptLibraryProvider,

  // Context
  PuptLibraryContext,

  // Utility functions
  transformSource,
  extractInputRequirements,
  isAskComponent,
  traverseElement,
  isElement,
  validateInput,
  createRuntimeConfig,
  evaluateFormula,

  // Symbols
  TYPE,
  PROPS,
  CHILDREN,
  DEFERRED_REF,

  // Type guards
  isPuptElement,
  isDeferredRef,
  isComponentClass,

  // Component base class
  Component,
  COMPONENT_MARKER,

  // Version
  VERSION,
} from "pupt-react";

describe("exports", () => {
  describe("hooks", () => {
    it("should export useFormula as a function", () => {
      expect(typeof useFormula).toBe("function");
    });

    it("should export usePuptLibrary as a function", () => {
      expect(typeof usePuptLibrary).toBe("function");
    });

    it("should export usePuptLibraryContext as a function", () => {
      expect(typeof usePuptLibraryContext).toBe("function");
    });
  });

  describe("components", () => {
    it("should export PuptLibraryProvider as a function", () => {
      expect(typeof PuptLibraryProvider).toBe("function");
    });
  });

  describe("context", () => {
    it("should export PuptLibraryContext as an object", () => {
      expect(PuptLibraryContext).toBeDefined();
      expect(typeof PuptLibraryContext).toBe("object");
    });
  });

  describe("utility functions", () => {
    it("should export transformSource as a function", () => {
      expect(typeof transformSource).toBe("function");
    });

    it("should export extractInputRequirements as a function", () => {
      expect(typeof extractInputRequirements).toBe("function");
    });

    it("should export isAskComponent as a function", () => {
      expect(typeof isAskComponent).toBe("function");
    });

    it("should export traverseElement as a function", () => {
      expect(typeof traverseElement).toBe("function");
    });

    it("should export isElement as a function", () => {
      expect(typeof isElement).toBe("function");
    });

    it("should export validateInput as a function", () => {
      expect(typeof validateInput).toBe("function");
    });

    it("should export createRuntimeConfig as a function", () => {
      expect(typeof createRuntimeConfig).toBe("function");
    });

    it("should export evaluateFormula as a function", () => {
      expect(typeof evaluateFormula).toBe("function");
    });
  });

  describe("symbols", () => {
    it("should export TYPE as a symbol", () => {
      expect(typeof TYPE).toBe("symbol");
    });

    it("should export PROPS as a symbol", () => {
      expect(typeof PROPS).toBe("symbol");
    });

    it("should export CHILDREN as a symbol", () => {
      expect(typeof CHILDREN).toBe("symbol");
    });

    it("should export DEFERRED_REF as a symbol", () => {
      expect(typeof DEFERRED_REF).toBe("symbol");
    });
  });

  describe("type guards", () => {
    it("should export isPuptElement as a function", () => {
      expect(typeof isPuptElement).toBe("function");
    });

    it("should export isDeferredRef as a function", () => {
      expect(typeof isDeferredRef).toBe("function");
    });

    it("should export isComponentClass as a function", () => {
      expect(typeof isComponentClass).toBe("function");
    });
  });

  describe("component base class", () => {
    it("should export Component as a function", () => {
      expect(typeof Component).toBe("function");
    });

    it("should export COMPONENT_MARKER as a symbol", () => {
      expect(typeof COMPONENT_MARKER).toBe("symbol");
    });
  });

  describe("version", () => {
    it("should export VERSION as a string", () => {
      expect(typeof VERSION).toBe("string");
      expect(VERSION).toBe("1.0.0");
    });
  });
});
