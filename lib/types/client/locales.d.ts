/**
 * `assistant-edit` namespace dictionaries.
 */
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    'action.edit': string;
    'action.editActive': string;
    'dialog.title': string;
    'dialog.close': string;
    'dialog.empty': string;
    'dialog.loading': string;
    'dialog.restore': string;
    'dialog.hint': string;
    'dialog.replyLabel': string;
    'dialog.reasoningLabel': string;
    'dialog.save': string;
    'dialog.saving': string;
    'dialog.runningNotice': string;
    'row.saved': string;
    'row.edited': string;
    'row.interrupted': string;
    'row.count': string;
    'error.generic': string;
    'error.sessionNotFound': string;
    'error.messageNotFound': string;
    'error.messageEol': string;
    'edited.badge': string;
};
/** English dictionary. */
export declare const en: {
    'action.edit': string;
    'action.editActive': string;
    'dialog.title': string;
    'dialog.close': string;
    'dialog.empty': string;
    'dialog.loading': string;
    'dialog.restore': string;
    'dialog.hint': string;
    'dialog.replyLabel': string;
    'dialog.reasoningLabel': string;
    'dialog.save': string;
    'dialog.saving': string;
    'dialog.runningNotice': string;
    'row.saved': string;
    'row.edited': string;
    'row.interrupted': string;
    'row.count': string;
    'error.generic': string;
    'error.sessionNotFound': string;
    'error.messageNotFound': string;
    'error.messageEol': string;
    'edited.badge': string;
};
/** The namespace key union. */
export type AssistantEditKey = keyof typeof zh;
/** Declare the namespace seat for the typed `t` standard prop. */
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'assistant-edit': AssistantEditKey;
    }
}
/** Dictionary namespace id. */
export declare const NS = "assistant-edit";
