import { moment as obsidianMoment } from "obsidian";

interface MomentLike {
	format(fmt?: string): string;
}

/**
 * Obsidian re-exports moment, but the export resolves as `any` when the
 * moment type declarations aren't available to the type checker. This
 * narrow facade keeps every call site fully typed.
 */
export const moment = obsidianMoment as unknown as (
	input?: Date | number | string
) => MomentLike;
