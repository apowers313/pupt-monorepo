/**
 * AskHandler - Headless render-prop component for collecting user input
 */

import { useCallback } from "react";

import { useAskIterator } from "../hooks/useAskIterator";
import type { AskHandlerProps, AskInputProps } from "../types/components";

const INPUT_TYPE_MAP: Record<string, string> = {
    string: "text",
    number: "number",
    boolean: "checkbox",
    secret: "password",
    date: "date",
    path: "text",
    select: "text",
    multiselect: "text",
    rating: "number",
};

/**
 * Headless component for collecting user input through Ask components.
 *
 * Wraps the useAskIterator hook and adds getInputProps for generating
 * accessible input element props.
 *
 * @example
 * ```tsx
 * <AskHandler element={element} onComplete={(values) => console.log(values)}>
 *   {({ current, submit, progress, getInputProps }) => {
 *     if (!current) return <div>Loading...</div>;
 *     const { inputProps } = getInputProps(current.name);
 *     return (
 *       <div>
 *         <label>{current.label}</label>
 *         <input {...inputProps} />
 *         <span>{progress}% complete</span>
 *       </div>
 *     );
 *   }}
 * </AskHandler>
 * ```
 */
export function AskHandler({ children, element, onComplete, initialValues }: AskHandlerProps): React.ReactElement {
    const {
        requirements,
        current,
        currentIndex,
        totalInputs,
        isDone,
        isLoading,
        inputs: values,
        submit,
        previous,
        goTo,
        reset,
        setValue,
        getValue,
    } = useAskIterator({
        element,
        ...(onComplete !== undefined && { onComplete }),
        ...(initialValues !== undefined && { initialValues }),
    });

    let progress: number;
    if (totalInputs === 0) {
        progress = isDone ? 100 : 0;
    } else {
        progress = Math.round((currentIndex / totalInputs) * 100);
    }

    const getInputProps = useCallback(
        (name: string): AskInputProps => {
            const requirement = requirements.find((r) => r.name === name) ?? {
                name,
                label: name,
                type: "string" as const,
                description: name,
                required: false,
            };

            const inputType = INPUT_TYPE_MAP[requirement.type] ?? "text";

            return {
                inputProps: {
                    id: `ask-${name}`,
                    name,
                    type: inputType,
                    required: requirement.required ?? false,
                    "aria-label": requirement.label,
                },
                requirement,
                value: getValue(name),
                setValue: (value: unknown) => {
                    setValue(name, value);
                },
                errors: [],
            };
        },
        [requirements, getValue, setValue],
    );

    return (
        <>
            {children({
                requirements,
                current,
                currentIndex,
                totalInputs,
                progress,
                isDone,
                isLoading,
                values,
                submit,
                previous,
                goTo,
                reset,
                getInputProps,
            })}
        </>
    );
}
