window.__ModuleLoader__.load({
	id: "dsh-chat-thinking-editor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/client/message-edits.js
		/**
		* Client-side cache of edited assistant messages, keyed by message id.
		*
		* The Chat transcript folds raw `assistant/message` events in the browser and
		* cannot see the Host's `plugin:assistant-edit` message projection. This store
		* holds the Host-projected text/reasoning per message so the assistant-step
		* renderer can substitute them before handing the node to the shipped view.
		*
		* One store per Session; `assistantEdit/list` is fetched once per Session and
		* refreshed after every save.
		*
		* @module dsh-assistant-edit/client/message-edits
		*/
		const EMPTY = /* @__PURE__ */ new Map();
		const stores = /* @__PURE__ */ new Map();
		/** Get or create the per-Session store. */
		function storeOf(sessionId) {
			let store = stores.get(sessionId);
			if (store === void 0) {
				store = {
					map: EMPTY,
					listeners: /* @__PURE__ */ new Set(),
					loaded: false
				};
				stores.set(sessionId, store);
			}
			return store;
		}
		/** Notify every mounted assistant-step renderer for one Session. */
		function emit(store) {
			for (const listener of [...store.listeners]) listener();
		}
		/**
		* Subscribe to one Session's edit map.
		* @param sessionId - Session whose edits changed.
		* @param listener - re-read callback.
		* @returns disposer.
		*/
		function subscribeMessageEdits(sessionId, listener) {
			const store = storeOf(sessionId);
			store.listeners.add(listener);
			return () => {
				store.listeners.delete(listener);
			};
		}
		/**
		* Read the Session's current edit map (stable between loads).
		* @param sessionId - Session owning the edits.
		* @returns messageId -> replacement.
		*/
		function messageEditsOf(sessionId) {
			return storeOf(sessionId).map;
		}
		/**
		* Load (or reuse) the Session's edit map.
		* @param sessionId - Session to load.
		* @param rpc - browser RPC caller.
		*/
		async function ensureMessageEdits(sessionId, rpc) {
			const store = storeOf(sessionId);
			if (store.loaded) return;
			if (store.loading !== void 0) return store.loading;
			store.loading = (async () => {
				try {
					const result = await rpc.call("/api", "assistantEdit/list", { args: { request: { sessionId } } });
					const business = result.ok ? result.value : null;
					if (business?.ok !== true) return;
					const next = /* @__PURE__ */ new Map();
					for (const item of business.items) {
						if (!item.edited) continue;
						next.set(item.messageId, {
							text: item.text,
							reasoning: item.reasoning
						});
					}
					store.map = next;
					store.loaded = true;
					emit(store);
				} catch {} finally {
					store.loading = void 0;
				}
			})();
			return store.loading;
		}
		/**
		* Drop the cached map and load it again (after a save).
		* @param sessionId - Session whose edits changed.
		* @param rpc - browser RPC caller.
		*/
		async function refreshMessageEdits(sessionId, rpc) {
			const store = storeOf(sessionId);
			store.loaded = false;
			store.loading = void 0;
			await ensureMessageEdits(sessionId, rpc);
		}
		//#endregion
		//#region \0dsh-css:/workspace/unraid/work/dsh-chat-thinking-editor/src/client/assistant-edit.module.css.mjs
		const css = "._69ehWa_modal{width:min(560px,100%);max-height:100%}._69ehWa_modalContent{overscroll-behavior:contain;flex-direction:column;gap:12px;min-height:0;max-height:min(70vh,640px);display:flex;overflow-y:auto}._69ehWa_status{color:var(--dsw-alias-label-tertiary);text-align:center;margin:0;padding:20px 0;font-size:13px}._69ehWa_field{flex-direction:column;gap:6px;display:flex}._69ehWa_label{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500}._69ehWa_textarea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);font:inherit;resize:vertical;border-radius:8px;padding:8px 10px;font-size:13px;line-height:1.5}._69ehWa_textarea::placeholder{color:var(--dsw-alias-label-tertiary)}._69ehWa_textarea:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}._69ehWa_textarea:disabled{opacity:.5}._69ehWa_metaRow{flex-wrap:wrap;align-items:center;gap:8px;display:flex}";
		const tagId = "dsh-chat-thinking-editor/assistant-edit.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-chat-thinking-editor";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var assistant_edit_module_css_default = {
			"field": "_69ehWa_field",
			"label": "_69ehWa_label",
			"metaRow": "_69ehWa_metaRow",
			"modal": "_69ehWa_modal",
			"modalContent": "_69ehWa_modalContent",
			"status": "_69ehWa_status",
			"textarea": "_69ehWa_textarea"
		};
		//#endregion
		//#region lib/client/EditModal.js
		/**
		* Single-message edit dialog, built entirely on shipped DSH primitives:
		* `Modal` for chrome/close/escape, `Button` for actions, `Tag` for state, and
		* `TextShimmer` for loading. No list, no nested scroll: the clicked message's
		* reply and reasoning are the only two fields.
		*
		* @module dsh-assistant-edit/client/EditModal
		*/
		/**
		* The dialog editing exactly the message whose pencil was clicked.
		* @param props - message identity, transport, running state, and close callback.
		*/
		function EditModal({ messageId, sessionId, rpc, t, running, onClose }) {
			const [item, setItem] = (0, react.useState)(null);
			const [draft, setDraft] = (0, react.useState)({
				text: "",
				reasoning: ""
			});
			const [loading, setLoading] = (0, react.useState)(true);
			const [loadFailed, setLoadFailed] = (0, react.useState)(false);
			const [saveState, setSaveState] = (0, react.useState)({ status: "idle" });
			const savedRef = (0, react.useRef)(false);
			/** Read this message's current projected content from the Host. */
			const load = (0, react.useCallback)(async () => {
				if (rpc === void 0) {
					setLoadFailed(true);
					setLoading(false);
					return null;
				}
				try {
					const result = await rpc.call("/api", "assistantEdit/list", { args: { request: { sessionId } } });
					const business = result.ok ? result.value : null;
					if (business?.ok !== true) {
						setLoadFailed(true);
						return null;
					}
					const found = business.items.find((candidate) => candidate.messageId === messageId) ?? null;
					setItem(found);
					setLoadFailed(found === null);
					if (found !== null) setDraft({
						text: found.text,
						reasoning: found.reasoning
					});
					return found;
				} catch {
					setLoadFailed(true);
					return null;
				} finally {
					setLoading(false);
				}
			}, [
				messageId,
				rpc,
				sessionId
			]);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			/** Send one replacement and refresh the transcript override. */
			const replace = (0, react.useCallback)(async (text, reasoning) => {
				if (rpc === void 0 || item === null) {
					setSaveState({
						status: "error",
						message: t("error.generic")
					});
					return false;
				}
				setSaveState({ status: "saving" });
				try {
					const result = await rpc.call("/api", "assistantEdit/replace", { args: { request: {
						sessionId,
						messageId: item.messageId,
						text,
						reasoning
					} } });
					const business = result.ok ? result.value : null;
					if (business?.ok !== true) {
						const code = business?.error?.code;
						const message = code === "session-not-found" ? t("error.sessionNotFound") : code === "message-not-found" ? t("error.messageNotFound") : code === "message-not-editable" ? t("error.messageEol") : t("error.generic");
						setSaveState({
							status: "error",
							message
						});
						return false;
					}
					setSaveState({ status: "saved" });
					savedRef.current = true;
					refreshMessageEdits(sessionId, rpc);
					await load();
					return true;
				} catch {
					setSaveState({
						status: "error",
						message: t("error.generic")
					});
					return false;
				}
			}, [
				item,
				load,
				rpc,
				sessionId,
				t
			]);
			const editDraft = (0, react.useCallback)((patch) => {
				setDraft((current) => ({
					...current,
					...patch
				}));
				setSaveState({ status: "idle" });
			}, []);
			const dirty = item !== null && (draft.text !== item.text || draft.reasoning !== item.reasoning);
			const saving = saveState.status === "saving";
			const close = (0, react.useCallback)(() => {
				onClose(savedRef.current);
			}, [onClose]);
			const save = (0, react.useCallback)(() => {
				replace(draft.text, draft.reasoning);
			}, [
				draft.reasoning,
				draft.text,
				replace
			]);
			const restore = (0, react.useCallback)(() => {
				if (item === null) return;
				replace(item.sourceText, item.sourceReasoning);
			}, [item, replace]);
			/** Keep Ctrl/Cmd+A scoped to the focused textarea. */
			const confineSelectAll = (0, react.useCallback)((event) => {
				if ((event.ctrlKey || event.metaKey) && (event.key === "a" || event.key === "A")) {
					event.preventDefault();
					event.currentTarget.select();
				}
			}, []);
			return (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: close,
				title: t("dialog.title"),
				closeLabel: t("dialog.close"),
				description: t("dialog.hint"),
				className: assistant_edit_module_css_default.modal,
				contentClassName: assistant_edit_module_css_default.modalContent,
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					size: "sm",
					onClick: close,
					children: t("dialog.close")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					size: "sm",
					disabled: !dirty || running || saving,
					onClick: save,
					children: saving ? t("dialog.saving") : t("dialog.save")
				})] }),
				children: [running && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
					tone: "warning",
					children: t("dialog.runningNotice")
				}), loading ? (0, react_jsx_runtime.jsx)("p", {
					className: assistant_edit_module_css_default.status,
					role: "status",
					children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TextShimmer, {
						active: true,
						children: t("dialog.loading")
					})
				}) : loadFailed || item === null ? (0, react_jsx_runtime.jsx)("p", {
					className: assistant_edit_module_css_default.status,
					role: "status",
					children: t("error.messageNotFound")
				}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: assistant_edit_module_css_default.field,
						children: [(0, react_jsx_runtime.jsx)("label", {
							className: assistant_edit_module_css_default.label,
							htmlFor: "assistant-edit-text",
							children: t("dialog.replyLabel")
						}), (0, react_jsx_runtime.jsx)("textarea", {
							id: "assistant-edit-text",
							className: assistant_edit_module_css_default.textarea,
							value: draft.text,
							rows: 8,
							disabled: running || saving,
							onKeyDown: confineSelectAll,
							onChange: (event) => {
								editDraft({ text: event.target.value });
							}
						})]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: assistant_edit_module_css_default.field,
						children: [(0, react_jsx_runtime.jsx)("label", {
							className: assistant_edit_module_css_default.label,
							htmlFor: "assistant-edit-reasoning",
							children: t("dialog.reasoningLabel")
						}), (0, react_jsx_runtime.jsx)("textarea", {
							id: "assistant-edit-reasoning",
							className: assistant_edit_module_css_default.textarea,
							value: draft.reasoning,
							rows: 6,
							disabled: running || saving,
							onKeyDown: confineSelectAll,
							placeholder: t("dialog.reasoningLabel"),
							onChange: (event) => {
								editDraft({ reasoning: event.target.value });
							}
						})]
					}),
					(item.edited || saveState.status === "saved" || saveState.status === "error") && (0, react_jsx_runtime.jsxs)("div", {
						className: assistant_edit_module_css_default.metaRow,
						children: [
							item.edited && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "info",
								children: t("row.edited")
							}),
							saveState.status === "saved" && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "success",
								children: t("row.saved")
							}),
							saveState.status === "error" && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "danger",
								children: saveState.message
							}),
							item.edited && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								disabled: running || saving,
								onClick: restore,
								children: t("dialog.restore")
							})
						]
					})
				] })]
			});
		}
		//#endregion
		//#region lib/client/EditAction.js
		/**
		* Per-message edit action: a toolbar button in the assistant-actions strip
		* that opens the edit LIST modal (every finalized assistant message in the
		* session, this one pre-expanded and scrolled into view). It reuses the
		* shipped toolbar Button and is disabled while the agent is running.
		* @module dsh-assistant-edit/client/EditAction
		*/
		/**
		* One message's edit entry.
		* @param props - owner message identity, session kit, and injected face.
		*/
		function EditAction({ messageId, useSession, rpc, sessionId, t }) {
			const running = useSession((snapshot) => snapshot.running);
			const subscribe = (0, react.useCallback)((listener) => subscribeMessageEdits(sessionId, listener), [sessionId]);
			const read = (0, react.useCallback)(() => messageEditsOf(sessionId), [sessionId]);
			const edited = (0, react.useSyncExternalStore)(subscribe, read, read).has(messageId);
			(0, react.useEffect)(() => {
				if (rpc !== void 0) ensureMessageEdits(sessionId, rpc);
			}, [sessionId, rpc]);
			const [open, setOpen] = (0, react.useState)(false);
			const [justEdited, setJustEdited] = (0, react.useState)(false);
			const justEditedTimer = (0, react.useRef)(null);
			const openModal = (0, react.useCallback)(() => {
				setJustEdited(false);
				setOpen(true);
			}, []);
			const closeModal = (0, react.useCallback)((didEdit) => {
				setOpen(false);
				if (!didEdit) return;
				setJustEdited(true);
				if (justEditedTimer.current !== null) clearTimeout(justEditedTimer.current);
				justEditedTimer.current = setTimeout(() => {
					setJustEdited(false);
				}, 2500);
			}, []);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: edited || justEdited ? t("edited.badge") : t("action.edit"),
				side: "bottom",
				children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "toolbar",
					size: "sm",
					icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 16 }),
					"aria-label": edited || justEdited ? t("edited.badge") : t("action.edit"),
					"aria-pressed": edited || justEdited,
					onClick: openModal,
					disabled: running
				})
			}), open && (0, react_jsx_runtime.jsx)(EditModal, {
				messageId,
				sessionId,
				rpc,
				t,
				running,
				onClose: closeModal
			})] });
		}
		//#endregion
		//#region lib/client/EditedAssistantStep.js
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
		/** Tag carrying the component this wrapper replaced, across HMR reloads. */
		const ASSISTANT_STEP_ORIGINAL = Symbol("assistant-edit:original-component");
		/** Rewrite the text/reasoning blocks to the projection's values. */
		function rewriteBlocks(blocks, edit) {
			const out = [];
			let textDone = false;
			let reasoningDone = false;
			for (const block of blocks) {
				if (block.kind === "text") {
					if (!textDone) {
						out.push({
							...block,
							text: edit.text
						});
						textDone = true;
					}
					continue;
				}
				if (block.kind === "reasoning") {
					if (!reasoningDone && edit.reasoning !== "") out.push({
						...block,
						text: edit.reasoning
					});
					reasoningDone = true;
					continue;
				}
				out.push(block);
			}
			if (!textDone) out.unshift({
				kind: "text",
				text: edit.text
			});
			if (!reasoningDone && edit.reasoning !== "") out.unshift({
				kind: "reasoning",
				text: edit.reasoning
			});
			return out;
		}
		/** Apply one message edit to the node the shipped view will render. */
		function editedNode(node, edit) {
			const final = node.data.finalNode;
			const blocks = rewriteBlocks(node.data.blocks, edit);
			if (final === void 0) return {
				...node,
				data: {
					...node.data,
					blocks
				}
			};
			return {
				...node,
				data: {
					...node.data,
					blocks,
					finalNode: {
						...final,
						blocks: rewriteBlocks(final.blocks ?? node.data.blocks, edit)
					}
				}
			};
		}
		/**
		* Build the assistant-step wrapper for one captured shipped view.
		* @param official - the shipped `assistant-step` component.
		* @param rpc - browser RPC caller used to load projected edits.
		* @returns the wrapper component.
		*/
		function createEditedAssistantStep(official, rpc) {
			const Official = official;
			return (0, react.memo)(function EditedAssistantStep(props) {
				const { node, sessionId } = props;
				const subscribe = (0, react.useCallback)((listener) => subscribeMessageEdits(sessionId, listener), [sessionId]);
				const read = (0, react.useCallback)(() => messageEditsOf(sessionId), [sessionId]);
				const edits = (0, react.useSyncExternalStore)(subscribe, read, read);
				(0, react.useEffect)(() => {
					if (rpc !== void 0) ensureMessageEdits(sessionId, rpc);
				}, [sessionId]);
				const messageId = node.data.finalNode?.messageId;
				const edit = messageId === void 0 ? void 0 : edits.get(messageId);
				const routed = edit === void 0 ? node : editedNode(node, edit);
				return (0, react_jsx_runtime.jsx)(Official, {
					...props,
					node: routed
				});
			});
		}
		//#endregion
		//#region lib/client/locales.js
		/**
		* `assistant-edit` namespace dictionaries.
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"action.edit": "编辑",
			"action.editActive": "编辑中",
			"dialog.title": "编辑助手消息",
			"dialog.close": "关闭",
			"dialog.empty": "当前会话还没有可编辑的助手消息",
			"dialog.loading": "加载中…",
			"dialog.restore": "恢复原文",
			"dialog.hint": "点击任意一条展开编辑；保存后 AI 只会看到修改后的版本",
			"dialog.replyLabel": "回复内容",
			"dialog.reasoningLabel": "思考链（可留空删除）",
			"dialog.save": "保存",
			"dialog.saving": "保存中…",
			"dialog.runningNotice": "Agent 正在运行，暂时无法编辑",
			"row.saved": "已保存",
			"row.edited": "已编辑",
			"row.interrupted": "已停止",
			"row.count": "条消息",
			"error.generic": "保存失败，已保留原始内容",
			"error.sessionNotFound": "会话不在当前进程中，无法编辑",
			"error.messageNotFound": "找不到这条消息，可能已被移除",
			"error.messageEol": "这条消息已被更新的内容替换，无法再编辑",
			"edited.badge": "已编辑"
		};
		/** English dictionary. */
		const en = {
			"action.edit": "Edit",
			"action.editActive": "Editing",
			"dialog.title": "Edit assistant messages",
			"dialog.close": "Close",
			"dialog.empty": "No editable assistant messages in this session yet",
			"dialog.loading": "Loading…",
			"dialog.restore": "Restore original",
			"dialog.hint": "Tap a message to expand and edit; after saving the model sees only the edited version",
			"dialog.replyLabel": "Reply",
			"dialog.reasoningLabel": "Reasoning (empty to remove)",
			"dialog.save": "Save",
			"dialog.saving": "Saving…",
			"dialog.runningNotice": "The agent is running; editing is disabled",
			"row.saved": "Saved",
			"row.edited": "Edited",
			"row.interrupted": "Stopped",
			"row.count": "messages",
			"error.generic": "Save failed — the original content was kept",
			"error.sessionNotFound": "Session is not live in this process",
			"error.messageNotFound": "Message not found; it may have been removed",
			"error.messageEol": "This message was already replaced and can no longer be edited",
			"edited.badge": "Edited"
		};
		/** Dictionary namespace id. */
		const NS = "assistant-edit";
		//#endregion
		//#region lib/client/index.js
		/**
		* dsh-assistant-edit — Client half (locally adapted for DSH 0.2.1-rc.2).
		*
		* Contributes an edit pencil to the `conversation.chat.assistant-actions`
		* strip of every finalized assistant message. Clicking it opens a LIST modal
		* covering every assistant reply currently on the session surface; each row
		* expands into two editors (reply text and reasoning chain) and saves
		* independently through the Host `assistantEdit/replace` Remote via the
		* browser RPC channel. The Host appends a `plugin:assistant-edit` message
		* projection so the model only ever sees the edited version, and the
		* reasoning-body override below makes the transcript show the edited chain
		* too (the Chat view folds raw events and cannot see Host projections).
		* The modal closes via its top-left × or the always-visible bottom
		* 「关闭」 button (no backdrop tap, no outside pointer-down, no swipe, no
		* Escape), it is disabled while the agent is running, and a failed save keeps
		* the original content on screen.
		*
		* @module dsh-assistant-edit/client
		*/
		/** Required services: the slot registry, the connection RPC handle, and the locale seat. */
		const inject = [
			"slots",
			"connection",
			"locale"
		];
		/**
		* Client plugin body: the per-message edit entry.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			globalThis["__assistantEditVersion"] = "0.2.0";
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "assistant-edit: dictionaries");
			const connection = ctx.get("connection");
			ctx.slots.inject("conversation.chat.assistant-actions", () => ctx.slots.register({
				name: "conversation.chat.assistant-actions",
				id: "assistant-edit",
				order: 9,
				locale: NS,
				inject: () => ({ rpc: connection?.rpc })
			}, EditAction));
			let active;
			const wrap = (component) => {
				const original = component[ASSISTANT_STEP_ORIGINAL] ?? component;
				const wrapped = createEditedAssistantStep(original, connection?.rpc);
				Object.defineProperty(wrapped, ASSISTANT_STEP_ORIGINAL, { value: original });
				return wrapped;
			};
			const ensureWrapped = () => {
				const entry = ctx.slots.entries("conversation.chat.node").find((candidate) => candidate.options.key === "assistant-step");
				if (entry === void 0) return;
				if (active?.entry === entry && entry.component === active.wrapped) return;
				const current = entry.component;
				if (current === void 0) return;
				if (current[ASSISTANT_STEP_ORIGINAL] !== void 0) {
					active = {
						entry,
						wrapped: current,
						original: current[ASSISTANT_STEP_ORIGINAL]
					};
					return;
				}
				const wrapped = wrap(current);
				entry.component = wrapped;
				active = {
					entry,
					wrapped,
					original: current
				};
				ctx.emit?.("slots/changed", "conversation.chat.node");
			};
			ctx.effect(() => {
				ensureWrapped();
				const unsubscribe = ctx.slots.subscribe("conversation.chat.node", ensureWrapped);
				const retry = setTimeout(() => {
					ensureWrapped();
					if (active === void 0) console.warn("[assistant-edit] assistant-step entry not found");
				}, 1e3);
				return () => {
					clearTimeout(retry);
					unsubscribe();
					if (active !== void 0 && active.entry.component === active.wrapped) active.entry.component = active.original;
				};
			}, "assistant-edit: assistant-step wrapper");
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map