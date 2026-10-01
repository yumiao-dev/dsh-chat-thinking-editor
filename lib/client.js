window.__ModuleLoader__.load({
	id: "dsh-chat-thinking-editor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_dom = require("react-dom");
		//#region \0dsh-css:C:\Users\Cupcat\dsh-chat-thinking-editor\src\client\assistant-edit.module.css.mjs
		const css = ".CWJOlW_action{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:28px;justify-content:center;align-items:center;padding:6px;display:inline-flex}.CWJOlW_action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.CWJOlW_action:disabled{cursor:default;opacity:.4}.CWJOlW_action[data-active]{color:var(--dsw-alias-label-primary)}.CWJOlW_overlay{user-select:none;z-index:1100;pointer-events:none;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.CWJOlW_mask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);pointer-events:auto;position:absolute;inset:0}.CWJOlW_modal{box-sizing:border-box;overscroll-behavior:contain;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);width:min(640px,100vw - 24px);max-height:calc(100vh - 24px);box-shadow:var(--dsw-shadow-lv3);pointer-events:auto;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;flex-direction:column;gap:10px;padding:16px;display:flex;position:relative;overflow-y:auto}.CWJOlW_modalHeader{align-items:center;gap:10px;display:flex}.CWJOlW_close{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:14px;flex:none;justify-content:center;align-items:center;padding:5px;display:inline-flex}.CWJOlW_close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.CWJOlW_titleWrap{align-items:baseline;gap:8px;min-width:0;display:flex}.CWJOlW_modalTitle{color:var(--dsw-alias-label-primary);white-space:nowrap;margin:0;font-size:14px;font-weight:600}.CWJOlW_count{color:var(--dsw-alias-label-tertiary);flex:none;font-size:12px}.CWJOlW_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.CWJOlW_empty{text-align:center;color:var(--dsw-alias-label-tertiary);margin:0;padding:24px 12px;font-size:13px}.CWJOlW_notice{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-primary);border-radius:8px;margin:0;padding:8px 10px;font-size:13px}.CWJOlW_list{flex-direction:column;gap:8px;padding-bottom:4px;display:flex}.CWJOlW_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;flex-direction:column;display:flex;overflow:hidden}.CWJOlW_row[data-expanded]{border-color:var(--dsw-alias-brand-primary)}.CWJOlW_rowHead{box-sizing:border-box;width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:8px;padding:8px 10px;display:flex}.CWJOlW_rowHead:hover{background:var(--dsw-alias-interactive-bg-hover)}.CWJOlW_rowIndex{background:var(--dsw-alias-interactive-bg-hover);min-width:22px;height:22px;color:var(--dsw-alias-label-secondary);border-radius:11px;flex:none;justify-content:center;align-items:center;padding:0 4px;font-size:11px;font-weight:600;display:inline-flex}.CWJOlW_rowMeta{flex:none;align-items:center;gap:4px;display:inline-flex}.CWJOlW_rowBadge,.CWJOlW_rowBadgeMuted{white-space:nowrap;border-radius:9px;align-items:center;height:18px;padding:0 6px;font-size:10px;font-weight:500;display:inline-flex}.CWJOlW_rowBadge{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary)}.CWJOlW_rowBadgeMuted{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-primary)}.CWJOlW_savedBadge{background:var(--dsw-alias-state-success-tertiary,var(--dsw-alias-interactive-bg-hover));height:18px;color:var(--dsw-alias-state-success-primary,var(--dsw-alias-label-secondary));white-space:nowrap;border-radius:9px;align-items:center;padding:0 6px;font-size:10px;font-weight:500;display:inline-flex}.CWJOlW_rowPreview{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-secondary);flex:1;font-size:12px;line-height:1.4;overflow:hidden}.CWJOlW_chevron{width:18px;height:18px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;font-size:12px;transition:transform .15s;display:inline-flex;transform:rotate(-90deg)}.CWJOlW_chevron[data-open]{transform:rotate(0)}.CWJOlW_rowBody{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;padding:10px;display:flex}.CWJOlW_field{flex-direction:column;gap:6px;display:flex}.CWJOlW_label{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500}.CWJOlW_input{user-select:text;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);font:inherit;resize:vertical;border-radius:8px;padding:8px 10px;font-size:13px;line-height:1.5}.CWJOlW_input:focus{border-color:var(--dsw-alias-brand-primary);outline:none}.CWJOlW_input:disabled{opacity:.5}.CWJOlW_input::placeholder{color:var(--dsw-alias-label-tertiary)}.CWJOlW_rowFooter{justify-content:flex-end;align-items:center;gap:8px;min-height:30px;display:flex}.CWJOlW_save{cursor:pointer;background:var(--dsw-alias-button-primary-fill);height:30px;color:var(--dsw-alias-label-primary-foreground);border:none;border-radius:15px;padding:0 14px;font-size:13px}.CWJOlW_save:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.CWJOlW_save:disabled{cursor:default;opacity:.4}.CWJOlW_failure{color:var(--dsw-alias-state-error-primary);padding-left:4px;font-size:12px}";
		const tagId = "dsh-chat-thinking-editor/assistant-edit.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-chat-thinking-editor";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var assistant_edit_module_css_default = {
			"action": "CWJOlW_action",
			"chevron": "CWJOlW_chevron",
			"close": "CWJOlW_close",
			"count": "CWJOlW_count",
			"empty": "CWJOlW_empty",
			"failure": "CWJOlW_failure",
			"field": "CWJOlW_field",
			"hint": "CWJOlW_hint",
			"input": "CWJOlW_input",
			"label": "CWJOlW_label",
			"list": "CWJOlW_list",
			"mask": "CWJOlW_mask",
			"modal": "CWJOlW_modal",
			"modalHeader": "CWJOlW_modalHeader",
			"modalTitle": "CWJOlW_modalTitle",
			"notice": "CWJOlW_notice",
			"overlay": "CWJOlW_overlay",
			"row": "CWJOlW_row",
			"rowBadge": "CWJOlW_rowBadge",
			"rowBadgeMuted": "CWJOlW_rowBadgeMuted",
			"rowBody": "CWJOlW_rowBody",
			"rowFooter": "CWJOlW_rowFooter",
			"rowHead": "CWJOlW_rowHead",
			"rowIndex": "CWJOlW_rowIndex",
			"rowMeta": "CWJOlW_rowMeta",
			"rowPreview": "CWJOlW_rowPreview",
			"save": "CWJOlW_save",
			"savedBadge": "CWJOlW_savedBadge",
			"titleWrap": "CWJOlW_titleWrap"
		};
		//#endregion
		//#region lib/client/EditModal.js
		/**
		* The edit list modal: lists EVERY finalized assistant message in the current
		* conversation window (each reply the assistant produced — including the ones
		* between tool calls). Each row expands into two editors: reply text and
		* reasoning chain. Every row saves independently through the Host
		* `assistantEdit/replace` Remote, which records a plugin-owned message
		* projection: the model-visible history carries the edited content, and the
		* same message can be edited any number of times.
		*
		* The transcript rendered behind this modal is built from raw session events
		* and does not apply message projections, so the modal reads the committed
		* edits back through `assistantEdit/list` and overlays them on the collected
		* transcript values. A row with no committed edit shows the original reply.
		*
		* Closing: the dialog closes ONLY via the close button pinned at the TOP-LEFT
		* of the header. Backdrop taps, outside pointer-downs, touch swipes, and the
		* Escape key never close it — mobile remote access kept dismissing the modal
		* by accident while scrolling.
		*
		* @module dsh-chat-thinking-editor/client/EditModal
		*/
		/** Collect every finalized assistant reply visible in the window, in order. */
		function collectEditable(snapshot) {
			if (snapshot === void 0) return [];
			const items = [];
			for (const node of snapshot.nodes.values()) {
				if (node.kind !== "assistant-step") continue;
				const data = node.data;
				const final = data.finalNode;
				if (final?.messageId === void 0) continue;
				const blocks = final.blocks;
				items.push({
					key: String(final.messageId),
					messageId: final.messageId,
					seq: final.seq,
					turn: data.turn,
					step: data.step,
					interrupted: final.interrupted === true,
					text: blocks.filter((block) => block.kind === "text").map((block) => block.text).join(""),
					reasoning: blocks.filter((block) => block.kind === "reasoning").map((block) => block.text).join("")
				});
			}
			items.sort((a, b) => a.turn - b.turn || a.step - b.step);
			return items;
		}
		/** Read the committed edits out of one `assistantEdit/list` response body. */
		function readCommitted(value) {
			if (typeof value !== "object" || value === null) return [];
			const body = value;
			if (body.ok !== true || !Array.isArray(body.edits)) return [];
			const edits = [];
			for (const entry of body.edits) {
				if (typeof entry !== "object" || entry === null) continue;
				const row = entry;
				if (typeof row.targetSeq !== "number" || typeof row.text !== "string" || typeof row.reasoning !== "string") continue;
				edits.push({
					targetSeq: row.targetSeq,
					text: row.text,
					reasoning: row.reasoning
				});
			}
			return edits;
		}
		/**
		* The modal dialog listing and editing every assistant message.
		* @param props - identity, read hooks, transport, and close callback.
		*/
		function EditModal({ messageId, useChat, sessionId, rpc, t, running, onClose }) {
			const collected = useChat(collectEditable);
			const [committed, setCommitted] = (0, react.useState)({});
			const [drafts, setDrafts] = (0, react.useState)({});
			const [rowStates, setRowStates] = (0, react.useState)({});
			const [expandedKey, setExpandedKey] = (0, react.useState)(null);
			const anySavedRef = (0, react.useRef)(false);
			const rowRefs = (0, react.useRef)(/* @__PURE__ */ new Map());
			const items = (0, react.useMemo)(() => collected.map((item) => {
				const override = committed[item.seq];
				return override === void 0 ? item : {
					...item,
					text: override.text,
					reasoning: override.reasoning
				};
			}), [collected, committed]);
			(0, react.useEffect)(() => {
				if (rpc === void 0) return;
				let cancelled = false;
				(async () => {
					try {
						const result = await rpc.call("/api", "assistantEdit/list", { args: { request: { sessionId } } });
						if (cancelled || !result.ok) return;
						const next = {};
						for (const edit of readCommitted(result.value)) next[edit.targetSeq] = {
							text: edit.text,
							reasoning: edit.reasoning
						};
						setCommitted(next);
					} catch {}
				})();
				return () => {
					cancelled = true;
				};
			}, [rpc, sessionId]);
			(0, react.useEffect)(() => {
				const initialKey = String(messageId);
				if (items.some((item) => item.key === initialKey)) {
					setExpandedKey(initialKey);
					requestAnimationFrame(() => {
						rowRefs.current.get(initialKey)?.scrollIntoView({ block: "center" });
					});
				} else if (items.length > 0) setExpandedKey(null);
			}, []);
			const toggleRow = (0, react.useCallback)((key) => {
				setExpandedKey((current) => current === key ? null : key);
			}, []);
			const setDraft = (0, react.useCallback)((key, patch) => {
				setDrafts((current) => {
					const existing = current[key];
					const next = {
						text: patch.text ?? existing?.text ?? "",
						reasoning: patch.reasoning ?? existing?.reasoning ?? ""
					};
					return {
						...current,
						[key]: next
					};
				});
				setRowStates((current) => {
					const state = current[key];
					if (state === void 0 || state.status === "idle") return current;
					return {
						...current,
						[key]: { status: "idle" }
					};
				});
			}, []);
			const saveRow = (0, react.useCallback)(async (item) => {
				const key = item.key;
				if (rpc === void 0) {
					setRowStates((current) => ({
						...current,
						[key]: {
							status: "error",
							message: t("error.generic")
						}
					}));
					return;
				}
				const draft = drafts[key] ?? {
					text: item.text,
					reasoning: item.reasoning
				};
				setRowStates((current) => ({
					...current,
					[key]: { status: "saving" }
				}));
				try {
					const result = await rpc.call("/api", "assistantEdit/replace", { args: { request: {
						sessionId,
						messageId: item.messageId,
						text: draft.text,
						reasoning: draft.reasoning
					} } });
					const business = result.ok ? result.value : null;
					if (business?.ok !== true) {
						const code = business?.error?.code;
						const message = code === "session-not-found" ? t("error.sessionNotFound") : code === "message-not-found" ? t("error.messageNotFound") : code === "message-not-editable" ? t("error.messageEol") : t("error.generic");
						setRowStates((current) => ({
							...current,
							[key]: {
								status: "error",
								message
							}
						}));
						return;
					}
					anySavedRef.current = true;
					setCommitted((current) => ({
						...current,
						[item.seq]: {
							text: draft.text,
							reasoning: draft.reasoning
						}
					}));
					setDrafts((current) => {
						if (current[key] === void 0) return current;
						const next = { ...current };
						delete next[key];
						return next;
					});
					setRowStates((current) => ({
						...current,
						[key]: { status: "saved" }
					}));
				} catch {
					setRowStates((current) => ({
						...current,
						[key]: {
							status: "error",
							message: t("error.generic")
						}
					}));
				}
			}, [
				drafts,
				rpc,
				sessionId,
				t
			]);
			const close = (0, react.useCallback)(() => {
				onClose(anySavedRef.current);
			}, [onClose]);
			const countLabel = (0, react.useMemo)(() => `${String(items.length)} ${t("row.count")}`, [items.length, t]);
			return (0, react_dom.createPortal)((0, react_jsx_runtime.jsxs)("div", {
				className: assistant_edit_module_css_default.overlay,
				role: "presentation",
				children: [(0, react_jsx_runtime.jsx)("div", {
					className: assistant_edit_module_css_default.mask,
					"aria-hidden": "true"
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: assistant_edit_module_css_default.modal,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("dialog.title"),
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: assistant_edit_module_css_default.modalHeader,
							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: assistant_edit_module_css_default.close,
								"aria-label": t("dialog.close"),
								onClick: close,
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 14 })
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: assistant_edit_module_css_default.titleWrap,
								children: [(0, react_jsx_runtime.jsx)("h2", {
									className: assistant_edit_module_css_default.modalTitle,
									children: t("dialog.title")
								}), (0, react_jsx_runtime.jsx)("span", {
									className: assistant_edit_module_css_default.count,
									children: countLabel
								})]
							})]
						}),
						running && (0, react_jsx_runtime.jsx)("p", {
							className: assistant_edit_module_css_default.notice,
							role: "status",
							children: t("dialog.runningNotice")
						}),
						(0, react_jsx_runtime.jsx)("p", {
							className: assistant_edit_module_css_default.hint,
							children: t("dialog.hint")
						}),
						items.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
							className: assistant_edit_module_css_default.empty,
							children: t("dialog.empty")
						}) : (0, react_jsx_runtime.jsx)("div", {
							className: assistant_edit_module_css_default.list,
							role: "list",
							children: items.map((item, index) => (0, react_jsx_runtime.jsx)(Row, {
								item,
								index,
								draft: drafts[item.key],
								state: rowStates[item.key] ?? { status: "idle" },
								expanded: expandedKey === item.key,
								running,
								t,
								onToggle: toggleRow,
								onDraftChange: setDraft,
								onSave: saveRow,
								registerRef: (element) => {
									if (element === null) rowRefs.current.delete(item.key);
									else rowRefs.current.set(item.key, element);
								}
							}, item.key))
						})
					]
				})]
			}), document.body);
		}
		/** Keep Ctrl/Cmd+A scoped to the focused textarea so a "select all + delete"
		* in one editor never spills into (and erases) the sibling field too. */
		function confineSelectAll(event) {
			if ((event.ctrlKey || event.metaKey) && (event.key === "a" || event.key === "A")) {
				event.preventDefault();
				event.currentTarget.select();
			}
		}
		/** One assistant message row: collapsed preview header + expandable editors. */
		function Row({ item, index, draft, state, expanded, running, t, onToggle, onDraftChange, onSave, registerRef }) {
			const text = draft?.text ?? item.text;
			const reasoning = draft?.reasoning ?? item.reasoning;
			const preview = (text.trim() !== "" ? text : reasoning).replace(/\s+/g, " ").trim().slice(0, 80);
			const saving = state.status === "saving";
			return (0, react_jsx_runtime.jsxs)("div", {
				className: assistant_edit_module_css_default.row,
				ref: registerRef,
				"data-expanded": expanded || void 0,
				role: "listitem",
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: assistant_edit_module_css_default.rowHead,
					onClick: () => {
						onToggle(item.key);
					},
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: assistant_edit_module_css_default.rowIndex,
							children: String(index + 1)
						}),
						(0, react_jsx_runtime.jsxs)("span", {
							className: assistant_edit_module_css_default.rowMeta,
							children: [
								(0, react_jsx_runtime.jsxs)("span", {
									className: assistant_edit_module_css_default.rowBadge,
									children: [
										"T",
										String(item.turn),
										"·S",
										String(item.step)
									]
								}),
								item.interrupted && (0, react_jsx_runtime.jsx)("span", {
									className: assistant_edit_module_css_default.rowBadgeMuted,
									children: t("row.interrupted")
								}),
								state.status === "saved" && (0, react_jsx_runtime.jsx)("span", {
									className: assistant_edit_module_css_default.savedBadge,
									children: t("row.saved")
								})
							]
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: assistant_edit_module_css_default.rowPreview,
							children: preview
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: assistant_edit_module_css_default.chevron,
							"data-open": expanded || void 0,
							"aria-hidden": "true",
							children: "▾"
						})
					]
				}), expanded && (0, react_jsx_runtime.jsxs)("div", {
					className: assistant_edit_module_css_default.rowBody,
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: assistant_edit_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("label", {
								className: assistant_edit_module_css_default.label,
								htmlFor: `assistant-edit-text-${item.key}`,
								children: t("dialog.replyLabel")
							}), (0, react_jsx_runtime.jsx)("textarea", {
								id: `assistant-edit-text-${item.key}`,
								className: assistant_edit_module_css_default.input,
								value: text,
								rows: 6,
								disabled: running || saving,
								onKeyDown: confineSelectAll,
								onChange: (event) => {
									onDraftChange(item.key, { text: event.target.value });
								}
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: assistant_edit_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("label", {
								className: assistant_edit_module_css_default.label,
								htmlFor: `assistant-edit-reasoning-${item.key}`,
								children: t("dialog.reasoningLabel")
							}), (0, react_jsx_runtime.jsx)("textarea", {
								id: `assistant-edit-reasoning-${item.key}`,
								className: assistant_edit_module_css_default.input,
								value: reasoning,
								rows: 4,
								disabled: running || saving,
								onKeyDown: confineSelectAll,
								placeholder: item.reasoning === "" && reasoning === "" ? t("dialog.reasoningLabel") : void 0,
								onChange: (event) => {
									onDraftChange(item.key, { reasoning: event.target.value });
								}
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: assistant_edit_module_css_default.rowFooter,
							children: [state.status === "error" && (0, react_jsx_runtime.jsx)("span", {
								className: assistant_edit_module_css_default.failure,
								role: "status",
								children: state.message
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: assistant_edit_module_css_default.save,
								disabled: running || saving,
								onClick: () => {
									onSave(item);
								},
								children: saving ? t("dialog.saving") : t("dialog.save")
							})]
						})
					]
				})]
			});
		}
		//#endregion
		//#region lib/client/EditAction.js
		/**
		* Per-message edit action: a pencil in the assistant-actions strip that opens
		* the edit LIST modal (every finalized assistant message in the session, this
		* one pre-expanded and scrolled into view). The button reuses the IconActions
		* row chrome (28px circle, hover fill) and is disabled while the agent is
		* running, matching the conflict rule.
		* @module dsh-chat-thinking-editor/client/EditAction
		*/
		/**
		* One message's edit entry.
		* @param props - owner message identity, session kit, and injected face.
		*/
		function EditAction({ messageId, useSession, useChat, rpc, sessionId, t }) {
			const running = useSession((snapshot) => snapshot.running) === true;
			const [open, setOpen] = (0, react.useState)(false);
			const [justEdited, setJustEdited] = (0, react.useState)(false);
			const justEditedTimer = (0, react.useRef)(null);
			const openModal = (0, react.useCallback)(() => {
				setJustEdited(false);
				setOpen(true);
			}, []);
			const closeModal = (0, react.useCallback)((edited) => {
				setOpen(false);
				if (!edited) return;
				setJustEdited(true);
				if (justEditedTimer.current !== null) clearTimeout(justEditedTimer.current);
				justEditedTimer.current = setTimeout(() => {
					setJustEdited(false);
				}, 2500);
			}, []);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: justEdited ? t("edited.badge") : t("action.edit"),
				side: "bottom",
				children: (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: assistant_edit_module_css_default.action,
					"aria-label": justEdited ? t("edited.badge") : t("action.edit"),
					"data-active": justEdited || void 0,
					onClick: openModal,
					disabled: running,
					children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, {})
				})
			}), open && (0, react_jsx_runtime.jsx)(EditModal, {
				messageId,
				useChat,
				sessionId,
				rpc,
				t,
				running,
				onClose: closeModal
			})] });
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
			"dialog.hint": "点击任意一条展开编辑；保存后 AI 只会看到修改后的版本",
			"dialog.replyLabel": "回复内容",
			"dialog.reasoningLabel": "思考链（可留空删除）",
			"dialog.save": "保存",
			"dialog.saving": "保存中…",
			"dialog.runningNotice": "Agent 正在运行，暂时无法编辑",
			"row.saved": "已保存",
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
			"dialog.hint": "Tap a message to expand and edit; after saving the model sees only the edited version",
			"dialog.replyLabel": "Reply",
			"dialog.reasoningLabel": "Reasoning (empty to remove)",
			"dialog.save": "Save",
			"dialog.saving": "Saving…",
			"dialog.runningNotice": "The agent is running; editing is disabled",
			"row.saved": "Saved",
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
		* dsh-chat-thinking-editor — Client half.
		*
		* Contributes an edit pencil to the `conversation.chat.assistant-actions`
		* strip of every finalized assistant message. Clicking it opens a LIST modal
		* covering EVERY finalized assistant message in the session; each row expands
		* into two editors (reply text and reasoning chain) and saves independently
		* through the Host `assistantEdit/replace` Remote via the browser RPC channel.
		*
		* The Host records the edit as a plugin-owned **message projection**, so the
		* model-visible history carries the edited content while the stored transcript
		* keeps its original events. The conversation UI renders those raw events and
		* does not apply message projections, so the modal overlays the committed
		* edits it reads back from `assistantEdit/list`.
		*
		* The modal closes ONLY via its top-left close button (no backdrop tap, no
		* outside pointer-down, no swipe, no Escape), it is disabled while the agent
		* is running, and a failed save keeps the original content on screen.
		*
		* @module dsh-chat-thinking-editor/client
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
				inject: (sessionId) => ({
					rpc: connection?.rpc,
					sessionId
				})
			}, EditAction));
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map