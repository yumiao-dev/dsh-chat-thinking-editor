# dsh-chat-thinking-editor

> Make the AI do it your way. If it won't, do you do it.

After living inside DeepSeek Harness for a while, I finally figured something out: a model can be brilliant and still be a stubborn piece of work. Especially with the technical stuff — reverse-engineering something, picking apart a protocol, digging into how some low-level thing actually works. It just stalls, then hands you that line we all know:

> "I can't help you with that, because it might violate..."

You know the rest. Fill in the dots yourself, you've seen it a hundred times.

Re-ask it? Same line. Rephrase? Same line, maybe with a polite "I'd suggest going through the proper process." You burn tokens fast, and meanwhile its whole long thinking chain just keeps grinding along its own "nope, not doing it" track.

So I wrote this plugin. **Stop arguing with the AI. Just edit it.**

When it won't cooperate, pull up that answer — and that whole thinking chain it fought over — and rewrite it. Save, and from then on this whole conversation only recognizes *your* version: the reply it writes out, and the path it reasons along, all bent to your intent, without a single "but I can't."

One line: **Keep the AI's cleverness, cut what you don't want, and make it fully listen to you.**

**English** · [中文](./README.md)

---

## What it does

- Every AI message gets a little **pencil** in its action strip;
- Open it and you can edit **both** the reply text and the **thinking chain**;
- Not just the one in front of you — it lists **every** reply in the session, including the mid-tool-call ones;
- Once saved, the AI only knows your version. Edit the same reply as many times as you like, no re-runs needed.

Small courtesies: images and tool calls are left alone; empty reply = blank it out; empty thinking = drop that block; editing is locked while the agent is running so you two don't wrestle over the same text.

## Install

You need DeepSeek Harness (`dsh`, `0.2.0-rc.2` or newer recommended).

```bash
# clone it and mount from a local path (recommended — tracks the source)
dsh plugin --profile web add /path/to/dsh-chat-thinking-editor
```

If it ever ships on npm, it's one line:

```bash
dsh plugin --profile web add dsh-chat-thinking-editor
```

Prefer to do it by hand? Merge the row from [cordis.patch.yml](./cordis.patch.yml) into your profile's `dsh.profile.bundles` and restart `dsh web`.

Refresh the DSH page after installing and you'll see the pencil.

## Usage

1. Run a conversation, find a reply you're not happy with;
2. Hover it, click the pencil;
3. In *Edit assistant messages*, expand that row;
4. Edit the reply and/or the thinking chain (leave blank = remove that part);
5. Save — it now continues from your version.

Note: to close the dialog you have to click the **top-left** close button. Backdrop clicks and Esc won't dismiss it — that's on purpose, so you don't accidentally close it while scrolling on your phone.

## A little bug I fixed along the way

While writing this I fixed an annoying one: previously, select-all (Ctrl/Cmd+A) → delete in one editor would also wipe the sibling editor. The text selection was leaking across the two adjacent boxes, so deleting grabbed both. Now select-all only touches the field you're actually editing.

## Compatibility

- Target: DeepSeek Harness `0.2.0-rc.2+`;
- Runtime: Node 22.19+ / 24+, pnpm 11;
- Built on the official **message projection** mechanism (a plugin-owned projection event, the supported DSH 0.2 way to change the content of an existing message) and the `conversation.chat.assistant-actions` slot — no private APIs.

> **Upgrading from 0.1.x:** as of DSH 0.2 an `assistant/message` event may no longer carry `sourceEventSeqs`, which means it **cannot replace itself through a surface replacement** any more — the core mechanism of plugin 0.1.x no longer exists on the new platform. 0.2.0 uses the projection contract DSH provides for plugins: the edit is recorded in a plugin-owned event, and a pure interpreter rewrites the target message during replay. The message identity, images, tool calls and every other non-text block are preserved verbatim.
>
> One caveat: the conversation transcript is rendered straight from the raw events and does **not** apply message projections, so the dialog overlays the committed edits itself. What the model sees is always your version.
>
> Another: this plugin's event type is not part of DSH's built-in event vocabulary, so on startup the plugin admits that type into the running process's vocabulary first; if admission fails it **disables editing outright** rather than ever writing an event that would leave a session unreadable. Conversely, **if you uninstall the plugin after editing, a session containing those edits may no longer be readable** — revert your edits before uninstalling.

> Heads-up: DSH itself is a **developer preview**, so its APIs will likely keep changing. If an upgrade breaks things, just open an issue.

## Layout

```text
.
├── src/           # TypeScript source (host + frontend logic)
├── lib/           # compiled output, the npm entry
├── cordis.patch.yml  # DSH mount declaration
├── package.json
└── README.md
```

## License

[MIT](./LICENSE)

To whoever's hanging around the `dsh-plugin` corner: stop going back and forth with a model that won't budge — bend it to your will instead. That's what this is for.