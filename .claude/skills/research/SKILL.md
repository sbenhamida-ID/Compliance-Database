---
name: research
description: Research cookies, scripts, iframes, or localStorage items discovered by Osano CMP. Interview-style intake, online research, then optionally add to the database. Automatically use when user requests to "research a cookie", "look up a script", "identify an Osano item", "classify a localStorage item", or "add item to database".
user_invocable: true
---

# Research Osano Items

Research and classify items discovered by Osano CMP, then optionally add them to the database.

## How to Use This Skill

**Input:** One or more item names and their type (cookie, script, iframe, or localStorage). If the type is not specified, ask before proceeding.
**Output:** Research findings with provider, category, description, and optional database entry.

## Core Principle: Zero Assumptions

Never assume when uncertain or when multiple valid options exist. Always ask the user. It's better to ask one extra question than to build on a wrong assumption.

## Workflow

### Step 1: Parse Input

Identify each item and its type from the user's message.

- **Single item**: Complete the full workflow (interview > research > present > ask to add).
- **Multiple items (list)**: Interview and research **all items first**, present findings for the entire list in one summary table, then ask once: **"Do you want me to add these to the database?"** The user can approve all, select specific ones, or decline.

### Step 2: Interview (One Question at a Time)

Ask these questions **one at a time**. Wait for the user's answer before asking the next.
Stop early if you already have enough context to research effectively.

1. "What page / URL was `{item}` discovered on?" -- **If the user provides a URL, use WebFetch to explore that page** and gather context (scripts loaded, cookies set, third-party resources) before continuing the interview.
2. "Are you using this `{item}` in your codebase? (y/n)" -- If yes, ask follow-ups about where it's used, its purpose, and any known provider details.
3. "Is `{item}` part of the page's own content? (y/n)"
4. "Do you recognize the provider or service behind `{item}`? (y/n)" -- If yes, ask for the provider name and any details they can share about its purpose or category.
5. "Does Osano CMP provide any additional context about `{item}` (e.g., category, provider, description)?"
6. Ask follow-up questions only if the answers so far are ambiguous or insufficient.

Keep it conversational. Do not dump all questions at once.

### Step 3: Research Online

Use WebSearch and WebFetch to find accurate details from **official sources**:

- Search: item name + type + provider (if known)
- Check cookiedatabase.org for known entries
- Check the provider's official documentation
- Cross-reference at least 2 sources before concluding

Gather: provider, purpose, category, expiry/persistence, regex pattern, source URL.

### Step 4: Present Findings

Share a concise summary with the user:

- **Item**: name
- **Type**: cookie / script / iframe / localStorage
- **Provider**: confirmed provider (or "Unknown" if unconfirmed)
- **Category**: recommended Osano category (Essential, Analytics, Marketing, Personalized, or Blocklisted) -- must be GDPR and UK ICO compliant
- **Description**: simple, short, factual -- this is what end users see
- **Expiry/Persistence**: if applicable
- **Regex**: suggested pattern
- **Source**: official documentation URL

If provider or purpose cannot be confirmed from official sources, recommend **Blocklisted** with description: `"Blocklisted until provider or purpose confirmed."`

Then ask: **"Before adding this to the database, do you have any privacy concerns you'd like to discuss first? (y/n)"**

- **If yes**: Act as an **e-Privacy officer**. Analyze the item and present the most relevant privacy concerns in a **numbered list** (e.g., cross-site tracking, data sharing with third parties, lack of consent mechanism, fingerprinting risks, GDPR/ePrivacy compliance issues). Continue the discussion with the user until they are satisfied and ask to proceed with adding the item.
- **If no**: Move to the next question below.

Then ask: **"Do you want me to add this to the database? (y/n)"**

- **If yes**: Proceed with Step 5 (Add to Database).
- **If no**: Ask the user why, so you can understand their reasoning. Then move to the next item (if any) or end.

### Step 5: Add to Database (if confirmed)

Target files:
- **Cookies** > `data/cookies-db.json`
- **Scripts** or **Iframes** > `data/scripts-db.json` (iframes use the script data model)
- **localStorage** > `data/localstorage-db.json`

Before writing:
1. Read the target JSON file.
2. Check if the item already exists (by name or regex). If it does, inform the user and ask whether to update.
3. Generate the next sequential `id` based on existing entries.
4. Set `addedBy: "seed"`.
5. Append the new entry and write the file.

Then move to the next item (if any) or end.

## Important Guidelines

**DO:**
- Ask one question at a time -- never batch multiple questions
- Keep descriptions simple and short -- end users read these
- Follow Description Writing Rules: no examples, no injection notes, no classification instructions
- Cross-reference at least 2 sources before concluding
- Apply GDPR and UK ICO compliant classifications (strictest reasonable interpretation)

**DON'T:**
- Assign a speculative category or provider when unconfirmed -- use Blocklisted
- Write long or jargon-heavy descriptions
- Dump all interview questions at once
- Skip the privacy concerns question before adding to database
- Treat iframes differently from scripts (same data model, same JSON file)
