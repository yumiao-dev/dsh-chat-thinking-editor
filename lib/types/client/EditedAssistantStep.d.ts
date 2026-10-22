/**
 * Transcript-side assistant-step wrapper.
 *
 * The Chat transcript folds raw `assistant/message` events in the browser and
 * cannot see the Host's `plugin:assistant-edit` message projection. The plugin
 * replaces the shipped `assistant-step` entry's component in place (it cannot
 * register a competing node: DSH allows one declarer per child slot) and hands
 * the shipped view a node whose text/reasoning blocks are substituted with the
 * Host-projected edits. This fixes the visible reply and the reasoning summary
 * without reimplementing any shipped UI.
 *
 * @module dsh-assistant-edit/client/EditedAssistantStep
 */
import { type ComponentType } from 'react';
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
import { type MessageEdit } from './message-edits.ts';
/** Tag carrying the component this wrapper replaced, across HMR reloads. */
export declare const ASSISTANT_STEP_ORIGINAL: unique symbol;
/** One rendered chat block (only text/reasoning members are inspected). */
interface ChatBlock {
    readonly kind: string;
    readonly text?: string;
    readonly [key: string]: unknown;
}
/** Structural view of one assistant-step node. */
interface AssistantStepNode {
    readonly kind: string;
    readonly data: {
        readonly blocks: readonly ChatBlock[];
        readonly finalNode?: {
            readonly messageId?: string;
            readonly blocks?: readonly ChatBlock[];
            readonly [key: string]: unknown;
        };
        readonly [key: string]: unknown;
    };
    readonly [key: string]: unknown;
}
/** Permissive props: the shipped entry supplies its own children/hooks seats. */
type EditedAssistantStepProps = Record<string, unknown> & {
    readonly node: AssistantStepNode;
    readonly sessionId: string;
};
/** Rewrite the text/reasoning blocks to the projection's values. */
export declare function rewriteBlocks(blocks: readonly ChatBlock[], edit: MessageEdit): ChatBlock[];
/**
 * Build the assistant-step wrapper for one captured shipped view.
 * @param official - the shipped `assistant-step` component.
 * @param rpc - browser RPC caller used to load projected edits.
 * @returns the wrapper component.
 */
export declare function createEditedAssistantStep(official: ComponentType<Record<string, unknown>>, rpc: ClientConnectionRpc | undefined): import("react").NamedExoticComponent<EditedAssistantStepProps>;
export {};
