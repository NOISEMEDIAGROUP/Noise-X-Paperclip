export const type = "picoclaw_remote";
export const label = "PicoClaw (remote)";

export const models: Array<{ id: string; label: string }> = [];

export const agentConfigurationDoc = `# picoclaw_remote agent configuration

Adapter: picoclaw_remote

Use when:
- You want Paperclip to invoke PicoClaw on another machine through the Paperclip PicoClaw Bridge
- You need one Paperclip deployment to target one or more remote PicoClaw hosts
- You want PicoClaw session continuity on the remote machine via --session

Don't use when:
- PicoClaw is installed on the same machine as Paperclip (use picoclaw_local)
- You only have an undocumented upstream PicoClaw gateway URL without a Paperclip bridge in front of it

Core fields:
- url (string, required): base URL of the Paperclip PicoClaw Bridge
- authToken (string, optional): shared bearer token used to authenticate bridge requests
- cwd (string, optional): remote working directory fallback
- instructionsFilePath (string, optional): absolute path to a markdown instructions file on the Paperclip host, inlined into the prompt before forwarding
- promptTemplate (string, optional): heartbeat prompt template rendered on the Paperclip server
- model (string, optional): PicoClaw model alias override passed to the bridge
- timeoutSec (number, optional): request timeout in seconds (default 120)

Notes:
- The bridge runs next to the remote PicoClaw CLI and shells out locally there.
- Session continuity is tied to a single bridge URL.
- The bridge should own any remote PicoClaw config such as ~/.picoclaw/config.json.
`;
