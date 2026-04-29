# Claude-Flow Cheatsheet — Conversio2.0

Quelle: `.claude/settings.json`, `.claude/agents/`, `.claude/commands/`, `.claude/skills/`
Swarm-Topologie: `hierarchical-mesh`, maxAgents: 15, CLI: `npx claude-flow@alpha`

---

## 1. Einzelnen Agenten starten

```bash
npx claude-flow@alpha agent spawn <type> --name "Beschreibung" --priority 8
npx claude-flow@alpha agent list          # laufende Agenten anzeigen
npx claude-flow@alpha agent terminate <id>
```

Verfuegbare Typen (aus `.claude/agents/`):

| Typ              | Kategorie    | Zweck                                      |
|------------------|--------------|--------------------------------------------|
| `coder`          | core         | Implementation, sauberer Code              |
| `planner`        | core         | Aufgaben planen, Tasks aufteilen           |
| `researcher`     | core         | Recherche, Kontext sammeln                 |
| `reviewer`       | core         | Code Review                                |
| `tester`         | core         | Tests schreiben und ausfuehren             |
| `analyst`        | analysis     | Code-Qualitaet, Security-Scan             |
| `backend-dev`    | development  | API-Design, REST-Endpunkte                 |
| `security-auditor` | v3         | Vulnerability-Detection, CVE-Scan          |
| `pr-manager`     | github       | PR-Workflow, Reviews, Merge                |

---

## 2. Skill nutzen

Ueber MCP (bevorzugt in Claude Code):
```javascript
mcp__claude-flow__sparc_mode { mode: "coder", task_description: "..." }
```

Ueber CLI:
```bash
npx claude-flow@alpha swarm "Aufgabe" --strategy hierarchical --max-agents 5
```

Wichtige Skills (`.claude/skills/`):

| Skill                    | Beschreibung (max. 3 Zeilen)                                  |
|--------------------------|---------------------------------------------------------------|
| `sparc-methodology`      | SPARC-Entwicklungsmethodik: 17 Modi (Spec, Code, Review, TDD, Debug, Arch ...) |
| `swarm-orchestration`    | Multi-Agent-Swarms mit paralleler Ausfuehrung und dynamischer Topologie |
| `github-code-review`     | GitHub Code-Review mit KI-gestuetzter Swarm-Koordination      |
| `github-workflow-automation` | CI/CD-Automatisierung via GitHub Actions + Swarm            |
| `hooks-automation`       | Automatische Koordination, Formatierung und Lernen ueber Claude-Code-Hooks |
| `pair-programming`       | KI-Pair-Programming: Driver/Navigator/Switch-Modi mit Echtzeit-Verifikation |
| `browser`                | Web-Browser-Automatisierung fuer claude-flow-Agenten          |
| `agentdb-vector-search`  | Semantische Vektor-Suche fuer intelligentes Dokument-Retrieval |

---

## 3. Slash-Commands

Aus `.claude/commands/` — Aufruf als `/command-name` in Claude Code:

| Command                  | Beschreibung                                             |
|--------------------------|----------------------------------------------------------|
| `/claude-flow-help`      | Alle Commands und Verwendung anzeigen                    |
| `/claude-flow-swarm`     | Multi-Agent-Swarm starten                                |
| `/claude-flow-memory`    | Memory-System: store/retrieve/search                     |
| `/sparc`                 | SPARC-Orchestrator fuer komplexe Workflows               |
| `/sparc-coder`           | Implementation (SPARC-Modus)                             |
| `/sparc-tdd`             | Test-Driven Development                                  |
| `/sparc-reviewer`        | Code-Review (SPARC-Modus)                                |
| `/sparc-debugger`        | Debugging                                                |
| `/github-code-review`    | Automatisches Code-Review                                |
| `/github-pr-manager`     | PR-Erstellung und -Verwaltung                            |
| `/auto-agent`            | Agenten automatisch nach Aufgabe spawnen                 |
| `/monitoring-status`     | Koordinations-Status pruefen                             |
| `/parallel-execute`      | Tasks parallel ausfuehren                                |
| `/hooks-overview`        | Hook-Konfiguration anzeigen                              |

---

## 4. Wann was nutzen

| Situation                         | Mittel                                      |
|-----------------------------------|---------------------------------------------|
| Einzelne Datei/Funktion aendern   | Direkt in Claude Code, kein Agent noetig    |
| Feature end-to-end implementieren | SPARC-Skill + `coder`-Agent                 |
| Parallele, unabhaengige Tasks     | Swarm (`--strategy parallel`)               |
| Strukturierter Feature-Build      | Swarm (`--strategy hierarchical`)           |
| Security-Audit                    | `security-auditor`-Agent                    |
| PR-Workflow automatisieren        | `pr-manager`-Agent + `github-workflow-automation`-Skill |
| Hooks debuggen                    | `/hooks-overview` + `hooks-automation`-Skill |

---

## 5. Die 5 nuetzlichsten Agent/Skill-Kombinationen fuer Web-Dev

| # | Agent             | Skill                     | Einsatz                                          |
|---|-------------------|---------------------------|--------------------------------------------------|
| 1 | `coder`           | `sparc-methodology`       | Feature von Spec bis Completion strukturiert bauen |
| 2 | `backend-dev`     | `agentdb-vector-search`   | API-Endpunkt + semantisches Retrieval            |
| 3 | `analyst`         | `github-code-review`      | Qualitaets-Gate vor jedem PR                     |
| 4 | `security-auditor`| `v3-security-overhaul`    | Security-Sprint: CVE-Scan + Fix                  |
| 5 | `pr-manager`      | `github-workflow-automation` | PR-Erstellung, Review-Zuweisung, Merge-Automatisierung |
